const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Script } = require('node:vm');
const fs = require('node:fs');
const { fixture } = require('./helpers/business-fixture.cjs');
const origin = 'https://example.com', password = 'manager-language-password';
function remember(jar, response) {
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0], index = pair.indexOf('=');
    if (/Max-Age=0(?:;|$)/.test(value)) jar.delete(pair.slice(0, index));
    else jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}
async function setup(t) {
  const f = await fixture(t), { managerResponse } = await import('../server/cloudflare/manager-api.mjs');
  const auth = await import('../server/cloudflare/manager-auth.mjs'), i18n = await import('../server/cloudflare/manager-i18n.mjs');
  const salt = '0123456789abcdef0123456789abcdef', hash = await auth.digest(password, salt);
  f.db.prepare('INSERT INTO manager_clients(id,name,store_ids,active,revision) VALUES(?,?,?,?,1)').run('group', 'Group', '["seabra-1"]', 1);
  for (const name of ['alice', 'bruno']) f.db.prepare('INSERT INTO manager_users(id,client_id,name,username,salt,hash,active,revision) VALUES(?,?,?,?,?,?,1,1)').run(name, 'group', name, name, salt, hash);
  const jar = new Map();
  const request = async (path, options = {}, cookies = jar, now = Date.now()) => {
    const headers = new Headers({ 'Accept-Language': 'en-US', Cookie: [...cookies].map(([key, value]) => key + '=' + value).join('; '), ...options.headers });
    const response = await managerResponse(new Request(origin + path, { ...options, headers }), f.env, now);
    remember(cookies, response); return response;
  };
  const login = async (username = 'alice', cookies = jar, headers = {}, suppliedPassword = password) => {
    await request('/gestor', { headers }, cookies);
    return request('/gestor/login', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', ...headers }, body: new URLSearchParams({ username, password: suppliedPassword, csrf: cookies.get(auth.CSRF_COOKIE) }) }, cookies);
  };
  const choose = (language, cookies = jar, options = {}) => request('/gestor/language', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers }, body: options.body ?? JSON.stringify({ language }) }, cookies, options.now);
  const preference = user => f.db.prepare('SELECT language FROM manager_user_preferences WHERE user_id=?').get(user)?.language;
  return { ...f, auth, i18n, jar, request, login, choose, preference };
}

test('manager language detection accepts regional tags, weights, supported fallbacks and remembered choices', async () => {
  const { requestLanguage, LANGUAGE_COOKIE } = await import('../server/cloudflare/manager-i18n.mjs');
  const { readCookie } = await import('../server/cloudflare/manager-auth.mjs');
  const language = (value, cookie = '') => requestLanguage(new Request(origin, { headers: { 'Accept-Language': value, Cookie: cookie } }), readCookie);
  assert.equal(language('es-MX,es;q=0.9,en;q=0.8'), 'es');
  assert.equal(language('en-US;q=0.3,pt-BR;q=0.9'), 'pt');
  assert.equal(language('fr-FR,de-DE;q=0.8'), 'en');
  assert.equal(language('pt;q=0,es;q=wrong,en;q=1.5'), 'en');
  assert.equal(language('en-US', LANGUAGE_COOKIE + '=es'), 'es');
  assert.equal(language('es-ES', LANGUAGE_COOKIE + '=invalid'), 'es');
});

test('anonymous selection localizes sign-in and errors but only valid credentials save account preferences', async t => {
  const f = await setup(t);
  const response = await f.choose('es'); assert.deepEqual(await response.json(), { language: 'es', savedToAccount: false });
  assert.equal(f.preference('alice'), undefined);
  const failed = await f.login('alice', f.jar, {}, 'wrong-password'); assert.equal(failed.status, 401);
  assert.match(await failed.text(), /<p role='alert'>Usuario o contraseña incorrectos\.<\/p>/);
  assert.equal(f.preference('alice'), undefined);
  const success = await f.login(); assert.equal(success.status, 303); assert.equal(f.preference('alice'), 'es');
  assert.equal(f.jar.has(f.i18n.LANGUAGE_CHOICE_COOKIE), false);
  const page = await f.request('/gestor'); assert.equal(page.headers.get('Content-Language'), 'es'); assert.match(await page.text(), /<h1>Panel de gestión<\/h1>/);
});

