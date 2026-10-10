// NODE_PATH=<temporary tooling>/node_modules node tests/browser/verify-password-recovery.cjs
// Uses the real Worker and an in-memory D1 fixture; only email delivery is mocked.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const https = require('node:https'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { fixture } = require('../helpers/business-fixture.cjs');

const viewports = [{ width: 600, height: 960 }, { width: 960, height: 600 }, { width: 800, height: 1280 }, { width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
const languages = ['pt', 'en', 'es'];
const redact = value => String(value).replace(/(token=)[^&\s"']+/g, '$1[redacted]').replace(/\b[a-f0-9]{64}\b/g, '[redacted]');

async function languageChoice(page, language) {
  const button = page.locator(`[data-language=${language}]`);
  if (await button.getAttribute('aria-pressed') !== 'true') {
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), button.click()]);
  }
  assert.equal(await button.getAttribute('aria-pressed'), 'true');
}

async function fits(page, label) {
  const result = await page.evaluate(() => {
    const outside = [];
    for (const element of document.querySelectorAll('input:not([type=hidden]),button,a.recovery-link')) {
      const box = element.getBoundingClientRect();
      if (box.width && (box.left < -1 || box.right > innerWidth + 1)) outside.push(element.tagName);
    }
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, outside };
  });
  assert.deepEqual(result, { overflow: false, outside: [] }, label);
  assert.deepEqual(await page.locator('#language button').allTextContents(), ['', '', '']);
  assert.equal(await page.locator('#language svg[aria-hidden=true]').count(), 3);
  const sizes = await page.locator('#language button').evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect(), flag = button.querySelector('svg').getBoundingClientRect();
    return [box.width, box.height, flag.width, flag.height, !!button.getAttribute('aria-label')];
  }));
  assert.ok(sizes.every(([width, height, flagWidth, flagHeight, named]) => width === 44 && height === 44 && flagWidth === 20 && flagHeight === 15 && named), 'Discreet flags retain named 44px touch targets');
  const link = page.locator('.recovery-link');
  assert.ok((await link.boundingBox()).height >= 44, 'Recovery links have accessible touch targets');
  await link.focus();
  assert.equal(await link.evaluate(element => getComputedStyle(element).outlineStyle), 'solid', 'Keyboard focus remains visible');
}

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bistro-password-recovery-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'key.pem'), '-out', path.join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost'], { stdio: 'ignore' });
  const worker = (await import('../../server/cloudflare/worker.mjs')).default;
  const { translate } = await import('../../server/cloudflare/manager-i18n.mjs');
  const originalFetch = global.fetch, emails = [], requests = [], errors = [];
  let current, base, cases = 0, flows = 0, browser;
  global.fetch = async (url, options) => {
    if (String(url) !== 'https://api.resend.com/emails') return originalFetch(url, options);
    assert.equal(options.method, 'POST');
    emails.push(JSON.parse(options.body));
    return new Response('{"id":"synthetic-delivery"}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const server = https.createServer({ key: fs.readFileSync(path.join(directory, 'key.pem')), cert: fs.readFileSync(path.join(directory, 'cert.pem')) }, async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = Buffer.concat(chunks), jobs = [];
      const pathname = new URL(request.url, base).pathname;
      if (request.method === 'POST' && ['/admin/recover', '/admin/reset-password'].includes(pathname)) {
        const form = new URLSearchParams(body.toString());
        requests.push({ pathname, origin: request.headers.origin, contentType: request.headers['content-type'], csrfPresent: /^[a-f0-9-]{36}$/.test(form.get('csrf') || '') });
      }
      const result = await worker.fetch(new Request(base + request.url, { method: request.method, headers: request.headers, ...(body.length ? { body } : {}) }), current.env, { waitUntil: job => jobs.push(job) });
      await Promise.all(jobs);
      const headers = Object.fromEntries(result.headers);
      if (result.headers.has('Set-Cookie')) headers['set-cookie'] = result.headers.getSetCookie();
      response.writeHead(result.status, headers);
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      errors.push(redact(error.stack || error));
      response.writeHead(500); response.end('Synthetic recovery test error');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'https://localhost:' + server.address().port;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const language of languages) for (const viewport of viewports) {
      const cleanup = [], context = await browser.newContext({ ignoreHTTPSErrors: true, viewport, locale: { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[language] });
      current = await fixture({ after: fn => cleanup.push(fn) });
      Object.assign(current.env, { RESEND_API_KEY: 'synthetic-resend-key', ADMIN_RECOVERY_EMAIL: 'owner@example.com', PASSWORD_RESET_FROM: 'recovery@example.com', PASSWORD_RESET_ORIGIN: base });
      emails.length = 0; requests.length = 0;
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(redact(error.stack || error)));
      const snapshot = async stage => {
        if ((language === 'pt' && viewport.width === 600) || (language === 'en' && viewport.width === 960)) await page.screenshot({ path: path.join(directory, `${stage}-${language}-${viewport.width}x${viewport.height}.png`), fullPage: true });
      };
      try {
        await page.goto(base + '/admin');
        await languageChoice(page, language);
        assert.equal(await page.locator('.recovery-link').textContent(), translate(language, 'Esqueceu a senha?'));
        await fits(page, `login ${language} ${viewport.width}x${viewport.height}`); cases++;
        await snapshot('login');
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('.recovery-link').click()]);
        assert.equal(new URL(page.url()).pathname, '/admin/recover');
        assert.equal(await page.locator('h1').textContent(), translate(language, 'Recuperar senha'));
        await fits(page, `recover ${language} ${viewport.width}x${viewport.height}`); cases++;
        await snapshot('recover');
        await page.locator('[name=username]').fill(viewport.width < viewport.height ? 'admin' : 'owner@example.com');
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('form button[type=submit]').click()]);
        assert.equal(await page.locator('.success').textContent(), translate(language, 'Se os dados corresponderem ao cadastro, enviaremos um link de recuperação para o e-mail cadastrado.'));
        assert.equal(await page.locator('.success').getAttribute('role'), 'status');
        assert.equal(emails.length, 1, 'Recovery delivers one message to the configured owner');
        assert.deepEqual(emails[0].to, ['owner@example.com']);
        assert.equal(emails[0].subject, translate(language, 'Redefinição de senha · BistroHub'));
        assert.ok(emails[0].text.includes(translate(language, 'O link expira em 15 minutos e pode ser usado uma única vez.')));
        const link = emails[0].text.split('\n').find(line => line.startsWith(base + '/admin/reset-password?'));
        assert.ok(link, 'Email contains the canonical reset destination');
        const token = new URL(link).searchParams.get('token');
        assert.ok(/^[a-f0-9]{64}$/.test(token), 'Reset token has expected random format');
        const response = await page.goto(link);
        assert.equal(response.status(), 200);
        assert.equal(response.headers()['referrer-policy'], 'same-origin');
        assert.equal(await page.locator('[name=token]').inputValue() === token, true, 'Token passes only into the reset form');
        const otherLanguage = { pt: 'en', en: 'es', es: 'pt' }[language];
        await languageChoice(page, otherLanguage);
        assert.equal(new URL(page.url()).searchParams.get('token') === token, true, 'Changing language preserves the reset URL');
        assert.equal(await page.locator('[name=token]').inputValue() === token, true, 'Changing language preserves the reset form token');
        await languageChoice(page, language);
        await fits(page, `reset ${language} ${viewport.width}x${viewport.height}`); cases++;
        await snapshot('reset');
        for (const field of ['newPassword', 'confirmPassword']) assert.equal(await page.locator(`[name=${field}]`).getAttribute('minlength'), '8');
        const newPassword = 'NewPass8';
        await page.locator('[name=newPassword]').fill(newPassword);
        await page.locator('[name=confirmPassword]').fill(newPassword);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('form button[type=submit]').click()]);
        const changedUrl = new URL(page.url());
        assert.ok(changedUrl.pathname === '/admin' && changedUrl.searchParams.has('changed'), 'Successful reset returns to sign-in without the token');
        assert.equal(await page.locator('#login-message').textContent(), translate(language, 'Senha do painel alterada. Entre novamente.'));
        assert.equal(current.db.prepare('SELECT COUNT(*) AS count FROM panel_password_recovery WHERE used_at IS NOT NULL').get().count, 1, 'Reset consumes its link');
        assert.deepEqual(requests.map(({ pathname, origin, contentType, csrfPresent }) => ({ pathname, sameOrigin: origin === base, urlEncoded: contentType === 'application/x-www-form-urlencoded', csrfPresent })), [
          { pathname: '/admin/recover', sameOrigin: true, urlEncoded: true, csrfPresent: true },
          { pathname: '/admin/reset-password', sameOrigin: true, urlEncoded: true, csrfPresent: true },
        ], 'Native browser forms submit same-origin with fresh CSRF');
        await page.locator('[name=username]').fill('admin');
        await page.locator('[name=password]').fill(newPassword);
        await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.locator('form button[type=submit]').click()]);
        await page.locator('#groups').waitFor();
        assert.equal(await page.locator('[name=password]').count(), 0, 'The recovered password authenticates successfully');
        flows++;
      } finally { await context.close(); cleanup.reverse().forEach(fn => fn()); }
    }
    for (const language of languages) {
      const cleanup = [], context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: viewports[0], locale: { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[language] });
      current = await fixture({ after: fn => cleanup.push(fn) });
      emails.length = 0;
      try {
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(redact(error.stack || error)));
        const response = await page.goto(base + '/admin/recover');
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('form button[type=submit]').isDisabled(), true);
        assert.equal(await page.locator('.error').textContent(), translate(language, 'A recuperação por e-mail ainda não está disponível. Tente novamente mais tarde.'));
        assert.equal(await page.locator('.success').count(), 0, 'Unavailable recovery never claims delivery');
        assert.equal(emails.length, 0);
        await fits(page, `unavailable ${language}`); cases++;
      } finally { await context.close(); cleanup.reverse().forEach(fn => fn()); }
    }
    assert.deepEqual(errors, [], 'Browser/server runtime errors');
    console.log(JSON.stringify({ ok: true, flows, layoutCases: cases, languages, viewports, screenshots: directory, evidence: 'Chromium + HTTPS + real Worker/DB; mocked email delivery only. Native CSRF/Origin, 8-character reset, language reload, consumed links and recovered login verified.' }));
  } finally {
    global.fetch = originalFetch;
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(redact(error.stack || error)); process.exitCode = 1; });
