const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Script } = require('node:vm');
const { fixture } = require('./helpers/business-fixture.cjs');
const origin = 'https://example.com';
function remember(jar, response) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], index = pair.indexOf('=');
    if (/Max-Age=0(?:;|$)/.test(cookie)) jar.delete(pair.slice(0, index));
    else jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}
async function setup(t) {
  const f = await fixture(t), jar = new Map();
  const request = async (path, options = {}, cookies = jar, now) => {
    const response = await f.adminResponse(new Request(origin + path, { ...options, headers: { Cookie: [...cookies].map(([key, value]) => key + '=' + value).join('; '), ...options.headers } }), f.env, now);
    remember(cookies, response); return response;
  };
  const login = async (cookies = jar, headers = {}, password = f.env.ADMIN_VIEW_TOKEN) => {
    await request('/admin', { headers }, cookies);
    return request('/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, ...headers }, body: new URLSearchParams({ username: 'admin', password, csrf: cookies.get('__Host-comanda_csrf') }) }, cookies);
  };
  const choose = (language, options = {}, cookies = jar, now) => request('/admin/language', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers }, body: options.body ?? JSON.stringify({ language }) }, cookies, now);
  const preference = () => f.db.prepare('SELECT language FROM panel_preferences WHERE id=1').get()?.language;
  return { ...f, jar, request, login, choose, preference };
}
test('administrative language choice localizes sign-in and persists only after a valid login', async t => {
  const f = await setup(t); assert.deepEqual(await (await f.choose('es')).json(), { language: 'es', savedToAccount: false });
  assert.equal(f.preference(), undefined);
  const failed = await f.login(f.jar, {}, 'bad-password'); assert.equal(failed.status, 401);
  assert.match(await failed.text(), /role="alert">Usuario o contraseña incorrectos\./); assert.equal(f.preference(), undefined);
  assert.equal((await f.login()).status, 303); assert.equal(f.preference(), 'es');
  assert.equal((await f.request('/admin')).headers.get('Content-Language'), 'es');
  assert.equal(f.jar.has('__Host-bistro_admin_language_choice'), false);
});
test('administrative language survives logout and another browser, and does not share manager preferences', async t => {
  const f = await setup(t); await f.login(); await f.choose('es');
  const token = f.jar.get('__Host-comanda_panel'); assert.ok(token);
  assert.equal((await f.request('/admin/session')).status, 204);
  await f.request('/admin/logout', { method: 'POST', headers: { Origin: origin } }); assert.equal(f.jar.has('__Host-comanda_panel'), false);
  await f.login(); assert.equal(f.preference(), 'es');
  const another = new Map(); await f.login(another, { 'Accept-Language': 'en-US' });
  assert.equal((await f.request('/admin', {}, another)).headers.get('Content-Language'), 'es');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM manager_user_preferences').get().count, 0);
  assert.equal((await f.request('/admin/gestores', {}, another)).headers.get('Content-Language'), 'es');
});
test('language endpoints reject invalid and cross-origin input and expired sessions cannot modify saved preferences', async t => {
  const f = await setup(t); await f.login(); await f.choose('pt');
  for (const language of ['fr', 'pt-BR', '__proto__', null, 1]) assert.equal((await f.choose(language)).status, 400);
  for (const body of ['null', '[]', '{', '{"language":"es","id":2}']) assert.equal((await f.choose('es', { body })).status, 400);
  assert.equal((await f.choose('es', { headers: { Origin: 'https://foreign.example' } })).status, 403);
  assert.equal((await f.choose('es', { body: 'x'.repeat(600) })).status, 413);
  assert.equal((await f.choose('es', { headers: { 'Content-Type': 'text/plain' } })).status, 403);
  assert.equal(f.preference(), 'pt');
  const expired = await f.choose('en', {}, f.jar, Date.now() + 2 * 3600000); assert.equal((await expired.json()).savedToAccount, false); assert.equal(f.preference(), 'pt');
});
test('saved language localizes administrative API errors while preserving session and permissions', async t => {
  const f = await setup(t); await f.login(); await f.choose('es');
  const response = await f.request('/admin/stores', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '' }) });
  assert.equal(response.status, 400); assert.equal((await response.json()).error, 'Introduce un nombre de local de hasta 80 caracteres.');
  const invalid = await f.request('/admin/manager-users', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(invalid.status, 400); assert.equal((await invalid.json()).error, 'Comprueba el nombre y el estado del registro.');
  for (const [language,expected] of [['pt','Categoria de registro inválida.'],['en','Invalid log category.'],['es','Categoría de registro no válida.']]) {
    await f.choose(language);const logs=await f.request('/admin/logs?kind=invalid');assert.equal(logs.status,400);assert.equal((await logs.json()).error,expected);
  }
  assert.equal((await f.request('/admin/session')).status, 204);
});
test('all administrative pages translate visible labels, escape original names and keep executable nonce scripts', async () => {
  const { loginPage, panelPage } = await import('../server/cloudflare/admin-panel.mjs');
  const { managerAdminPage } = await import('../server/cloudflare/manager-pages.mjs');
  const { TRANSLATIONS, LANGUAGES } = await import('../server/cloudflare/manager-i18n.mjs');
  const stores = [{ id: 'seabra-1', name: '<script>Pedidos</script>', code: 1, cashUsers: ['hora'], cashSettings: { tax: { enabled: false, rateBps: 0 }, managers: [] } }];
  for (const language of ['pt', 'en', 'es']) {
    const pages = [loginPage('test-nonce', '', 'csrf', language), panelPage('test-nonce', stores, 'seabra-1', language), managerAdminPage('test-nonce', language)];
    for (const content of pages) {
      assert.match(content, new RegExp("<html lang=['\"]" + LANGUAGES[language] + "['\"]>"));
      for (const match of content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Script(match[1]);
      const markup = content.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<span data-original-text>[^<]*<\/span>/g, '');
      if (language !== 'pt') for (const match of markup.matchAll(/>([^<>]+)</g)) {
        const text = match[1].trim(); if (Object.hasOwn(TRANSLATIONS, text)) assert.ok(TRANSLATIONS[text].includes(text), `Untranslated ${language}: ${text}`);
      }
    }
    assert.ok(pages[1].includes('&lt;script&gt;Pedidos&lt;/script&gt;')); assert.ok(!pages[1].includes('<script>Pedidos</script>'));
    assert.ok(pages[1].includes('<span data-original-text>hora</span>'));
  }
});