test('language survives reload, logout and another browser with a different default locale', async t => {
  const f = await setup(t); assert.equal((await f.login()).status, 303);
  assert.deepEqual(await (await f.choose('pt')).json(), { language: 'pt', savedToAccount: true });
  assert.equal((await f.request('/gestor')).headers.get('Content-Language'), 'pt');
  assert.equal((await f.request('/gestor/logout', { method: 'POST', headers: { Origin: origin } })).status, 204);
  assert.equal(f.jar.has(f.auth.MANAGER_COOKIE), false);
  assert.equal((await f.login()).status, 303);
  const another = new Map(); assert.equal((await f.login('alice', another, { 'Accept-Language': 'es-ES' })).status, 303);
  assert.deepEqual(await (await f.request('/gestor/api/preferences', {}, another)).json(), { language: 'pt' });
  assert.equal((await f.request('/gestor', {}, another)).headers.get('Content-Language'), 'pt');
});

test('two accounts sharing one browser keep independent preferences and an explicit sign-in choice wins', async t => {
  const f = await setup(t); await f.login(); await f.choose('es');
  await f.login('bruno'); await f.choose('en');
  await f.login('alice'); assert.equal((await f.request('/gestor')).headers.get('Content-Language'), 'es');
  assert.equal(f.preference('bruno'), 'en');
  await f.request('/gestor/logout', { method: 'POST', headers: { Origin: origin } });
  await f.choose('pt'); await f.login('alice');
  assert.equal(f.preference('alice'), 'pt'); assert.equal(f.preference('bruno'), 'en');
});

test('language changes preserve manager session, revision and all module/store scopes', async t => {
  const f = await setup(t); f.modules('seabra-1', false, false, false, true); await f.login();
  const token = f.jar.get(f.auth.MANAGER_COOKIE), before = f.db.prepare('SELECT revision FROM manager_users WHERE id=?').get('alice').revision;
  const query = '/gestor/api/production?from=2026-10-07&to=2026-10-07&timeZone=UTC', now = Date.now();
  const first = await f.request(query, {}, f.jar, now); assert.equal(first.status, 200);
  const previous = await first.json();
  await f.choose('es');
  assert.equal(f.jar.get(f.auth.MANAGER_COOKIE), token);
  assert.equal(f.db.prepare('SELECT revision FROM manager_users WHERE id=?').get('alice').revision, before);
  assert.deepEqual(await (await f.request(query, {}, f.jar, now)).json(), previous);
  const denied = await f.request(query + '&storeId=seabra-2'); assert.equal(denied.status, 403); assert.equal((await denied.json()).error, 'Local no autorizado.');
  const badDates = await f.request('/gestor/api/production?from=invalid&to=invalid'); assert.equal(badDates.status, 400); assert.equal((await badDates.json()).error, 'Introduce fechas válidas.');
});

test('strict preference validation rejects unsupported codes, foreign users, malformed bodies and cross-origin changes', async t => {
  const f = await setup(t); await f.login();
  for (const value of ['fr', 'en-US', '', '__proto__', null, 1]) assert.equal((await f.choose(value)).status, 400);
  for (const body of ['null', '[]', '{}', '{', '{"language":"pt","userId":"bruno"}']) assert.equal((await f.choose('pt', f.jar, { body })).status, 400);
  assert.equal((await f.choose('pt', f.jar, { headers: { Origin: 'https://foreign.example' } })).status, 403);
  assert.equal((await f.choose('pt', f.jar, { headers: { 'Content-Type': 'text/plain' } })).status, 403);
  assert.equal((await f.choose('pt', f.jar, { body: JSON.stringify({ language: ' '.repeat(600) }) })).status, 413);
  assert.equal(f.preference('alice'), 'en'); assert.equal(f.preference('bruno'), undefined);
});

