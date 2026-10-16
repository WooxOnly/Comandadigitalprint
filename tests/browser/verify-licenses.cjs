// Real owner portal forms and license gate, synthetic accounts and device APIs.
const assert = require('node:assert/strict');
const https = require('node:https'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { generateKeyPairSync } = require('node:crypto');
const { chromium } = require('playwright-core');
const { fixture } = require('../helpers/business-fixture.cjs');
const { buildTabletPreview } = require('./tablet-preview.cjs');
const { loadTs } = require('../helpers/load-ts.cjs');
const { translate } = loadTs('src/i18n/translations.ts');
const { decodeLicenseCode } = require('../../shared/license.mjs');
(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-license-browser-')), cleanup = [], errors = [];
  let cases = 0;
  await buildTabletPreview(directory);
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'key.pem'), '-out', path.join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
  const f = await fixture({ after: fn => cleanup.push(fn) });
  const worker = (await import('../../server/cloudflare/worker.mjs')).default;
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  f.env.LICENSE_SIGNING_PRIVATE_JWK = JSON.stringify(pair.privateKey.export({ format: 'jwk' }));
  const group = '11111111-1111-4111-8111-111111111111';
  f.db.prepare('INSERT INTO manager_clients(id,name,store_ids) VALUES(?,?,?)').run(group, 'Synthetic Customer', '["seabra-1","seabra-2"]');
  const server = https.createServer({ key: fs.readFileSync(path.join(directory, 'key.pem')), cert: fs.readFileSync(path.join(directory, 'cert.pem')) }, async (req, res) => {
    try {
      if (req.url.startsWith('/tablet-preview')) {
        const file = req.url.startsWith('/tablet-preview.js') ? 'tablet-preview.js' : 'tablet-preview.html';
        res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'application/javascript' : 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(directory, file))); return;
      }
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const response = await worker.fetch(new Request('https://' + req.headers.host + req.url, { method: req.method, headers: req.headers, ...(body.length ? { body } : {}) }), f.env);
      const headers = Object.fromEntries(response.headers);
      if (response.headers.has('Set-Cookie')) headers['set-cookie'] = response.headers.getSetCookie();
      res.writeHead(response.status, headers); res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { errors.push(error.message); res.writeHead(500); res.end('Fixture failed'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'https://localhost:' + server.address().port;
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/admin');
    await page.locator('[name=username]').fill('admin'); await page.locator('[name=password]').fill(f.env.ADMIN_VIEW_TOKEN);
    await Promise.all([page.waitForNavigation(), page.locator('button[type=submit]').click()]);
    for (const language of ['pt', 'en', 'es']) {
      await page.goto(base + '/admin?groupId=' + group + '#license');
      const languageButton = page.locator('[data-language=' + language + ']');
      if (await languageButton.getAttribute('aria-pressed') !== 'true') await Promise.all([page.waitForNavigation(), languageButton.click()]);
      await page.locator('#license-status').filter({ hasText: translate('Licença ativa', language) }).waitFor();
      for (const theme of ['light', 'dark']) {
        await page.locator('[data-theme-choice=' + theme + ']').click();
        for (const viewport of [{ width: 320, height: 568 }, { width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
          await page.setViewportSize(viewport);
          const summaries = page.locator('#client-license > details > summary');
          for (const summary of await summaries.all()) await summary.click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'License forms fit ' + language + ' ' + JSON.stringify(viewport));
          for (const summary of await summaries.all()) await summary.click();
          cases++;
        }
      }
      await page.locator('#client-license > details > summary').first().click();
      await page.locator('#license-auto').uncheck();
      await page.locator('#license-form button[type=submit]').click();
      await page.locator('#license-result').filter({ hasText: translate('Operação concluída.', language) }).waitFor();
      assert.equal(f.db.prepare('SELECT auto_renew FROM client_licenses WHERE client_id=?').get(group).auto_renew, 0);
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#license-block').click();
      await page.locator('#license-status').filter({ hasText: translate('Licença bloqueada', language) }).waitFor();
      assert.equal((await f.call('/changes', undefined, f.b.token)).status, 403, 'All customer stores share the block');
      await page.locator('#license-resume').click();
      await page.locator('#license-status').filter({ hasText: translate('Licença ativa', language) }).waitFor();
      await page.locator('#client-license > details > summary').nth(1).click();
      await page.locator('#license-device').fill('11111111-1111-4111-8111-111111111111');
      await page.locator('#license-offline-form button').click();
      await page.waitForFunction(() => document.querySelector('#license-code').value.startsWith('BH1.'));
      const value = decodeLicenseCode(await page.locator('#license-code').inputValue()).claim;
      assert.equal(value.kind, 'offline'); assert.equal(value.clientId, group); assert.equal(value.audience, base);
      await page.screenshot({ path: path.join(directory, 'portal-license-' + language + '.png'), fullPage: true });
      cases += 5;
    }
    for (const language of ['pt', 'en', 'es']) for (const theme of ['light', 'dark']) for (const viewport of [{ width: 320, height: 568 }, { width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
      await page.setViewportSize(viewport);
      await page.goto(base + '/tablet-preview.html?language=' + language + '#/license');
      await page.waitForFunction(() => !!window.qa);
      await page.evaluate(() => window.qa.setLicense({status:'unverified',expiresAt:null,error:false}));
      await page.getByTestId('theme-' + theme).click();
      assert.equal(await page.getByTestId('licensed-content').isVisible(), false);
      try { await page.getByText(translate('Este tablet ainda não verificou a licença.', language), { exact: true }).waitFor({timeout:3000}); } catch(error) { await page.screenshot({path:path.join(directory,'failed-gate.png')}); console.error(JSON.stringify({language,theme,viewport,body:await page.locator('body').innerText(),errors})); throw error; }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.getByLabel(translate('Código temporário', language), { exact: true }).fill('bad-code');
      await page.getByText(translate('Aplicar código temporário', language), { exact: true }).click();
      await page.getByText(translate('Código inválido, vencido ou destinado a outro tablet.', language), { exact: true }).waitFor();
      await page.getByLabel(translate('Código temporário', language), { exact: true }).fill('synthetic-code');
      await page.getByText(translate('Aplicar código temporário', language), { exact: true }).click();
      await page.getByTestId('licensed-content').waitFor();
      for (const status of ['expired', 'blocked']) {
        await page.evaluate(status => window.qa.setLicense({ status }), status);
        await page.getByTestId('license-surface').waitFor();
        assert.equal(await page.getByTestId('licensed-content').isVisible(), false);
        const text = status === 'expired' ? 'A licença deste cliente venceu.' : 'Licença bloqueada pelo administrador.';
        await page.getByText(translate(text, language), { exact: true }).waitFor();
      }
      if (viewport.width === 1280) await page.screenshot({ path: path.join(directory, 'tablet-license-' + language + '-' + theme + '.png') });
      cases += 6;
    }
    for (const language of ['pt', 'en', 'es']) {
      await page.goto(base + '/tablet-preview.html?language=' + language + '#/link');
      await page.getByLabel({pt:'Português',en:'English',es:'Español'}[language],{exact:true}).click();
      await page.getByText(translate('Liberação temporária offline', language), { exact: true }).click();
      await page.getByLabel(translate('Código temporário', language), { exact: true }).fill('synthetic-code');
      await page.getByText(translate('Aplicar código temporário', language), { exact: true }).click();
      await page.getByText('Linked fixture', { exact: true }).waitFor(); cases++;
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, cases, languages: ['pt', 'en', 'es'], screenshots: directory, evidence: 'Real license owner forms, signed issuance and server block; actual RN Web gate with synthetic device state. Native Android and SecureStore remain for device testing.' }));
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); for (const fn of cleanup.reverse()) fn(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
