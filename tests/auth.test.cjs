const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const ts = require('typescript');
const output = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('src/services/localAuth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(output, require);
const { createLocalAuth, settingsAccessCode } = output;
test('panel requires login before serving HTML and rejects cross-origin password changes', async () => {
  const { adminResponse } = await import('../server/cloudflare/admin-auth.mjs');
  const env = { ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', ADMIN_VIEW_TOKEN: 'private-owner-password' };
  for (const value of ['', 'Basic invalid', 'Basic ' + btoa('admin:wrong'), 'Basic ' + btoa('other:' + env.ADMIN_VIEW_TOKEN)]) {
    const response = await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: value } }), env);
    assert.equal(response.status, 401);
    assert.ok(response.headers.get('WWW-Authenticate').startsWith('Basic'));
    assert.ok(!(await response.text()).includes('Gerar nova senha'));
  }
  const authorization = 'Basic ' + btoa('admin:' + env.ADMIN_VIEW_TOKEN);
  const panel = await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: authorization } }), env);
  assert.equal(panel.status, 200);
  assert.ok((await panel.text()).includes('Consultar senha'));
  const password = await adminResponse(new Request('https://example.com/auth/admin/password', { headers: { Authorization: authorization } }), env);
  assert.equal(password.status, 200);
  for (const origin of ['', 'https://attacker.example']) {
    const denied = await adminResponse(new Request('https://example.com/auth/admin/password', { method: 'POST', headers: { Authorization: authorization, Origin: origin } }), env);
    assert.equal(denied.status, 403);
  }
});
test('owner panel never embeds credentials and password endpoint requires the owner token', async () => {
  const { adminResponse } = await import('../server/cloudflare/admin-auth.mjs');
  const env = { ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', ADMIN_VIEW_TOKEN: 'test-owner-token' };
  const panel = await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: 'Basic ' + btoa('admin:' + env.ADMIN_VIEW_TOKEN) } }), env);
  const html = await panel.text();
  assert.ok(panel.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.ok(!html.includes(env.ADMIN_VIEW_TOKEN)); assert.ok(!html.includes(env.ADMIN_PASSWORD_SECRET));
  const denied = await adminResponse(new Request('https://example.com/auth/admin/password', { headers: { Authorization: 'Bearer wrong' } }), env);
  assert.equal(denied.status, 401);
  const allowed = await adminResponse(new Request('https://example.com/auth/admin/password', { headers: { Authorization: 'Bearer ' + env.ADMIN_VIEW_TOKEN } }), env);
  assert.equal(allowed.status, 200); assert.match((await allowed.json()).password, /^[a-f0-9]{24}$/);
  assert.equal(allowed.headers.get('Cache-Control'), 'no-store');
});
function fixture() {
  let saved = null, fail = false;
  const storage = { getItemAsync: async () => saved, setItemAsync: async (_, value) => { if (fail) throw Error(); saved = value; } };
  const time = { value: new Date(2026, 8, 25, 6).getTime() };
  const create = () => createLocalAuth(storage, async (size) => randomBytes(size), () => time.value);
  return { create, time, get saved() { return saved; }, set fail(value) { fail = value; } };
}
test('manual rotation requires authorization and replaces the cached password in the same week', async () => {
  const { adminResponse } = await import('../server/cloudflare/admin-auth.mjs');
  const { DatabaseSync } = require('node:sqlite');
  const database = new DatabaseSync(':memory:');
  database.exec(fs.readFileSync('server/cloudflare/schema.sql', 'utf8'));
  const env = { ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', ADMIN_VIEW_TOKEN: 'owner-token', DB: { prepare: (sql) => ({ first: async () => database.prepare(sql).get(), run: async () => database.prepare(sql).run(), bind: (...args) => ({ run: async () => database.prepare(sql).run(...args) }) }) } };
  const request = (method, token = 'owner-token') => new Request('https://example.com/auth/admin/password', { method, headers: { Authorization: 'Bearer ' + token } });
  const before = await (await adminResponse(request('GET'), env)).json();
  const f = fixture(), auth = f.create(); await auth.load();
  const synchronize = () => auth.syncAdmin('https://example.com/auth/admin', async () => adminResponse(new Request('https://example.com/auth/admin'), env));
  await synchronize(); await auth.verify('login', before.password, 'admin');
  assert.equal((await adminResponse(request('POST', 'wrong'), env)).status, 401);
  assert.equal(database.prepare('SELECT revision FROM admin_rotation').get().revision, 0);
  const rotated = await (await adminResponse(request('POST'), env)).json();
  assert.notEqual(rotated.password, before.password);
  await auth.verify('login', before.password, 'admin'); // Device has not synchronized yet.
  assert.equal(await synchronize(), true);
  await assert.rejects(auth.verify('login', before.password, 'admin'));
  await auth.verify('login', rotated.password, 'admin');
  const panel = await (await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: 'Basic ' + btoa('admin:' + env.ADMIN_VIEW_TOKEN) } }), env)).text();
  new Function(panel.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.ok(panel.includes('Gerar nova senha agora'));
  env.ADMIN_PANEL_USER = 'owner@example.com';
  const correct = 'Basic ' + btoa(env.ADMIN_PANEL_USER + ':' + env.ADMIN_VIEW_TOKEN);
  assert.equal((await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: correct } }), env)).status, 200);
  for (let i = 0; i < 5; i++) await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: 'Basic ' + btoa('owner@example.com:wrong') } }), env);
  assert.equal((await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: correct } }), env)).status, 429);
  database.close();
});
test('offline login persists hashed credentials, rejects wrong passwords and protects settings', async () => {
  const f = fixture(), first = f.create();
  assert.equal(await first.load(), false);
  await first.setup('admin', 'local-password', 'local-password');
  assert.ok(!f.saved.includes('local-password'));
  const reopened = f.create(); await reopened.load();
  await assert.rejects(reopened.verify('settings', '2066'));
  await assert.rejects(reopened.verify('login', 'incorrect', 'admin'));
  await reopened.verify('login', 'local-password', 'admin');
  await reopened.verify('settings', '2066');
  f.time.value += 3600000;
  await assert.rejects(reopened.verify('settings', '2066'));
  await reopened.verify('settings', '2067');
  reopened.logout(); await assert.rejects(reopened.verify('settings', '2067'));
  assert.equal(settingsAccessCode(new Date(2026, 8, 25, 6)), '2066');
});
test('failed credential writes never create access; corrupt storage fails closed', async () => {
  const f = fixture(), auth = f.create(); await auth.load(); f.fail = true;
  await assert.rejects(auth.setup('admin', 'local-password', 'local-password'));
  assert.equal(f.saved, null);
  await assert.rejects(auth.verify('login', 'local-password', 'admin'));
  const corrupt = createLocalAuth({ getItemAsync: async () => 'null', setItemAsync: async () => {} }, randomBytes);
  await assert.rejects(corrupt.load());
  await assert.rejects(corrupt.setup('admin', 'local-password', 'local-password'));
});
test('admin rotation is weekly; offline, invalid responses and failed writes retain the last password', async () => {
  const { weeklyAdmin, adminResponse } = await import('../server/cloudflare/admin-auth.mjs');
  const secret = 'test-only-secret-not-for-deployment-1234';
  const week1 = await weeklyAdmin(secret, Date.UTC(2026, 8, 21));
  const same = await weeklyAdmin(secret, Date.UTC(2026, 8, 27, 23, 59));
  const week2 = await weeklyAdmin(secret, Date.UTC(2026, 8, 28));
  assert.equal(week1.password, same.password); assert.notEqual(week1.password, week2.password);
  const publicResponse = await adminResponse(new Request('https://example.com/auth/admin'), { ADMIN_PASSWORD_SECRET: secret });
  assert.equal((await publicResponse.json()).password, undefined);
  assert.equal((await adminResponse(new Request('https://example.com/auth/admin/password'), { ADMIN_PASSWORD_SECRET: secret })).status, 401);
  const f = fixture(), auth = f.create(); await auth.load();
  const url = 'https://example.com/auth/admin';
  const response = (value) => async () => ({ ok: true, json: async () => value });
  await auth.syncAdmin(url, response(week1));
  await auth.verify('login', week1.password, 'admin');
  await assert.rejects(auth.syncAdmin(url, async () => { throw Error('offline'); }));
  await assert.rejects(auth.syncAdmin(url, response({ ...week2, hash: 'invalid' })));
  f.fail = true; await assert.rejects(auth.syncAdmin(url, response(week2))); f.fail = false;
  await auth.verify('login', week1.password, 'admin');
  await auth.syncAdmin(url, response(week2));
  await assert.rejects(auth.verify('login', week1.password, 'admin'));
  await auth.verify('login', week2.password, 'admin');
  assert.equal(await auth.syncAdmin(url, response(week1)), false);
  const offline = f.create(); await offline.load(); await offline.verify('login', week2.password, 'admin');
  for (let i = 0; i < 5; i++) await assert.rejects(offline.verify('settings', 'wrong'));
  const restarted = f.create(); await restarted.load();
  await assert.rejects(restarted.verify('login', week2.password, 'admin'), /minuto/);
  f.time.value += 60001; await restarted.verify('login', week2.password, 'admin');
});
