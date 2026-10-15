// NODE_PATH=<temporary tooling>/node_modules node tests/browser/verify-admin-hierarchy.cjs
// Local HTTPS Worker + in-memory D1 only. No real accounts, stores or deployments.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright-core');
const https = require('node:https'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fixture } = require('../helpers/business-fixture.cjs');
const viewports = [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 600, height: 960 }, { width: 960, height: 600 }, { width: 800, height: 1280 }, { width: 1280, height: 800 }];
const languages = ['pt', 'en', 'es'];
const locales = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

async function fits(page, label) {
  const result = await page.evaluate(() => {
    const outside = [];
    for (const element of document.querySelectorAll('input,button,select,a.action-link,.nav a,.store-nav a,.scope-path a')) {
      const box = element.getBoundingClientRect(); if (!box.width || !box.height) continue;
      if (box.left >= -1 && box.right <= innerWidth + 1) continue;
      outside.push((element.textContent || element.getAttribute('aria-label') || element.tagName).slice(0, 80));
    }
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, outside };
  });
  if (result.overflow || result.outside.length) console.error(JSON.stringify({ label, overflowElements: await page.evaluate(() => [...document.querySelectorAll('body *')].map(element => { const box = element.getBoundingClientRect(); return { tag: element.tagName, id: element.id, class: element.className, left: box.left, right: box.right, text: (element.textContent || '').slice(0, 120) }; }).filter(element => element.right > innerWidth + 1 || element.left < -1).slice(0, 12)) }));
  if(result.overflow) console.log(JSON.stringify({label,elements:await page.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(el=>({tag:el.tagName,cls:el.className,id:el.id,right:el.getBoundingClientRect().right,text:el.textContent.slice(0,50)})).slice(0,10))}));
  assert.deepEqual(result, { overflow: false, outside: [] }, label);
}
async function visible(page, id) { await page.waitForFunction(id => document.getElementById(id) && !document.getElementById(id).hidden, id); }
async function choose(page, language) {
  const button = page.locator('#language [data-language=' + language + ']');
  if (await button.getAttribute('aria-pressed') !== 'true') await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), button.click()]);
  assert.equal(await page.locator('html').getAttribute('lang'), locales[language]);
}

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-admin-hierarchy-')), cleanup = [], errors = [], requests = [];
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'key.pem'), '-out', path.join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
  const f = await fixture({ after: fn => cleanup.push(fn) }), worker = (await import('../../server/cloudflare/worker.mjs')).default;
  const { translate } = await import('../../server/cloudflare/manager-i18n.mjs');
  const clients = [
    { id: randomUUID(), name: 'Cliente sintético A · São José · ' + 'Nome longo '.repeat(8), groupId: randomUUID(), groupName: 'Grupo A · Español · ' + 'Organização '.repeat(7), storeId: 'seabra-1' },
    { id: randomUUID(), name: 'Cliente sintético B <script>window.untrusted=1</script>', groupId: randomUUID(), groupName: 'Grupo B <img src=x onerror=window.untrusted=1>', storeId: 'seabra-2' },
  ];
  for (const client of clients) {
    client.id = client.groupId; client.groupName = client.name;
    f.db.prepare('INSERT INTO manager_clients(id,name,store_ids,active) VALUES(?,?,?,1)').run(client.groupId, client.groupName, JSON.stringify([client.storeId]));
    f.db.prepare('INSERT INTO manager_client_profiles(group_id,kind) VALUES(?,?)').run(client.groupId, client.storeId === 'seabra-1' ? 'group' : 'single');
    f.db.prepare('UPDATE stores SET name=? WHERE id=?').run('Loja ' + client.storeId + ' · ' + 'Descrição longa '.repeat(8), client.storeId);
    for (const [event, code] of [['sync.failed', 'SYNTHETIC_SYNC_' + client.storeId], ['print.failed', 'SYNTHETIC_PRINT_' + client.storeId]]) {
      f.db.prepare('INSERT INTO store_diagnostics(store_id,id,device_id,created_at,received_at,actor,event,code) VALUES(?,?,?,?,?,?,?,?)').run(client.storeId, randomUUID(), 'synthetic-tablet', '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z', 'synthetic-admin', event, code);
    }
    f.db.prepare('INSERT INTO store_admin_activity(store_id,created_at,actor,action) VALUES(?,?,?,?)').run(client.storeId, '2026-10-14T12:00:00Z', 'synthetic-admin', 'SYNTHETIC_ACTIVITY_' + client.storeId);
  }
  let base, cases = 0;
  const server = https.createServer({ key: fs.readFileSync(path.join(directory, 'key.pem')), cert: fs.readFileSync(path.join(directory, 'cert.pem')) }, async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk); const body = Buffer.concat(chunks), url = new URL(req.url, base);
      requests.push({ pathname: url.pathname, clientId: url.searchParams.get('clientId'), groupId: url.searchParams.get('groupId'), storeId: url.searchParams.get('storeId') });
      const response = await worker.fetch(new Request(base + req.url, { method: req.method, headers: req.headers, ...(body.length ? { body } : {}) }), f.env);
      const headers = Object.fromEntries(response.headers); if (response.headers.has('Set-Cookie')) headers['set-cookie'] = response.headers.getSetCookie();
      res.writeHead(response.status, headers); res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { errors.push(String(error.stack || error)); res.writeHead(500); res.end('Synthetic hierarchy fixture error'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'https://localhost:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const diagnostics = () => requests.filter(request => ['/admin/logs', '/admin/activity'].includes(request.pathname));
  try {
    for (const language of languages) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: locales[language] }), page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base + '/admin'); await choose(page, language);
        await page.locator('[name=username]').fill('admin'); await page.locator('[name=password]').fill(f.env.ADMIN_VIEW_TOKEN); await page.locator('button[type=submit]').click(); await visible(page, 'clients'); await choose(page, language);
        for (const viewport of viewports) {
          await page.setViewportSize(viewport); await page.goto(base + '/admin#errors'); await visible(page, 'clients');
          assert.equal(await page.locator('.store-nav').count(), 0); assert.equal(await page.locator('.nav a').count(), 2);
          assert.equal(await page.locator('.nav [data-view=account]').textContent(), translate(language, 'Minha conta'));
          await fits(page, 'clients ' + language + ' ' + viewport.width); cases++;
          await page.locator('.nav [data-view=account]').click(); await visible(page, 'account');
          assert.equal(await page.locator('#new-panel-password').getAttribute('minlength'), '8');
          assert.equal(await page.locator('.store-nav').count(), 0); await fits(page, 'account ' + language + ' ' + viewport.width); cases++;
          await page.locator('.nav a[href="/admin"]').click(); await visible(page, 'clients');
          for (const client of clients) {
            const beforeSelection = diagnostics().length;
            await page.locator('#clients a[href="/admin?groupId=' + client.groupId + '"]').click(); await visible(page, 'locations');
            await page.evaluate(() => { location.hash = 'activity'; }); await visible(page, 'locations');
            assert.equal(await page.locator('.store-nav').count(), 0); assert.equal(diagnostics().length, beforeSelection, 'No global diagnostics may be fetched before selecting a location');
            await fits(page, 'locations ' + language + ' ' + viewport.width); cases++;
            await page.locator('#locations a[href*="storeId=' + client.storeId + '"]').click(); await visible(page, 'stores');
            assert.equal(await page.locator('.edit-store').count(), 1); assert.equal(await page.locator('.edit-store').getAttribute('data-store-id'), client.storeId);
            assert.equal(await page.locator('.scope-path').getByText(client.name, { exact: true }).count(), 1);
            assert.equal(await page.locator('.scope-path').getByText(client.groupName, { exact: true }).count(), 1);
            assert.equal(await page.evaluate(() => window.untrusted), undefined, 'Administrative names are escaped');
            for (const [view, label] of [['errors', 'Logs do sistema'], ['printing', 'Logs de impressão'], ['activity', 'Histórico de alterações'], ['password', 'Gerenciar senha'], ['stores', 'Configurações da loja']]) {
              const link = page.locator('.store-nav [data-view=' + view + ']');
              assert.equal(await link.textContent(), translate(language, label)); await link.click(); await visible(page, view);
              if (['errors', 'printing', 'activity'].includes(view)) {
                const prefix = { errors: 'SYNTHETIC_SYNC_', printing: 'SYNTHETIC_PRINT_', activity: 'SYNTHETIC_ACTIVITY_' }[view];
                await page.locator('#' + view + '-result').getByText(new RegExp(prefix + client.storeId)).waitFor();
                assert.ok(!(await page.locator('#' + view + '-result').textContent()).includes(prefix + clients.find(other => other.id !== client.id).storeId));
              }
              await fits(page, 'store ' + language + ' ' + view + ' ' + viewport.width); cases++;
            }
            await page.screenshot({ path: path.join(directory, language + '-' + viewport.width + '-' + client.storeId + '.png') });
            const queries = diagnostics().slice(beforeSelection);
            for (const request of queries) {
              const owner = clients.find(item => item.storeId === request.storeId); assert.ok(owner, 'Every diagnostic request names a fixture location');
              assert.equal(request.clientId, null); assert.equal(request.groupId, owner.groupId);
            }
            await page.locator('.scope-path a[href="/admin?groupId=' + client.groupId + '"]').click(); await visible(page, 'locations');
            await page.locator('.scope-path a[href="/admin"]').click(); await visible(page, 'clients');
          }
        }
        // Preserve the weekly-password intent across explicit customer/store selection.
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(base + '/admin#password');
        assert.equal(await page.locator('#store-selection-notice').isVisible(), true);
        await page.locator('#clients a[href="/admin?groupId=' + clients[0].groupId + '"]').click(); await visible(page, 'locations');
        assert.equal(new URL(page.url()).hash, '#password');
        await page.locator('#locations a[href*="storeId=seabra-1"]').click(); await visible(page, 'password');
        await page.locator('#view').click(); await page.waitForFunction(() => document.querySelector('#password-result').textContent.includes('admin'));
        await page.locator('#view-settings-password').click();
        const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight, weekly: document.querySelector('#password-result').getBoundingClientRect().bottom, settings: document.querySelector('#settings-password-result').getBoundingClientRect().bottom }));
        assert.ok(dimensions.scrollHeight <= dimensions.height + 1, 'Both password cards and results fit a 1280×720 desktop: ' + JSON.stringify(dimensions));
        await page.screenshot({ path: path.join(directory, language + '-compact-password-1280x720.png') }); cases++;
        // Exercise the actual new-customer and store forms, not just REST fixtures.
        await page.goto(base + '/admin');
        await page.locator('#client-name').fill('QA individual ' + language); await page.locator('#client-kind').selectOption('single');
        await page.locator('#client-create button[type=submit]').click(); await visible(page, 'locations');
        const individualId = new URL(page.url()).searchParams.get('groupId'); assert.ok(individualId);
        await page.locator('#locations a[href="#new-store"]').click(); await visible(page, 'new-store');
        await page.locator('#new-store-name').fill('QA location ' + language); await page.locator('#create-store button[type=submit]').click(); await visible(page, 'stores');
        assert.equal(await page.locator('.edit-store').count(), 1);
        await page.locator('.store-nav a').first().click(); await visible(page, 'locations');
        assert.equal(await page.locator('#locations a[href="#new-store"]').count(), 0, 'Single customers cannot add a second location');
        await page.locator('#locations a[href*="/admin/gestores"]').click();
        await page.waitForFunction(id => document.querySelector('#client-picker')?.value === id, individualId);
        assert.equal(await page.locator('#client-kind').inputValue(), 'single');
        await page.locator('#client-kind').selectOption('group'); await page.locator('#client-form button').click();
        await page.waitForFunction(text => document.querySelector('#message').textContent === text, translate(language, 'Cliente salvo.'));
        await page.locator('.manager-actions a').first().click(); await visible(page, 'locations');
        assert.equal(await page.locator('#locations a[href="#new-store"]').count(), 1, 'An explicitly upgraded group can add locations'); cases++;
      } finally { await context.close(); }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, cases, languages, viewports, screenshots: directory, evidence: 'Individual/group customer → location clicks, scoped logs/activity, breadcrumb navigation, unknown hashes and escaped names in local Chromium; no Android hardware claims.' }));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); cleanup.reverse().forEach(fn => fn()); }
})().catch(error => { console.error(error); process.exitCode = 1; });
