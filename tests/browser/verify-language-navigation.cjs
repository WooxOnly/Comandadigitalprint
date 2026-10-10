// NODE_PATH=<temporary tooling>/node_modules node tests/browser/verify-language-navigation.cjs
// Real native form submissions, HTTPS Worker and D1 fixture; only email delivery is mocked.
const assert = require('node:assert/strict');
const { chromium, firefox } = require('playwright-core');
const https = require('node:https'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fixture } = require('../helpers/business-fixture.cjs');

const languages = ['pt', 'en', 'es'];
const viewports = [{ width: 600, height: 960 }, { width: 960, height: 600 }];
const locale = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
const password = 'Synthetic-manager-password';
const redact = value => String(value).replace(/(token=)[^&\s"']+/g, '$1[redacted]').replace(/\b[a-f0-9]{64}\b/g, '[redacted]');
const plain = value => JSON.parse(JSON.stringify(value));

async function submit(page) {
  const [response] = await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.locator('form button').first().click(),
  ]);
  return response;
}

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-language-navigation-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'key.pem'), '-out', path.join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
  const worker = (await import('../../server/cloudflare/worker.mjs')).default;
  const { digest } = await import('../../server/cloudflare/manager-auth.mjs');
  const { translate } = await import('../../server/cloudflare/manager-i18n.mjs');
  const originalFetch = global.fetch, emails = [], requests = [], errors = [], dialogs = [];
  let current, base, cases = 0, switches = 0;
  global.fetch = async (url, options) => {
    if (String(url) !== 'https://api.resend.com/emails') return originalFetch(url, options);
    emails.push(JSON.parse(options.body));
    return new Response('{"id":"synthetic-delivery"}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const server = https.createServer({ key: fs.readFileSync(path.join(directory, 'key.pem')), cert: fs.readFileSync(path.join(directory, 'cert.pem')) }, async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks), jobs = [], pathname = new URL(request.url, base).pathname;
      // Keep method/path evidence, never submitted credentials or reset-token URLs.
      requests.push({ method: request.method, pathname });
      const result = await worker.fetch(new Request(base + request.url, { method: request.method, headers: request.headers, ...(body.length ? { body } : {}) }), current.env, { waitUntil: job => jobs.push(job) });
      await Promise.all(jobs);
      const headers = Object.fromEntries(result.headers);
      if (result.headers.has('Set-Cookie')) headers['set-cookie'] = result.headers.getSetCookie();
      response.writeHead(result.status, headers);
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      errors.push(redact(error.stack || error));
      response.writeHead(500); response.end('Synthetic language-navigation test error');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'https://localhost:' + server.address().port;
  const browserSelection = process.env.BISTRO_BROWSER || 'all';
  assert.ok(['all', 'chromium', 'firefox'].includes(browserSelection), 'BISTRO_BROWSER must be all, chromium or firefox');
  const browsers = browserSelection === 'firefox' ? [] : [{ name: 'Chromium', type: chromium, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] }];
  const firefoxPath = process.env.FIREFOX_PATH || firefox.executablePath();
  if (browserSelection !== 'chromium' && fs.existsSync(firefoxPath)) browsers.push({ name: 'Firefox', type: firefox, executablePath: firefoxPath });
  assert.ok(browsers.length, 'The requested browser executable is unavailable');
  const executed = [], skipped = browserSelection === 'chromium' || fs.existsSync(firefoxPath) ? [] : ['Firefox: no compatible installed executable'];
  const posts = pathname => requests.filter(request => request.method === 'POST' && request.pathname === pathname).length;
  const limits = () => ({ panel: plain(current.db.prepare('SELECT attempts, blocked_until FROM panel_login WHERE id=1').get() || null), manager: plain(current.db.prepare('SELECT key, attempts, reset_at FROM manager_login_limits ORDER BY key').all()) });

  async function choose(page, language, expectedPath) {
    const before = requests.length, state = limits();
    const button = page.locator(`[data-language=${language}]`);
    if (await button.getAttribute('aria-pressed') === 'true') return;
    const csrf = await page.locator('[name=csrf]').count() ? await page.locator('[name=csrf]').inputValue() : null;
    const [response] = await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), button.click()]);
    assert.equal(response.request().method(), 'GET', 'A language switch navigates with GET, never repeats the native POST');
    assert.equal(response.status(), 200);
    const url = new URL(page.url());
    assert.equal(url.pathname, expectedPath);
    assert.ok(new RegExp('^' + language + '(?:-[a-f0-9-]{36})?$').test(url.searchParams.get('_language')), 'A unique language URL avoids reusing the POST document');
    assert.equal(await page.locator('html').getAttribute('lang'), locale[language]);
    assert.equal(await page.locator(`[data-language=${language}]`).getAttribute('aria-pressed'), 'true');
    const cookie = (await page.context().cookies()).find(item => item.name === (expectedPath.startsWith('/admin') ? '__Host-bistro_admin_language' : '__Host-bistro_manager_language'));
    assert.equal(cookie?.value, language, 'The chosen language is remembered by the browser');
    assert.deepEqual(limits(), state, 'Changing language does not consume attempts or extend a cooldown');
    assert.deepEqual(requests.slice(before).filter(request => request.method === 'POST').map(request => request.pathname), [expectedPath.startsWith('/admin') ? '/admin/language' : '/gestor/language'], 'Only the language-preference POST is sent');
    if (csrf) {
      assert.notEqual(await page.locator('[name=csrf]').inputValue(), csrf, 'The GET issues a fresh CSRF form');
      for (const field of await page.locator('input[type=password]').all()) assert.equal(await field.inputValue(), '', 'Passwords are never carried across language navigation');
    }
    const storage = await page.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
    assert.ok(![password, current.env.ADMIN_VIEW_TOKEN, 'synthetic-wrong-password', 'Synthetic-reset-pass'].some(value => storage.includes(value)), 'Passwords are not persisted to web storage');
    const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, sizes: [...document.querySelectorAll('#language button')].map(element => { const box = element.getBoundingClientRect(), flag = element.querySelector('svg').getBoundingClientRect(); return [box.width, box.height, flag.width, flag.height]; }) }));
    assert.equal(geometry.overflow, false);
    assert.deepEqual(geometry.sizes, Array(3).fill([44, 44, 20, 15]));
    switches++;
  }

  async function cycle(page, start, expectedPath, verify = async () => {}) {
    for (const language of [languages[(languages.indexOf(start) + 1) % 3], languages[(languages.indexOf(start) + 2) % 3], start]) {
      await choose(page, language, expectedPath);
      await verify(language);
    }
  }

  async function runCase(browser, language, viewport, scenario) {
    const cleanup = [], context = await browser.newContext({ ignoreHTTPSErrors: true, viewport, locale: locale[language] });
    current = await fixture({ after: fn => cleanup.push(fn) });
    Object.assign(current.env, { RESEND_API_KEY: 'synthetic-resend-key', ADMIN_RECOVERY_EMAIL: 'owner@example.com', PASSWORD_RESET_FROM: 'recovery@example.com', PASSWORD_RESET_ORIGIN: base });
    const salt = '0123456789abcdef0123456789abcdef';
    current.db.prepare('INSERT INTO manager_clients(id,name,store_ids,active,revision) VALUES(?,?,?,?,1)').run('group', 'Fixture Group', '["seabra-1","seabra-2"]', 1);
    current.db.prepare('INSERT INTO manager_users(id,client_id,name,username,salt,hash,active,revision) VALUES(?,?,?,?,?,?,1,1)').run('alice', 'group', 'Fixture Manager', 'alice', salt, await digest(password, salt));
    for (const storeId of ['seabra-1', 'seabra-2']) current.modules(storeId, true, true, true, true);
    emails.length = 0; requests.length = 0;
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(redact(error.stack || error)));
    page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
    try { await scenario(page); cases++; }
    finally { await context.close(); cleanup.reverse().forEach(fn => fn()); }
  }

  try {
    for (const descriptor of browsers) {
      const browser = await descriptor.type.launch({ executablePath: descriptor.executablePath, headless: true, ...(descriptor.args ? { args: descriptor.args } : {}) });
      executed.push(descriptor.name);
      try {
        for (const language of languages) for (const viewport of viewports) {
          for (const scope of ['admin', 'gestor']) for (const expired of [false, true]) {
            await runCase(browser, language, viewport, async page => {
              await page.goto(base + '/' + scope);
              await choose(page, language, '/' + scope);
              await page.locator('[name=username]').fill(scope === 'admin' ? 'admin' : 'alice');
              await page.locator('[name=password]').fill('synthetic-wrong-password');
              await page.locator('form').evaluate((form, fragment) => { form.action += '?keep=unchanged#' + fragment; }, scope === 'admin' ? 'password' : 'filters');
              if (expired) await page.locator('[name=csrf]').evaluate(element => { element.value = 'invalid-expired-csrf'; });
              const response = await submit(page);
              assert.equal(response.request().method(), 'POST');
              assert.equal(response.status(), expired ? 403 : 401);
              assert.equal(new URL(page.url()).pathname, '/' + scope + '/login');
              const count = posts('/' + scope + '/login');
              const state = limits();
              if (scope === 'admin') assert.equal(state.panel?.attempts || 0, expired ? 0 : 1);
              else assert.equal(state.manager[0]?.attempts || 0, expired ? 0 : 1);
              await cycle(page, language, '/' + scope, async () => {
                assert.equal(new URL(page.url()).searchParams.get('keep'), 'unchanged');
                assert.equal(new URL(page.url()).hash, scope === 'admin' ? '#password' : '#filters');
                assert.equal(posts('/' + scope + '/login'), count);
                assert.equal(await page.locator('form button').isEnabled(), true);
              });
              const reloaded = await page.reload({ waitUntil: 'domcontentloaded' });
              assert.equal(reloaded.request().method(), 'GET', 'Reload after a language switch also remains a safe GET');
              assert.deepEqual(limits(), state);
            });
          }

          await runCase(browser, language, viewport, async page => {
            await page.goto(base + '/admin');
            await choose(page, language, '/admin');
            current.db.prepare('INSERT INTO panel_login(id, attempts, blocked_until) VALUES(1,5,0) ON CONFLICT(id) DO UPDATE SET attempts=5, blocked_until=0').run();
            await page.locator('[name=username]').fill('admin');
            await page.locator('[name=password]').fill('synthetic-wrong-password');
            assert.equal((await submit(page)).status(), 429);
            const state = limits(), count = posts('/admin/login');
            assert.equal(state.panel.attempts, 6);
            await cycle(page, language, '/admin', async () => {
              assert.equal(await page.locator('form button').isDisabled(), true, 'Changing language cannot release an active lockout');
              assert.deepEqual(limits(), state);
              assert.equal(posts('/admin/login'), count);
              await page.locator('[name=username]').fill('admin');
              await page.locator('[name=password]').fill('synthetic-wrong-password');
              await page.locator('form').evaluate(form => form.requestSubmit());
              assert.equal(posts('/admin/login'), count, 'The active form countdown blocks keyboard/script requestSubmit too');
            });
          });

          await runCase(browser, language, viewport, async page => {
            await page.goto(base + '/admin/recover');
            await choose(page, language, '/admin/recover');
            await page.locator('[name=username]').fill('owner@example.com');
            assert.equal((await submit(page)).status(), 200);
            assert.equal(await page.locator('.success').textContent(), translate(language, 'Se os dados corresponderem ao cadastro, enviaremos um link de recuperação para o e-mail cadastrado.'));
            assert.equal(emails.length, 1);
            await cycle(page, language, '/admin/recover', async () => {
              assert.equal(posts('/admin/recover'), 1, 'Language changes do not request another recovery email');
              assert.equal(emails.length, 1);
            });
            const resetLink = emails[0].text.split('\n').find(line => line.startsWith(base + '/admin/reset-password?'));
            assert.ok(resetLink, 'Recovery email supplies the reset fixture');
            const token = new URL(resetLink).searchParams.get('token');
            await page.goto(resetLink);
            await page.locator('[name=newPassword]').fill('Synthetic-reset-pass');
            await page.locator('[name=confirmPassword]').fill('Synthetic-other-pass');
            assert.equal((await submit(page)).status(), 400);
            assert.equal(new URL(page.url()).searchParams.has('token'), false, 'Native POST validation document has no reset token in its URL');
            assert.equal(await page.locator('[name=token]').inputValue() === token, true);
            await cycle(page, language, '/admin/reset-password', async () => {
              assert.equal(new URL(page.url()).searchParams.get('token') === token, true, 'The canonical GET retains the hidden reset token');
              assert.equal(await page.locator('[name=token]').inputValue() === token, true);
              assert.equal(posts('/admin/reset-password'), 1);
              assert.equal(current.db.prepare('SELECT COUNT(*) AS count FROM panel_password_recovery WHERE used_at IS NOT NULL').get().count, 0, 'Language switches never consume a reset link or change the password');
            });
          });

          await runCase(browser, language, viewport, async page => {
            await page.goto(base + '/admin');
            await choose(page, language, '/admin');
            await page.locator('[name=username]').fill('admin');
            await page.locator('[name=password]').fill(current.env.ADMIN_VIEW_TOKEN);
            assert.equal((await submit(page)).status(), 200);
            await page.goto(base + '/admin?groupId=group&storeId=seabra-2&keep=unchanged#password');
            await cycle(page, language, '/admin', async chosen => {
              const url = new URL(page.url());
              assert.equal(url.searchParams.get('groupId'), 'group');
              assert.equal(url.searchParams.get('storeId'), 'seabra-2');
              assert.equal(url.searchParams.get('keep'), 'unchanged');
              assert.equal(url.hash, '#password');
              assert.equal(await page.locator('#password').isVisible(), true);
              assert.equal(await page.locator('.scope-path strong').textContent(), 'Seabra 2');
              assert.equal(current.db.prepare('SELECT language FROM panel_preferences WHERE id=1').get().language, chosen);
              assert.equal(posts('/admin/login'), 1, 'Owner session remains authenticated without logging in again');
            });
            // Another tab/account preference can leave the rendered language different
            // from an existing _language marker. Navigation must still issue a full GET.
            await choose(page, 'pt', '/admin');
            await page.goto(base + '/admin?groupId=group&storeId=seabra-2&keep=unchanged&_language=en#password');
            assert.equal(await page.locator('[data-language=pt]').getAttribute('aria-pressed'), 'true');
            await choose(page, 'en', '/admin');
            assert.match(new URL(page.url()).searchParams.get('_language'), /^en-[a-f0-9-]{36}$/);
            assert.equal(new URL(page.url()).hash, '#password');
            assert.equal(await page.locator('#password').isVisible(), true);
            assert.equal(current.db.prepare('SELECT language FROM panel_preferences WHERE id=1').get().language, 'en');
            assert.equal(posts('/admin/login'), 1);
            await page.goto(base + '/admin/gestores?groupId=group#client-form');
            await cycle(page, 'en', '/admin/gestores', async () => {
              assert.equal(new URL(page.url()).searchParams.get('groupId'), 'group');
              assert.equal(new URL(page.url()).hash, '#client-form');
              await page.waitForFunction(() => [...document.querySelector('#client-picker').options].some(option => option.value === 'group'));
              assert.equal(await page.locator('#client-picker').inputValue(), 'group');
              assert.equal(posts('/admin/login'), 1);
            });
          });

          await runCase(browser, language, viewport, async page => {
            await page.goto(base + '/gestor');
            await choose(page, language, '/gestor');
            await page.locator('[name=username]').fill('alice');
            await page.locator('[name=password]').fill(password);
            assert.equal((await submit(page)).status(), 200);
            await page.waitForFunction(() => !document.querySelector('#consult').disabled && document.querySelector('#store').options.length === 3);
            await page.evaluate(() => {
              history.replaceState(null, '', '/gestor?keep=unchanged#sales-view');
              for (const [id, value] of Object.entries({ store: 'seabra-2', from: '2026-10-01', to: '2026-10-03', zone: 'Europe/Madrid', 'tma-basis': 'ready', month: '2026-10', breakdown: 'weekdays', 'chart-metric': 'average', 'sales-breakdown': 'days', 'sales-chart-metric': 'netReceiptsCents' })) document.querySelector('#' + id).value = value;
            });
            await page.locator('#area-sales').click();
            await page.waitForFunction(() => !document.querySelector('#consult').disabled);
            const before = await page.evaluate(() => Object.fromEntries(['store', 'from', 'to', 'zone', 'tma-basis', 'month', 'breakdown', 'chart-metric', 'sales-breakdown', 'sales-chart-metric'].map(id => [id, document.querySelector('#' + id).value])));
            await cycle(page, language, '/gestor', async chosen => {
              await page.waitForFunction(() => !document.querySelector('#consult').disabled && document.querySelector('#store').options.length === 3);
              const after = await page.evaluate(() => Object.fromEntries(['store', 'from', 'to', 'zone', 'tma-basis', 'month', 'breakdown', 'chart-metric', 'sales-breakdown', 'sales-chart-metric'].map(id => [id, document.querySelector('#' + id).value])));
              assert.deepEqual(after, before, 'All Manager Dashboard filters survive the GET navigation');
              assert.equal(await page.locator('#area-sales').getAttribute('aria-pressed'), 'true');
              assert.equal(new URL(page.url()).searchParams.get('keep'), 'unchanged');
              assert.equal(new URL(page.url()).hash, '#sales-view');
              assert.equal(current.db.prepare('SELECT language FROM manager_user_preferences WHERE user_id=?').get('alice').language, chosen);
              assert.equal(posts('/gestor/login'), 1);
              assert.equal(await page.evaluate(() => sessionStorage.getItem('bistro-manager-view:alice')), null, 'The saved view is consumed after restoration');
            });
          });
        }
      } finally { await browser.close(); }
    }
    assert.deepEqual(dialogs, [], 'Language switches never show a browser JavaScript dialog');
    assert.deepEqual(errors, [], 'Browser/server runtime errors');
    console.log(JSON.stringify({ ok: true, cases, switches, browsers: executed, skipped, languages, viewports, evidence: 'HTTPS + real Worker/D1 + native POST errors, safe GET language navigation, unchanged attempt counters/cooldowns, recovery email idempotence, reset token preservation, authenticated scopes and dashboard filters.' }));
  } finally {
    global.fetch = originalFetch;
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(redact(error.stack || error)); process.exitCode = 1; });