test('expired or revoked sessions can remember a browser language but cannot change the account', async t => {
  const f = await setup(t); await f.login(); await f.choose('es');
  const future = Date.now() + 5 * 3600000;
  const expired = await f.choose('pt', f.jar, { now: future }); assert.deepEqual(await expired.json(), { language: 'pt', savedToAccount: false });
  assert.equal(f.preference('alice'), 'es');
  assert.equal((await f.request('/gestor/api/preferences', {}, f.jar, future)).status, 401);
  f.db.prepare('UPDATE manager_users SET active=0 WHERE id=?').run('alice');
  assert.equal((await (await f.choose('en')).json()).savedToAccount, false); assert.equal(f.preference('alice'), 'es');
});

test('preference schema is replay-safe, retains saved values and bounds allowed languages', async t => {
  const f = await setup(t); await f.login(); await f.choose('es');
  f.db.exec(fs.readFileSync('server/cloudflare/store-schema.sql', 'utf8'));
  assert.equal(f.preference('alice'), 'es');
  assert.throws(() => f.db.prepare('UPDATE manager_user_preferences SET language=? WHERE user_id=?').run('fr', 'alice'), /CHECK constraint failed/);
});

test('every translation has both target languages and preserves dynamic placeholders', async () => {
  const { TRANSLATIONS, SINGULAR_TRANSLATIONS, translate } = await import('../server/cloudflare/manager-i18n.mjs');
  const parameters = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [source, targets] of Object.entries(TRANSLATIONS)) {
    assert.equal(targets.length, 2, source);
    for (const target of targets) { assert.ok(target.length, source); assert.deepEqual(parameters(target), parameters(source), source); }
  }
  for (const [source, targets] of Object.entries(SINGULAR_TRANSLATIONS)) {
    assert.equal(targets.length, 3, source);
    for (const target of targets) assert.deepEqual(parameters(target), parameters(source), source);
  }
  assert.equal(translate('en', 'TMA'), 'Average fulfillment time');
  assert.equal(translate('es', 'TMA'), 'Tiempo medio de servicio del pedido');
  assert.equal(translate('en', '{count} registros', { count: 12 }), '12 records');
  assert.equal(translate('en', '{count} registros', { count: 1 }), '1 record');
  assert.equal(translate('es', '{count} pedidos no período', { count: '1' }), '1 pedido del período');
  assert.equal(translate('pt', '{count} registros', { count: 1 }), '1 registro');
  assert.equal(translate('en', 'constructor'), 'constructor');
});

test('all manager screens translate static text and keep scripts valid, CSP intact and business names unchanged', async () => {
  const { managerLoginPage, managerPortalPage } = await import('../server/cloudflare/manager-pages.mjs');
  const { LANGUAGES, TRANSLATIONS } = await import('../server/cloudflare/manager-i18n.mjs');
  const session = { user: { id: 'alice', name: 'Pedidos' }, client: { name: '<script>Vendas</script>' } };
  const textNodes = markup => [...markup.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '').matchAll(/>([^<>]+)</g)].map(match => match[1].trim()).filter(Boolean);
  for (const language of ['pt', 'en', 'es']) {
    const pages = [managerLoginPage('test-nonce', 'csrf', '', language), managerPortalPage('test-nonce', session, language)];
    for (const content of pages) {
      assert.ok(content.includes("<html lang='" + LANGUAGES[language] + "'>"));
      for (const script of content.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) { assert.equal(script[1], " nonce='test-nonce'"); new Script(script[2]); }
      if (language !== 'pt') for (const text of textNodes(content)) if (Object.hasOwn(TRANSLATIONS, text)) assert.ok(TRANSLATIONS[text].includes(text), `Untranslated ${language}: ${text}`);
    }
    assert.ok(pages[1].includes('&lt;script&gt;Vendas&lt;/script&gt; · Pedidos'));
    assert.ok(!pages[1].includes('<script>Vendas</script>'));
  }
});

test('failed database preference save returns an error without claiming the account was saved', async t => {
  const f = await setup(t); await f.login(); const original = f.env.DB.prepare;
  f.env.DB.prepare = sql => sql.startsWith('INSERT INTO manager_user_preferences') ? { bind: () => ({ run: async () => { throw Error('Database unavailable'); } }) } : original(sql);
  const response = await f.choose('es'); assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'Dashboard temporarily unavailable.' });
  assert.equal(f.preference('alice'), 'en'); assert.equal(response.headers.getSetCookie().length, 0);
});
