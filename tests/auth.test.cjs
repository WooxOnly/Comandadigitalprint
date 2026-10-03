const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const ts = require('typescript');
const output = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('src/services/localAuth.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(output, (name) => name === '../config/offlineRecovery.json' ? require('../src/config/offlineRecovery.json') : require(name));
const { createLocalAuth, settingsAccessCode } = output;
test('panel requires a session, ignores cached Basic auth and rejects cross-origin password changes', async () => {
  const { adminResponse } = await import('../server/cloudflare/admin-auth.mjs');
  const env = { ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', ADMIN_VIEW_TOKEN: 'private-owner-password' };
  for (const value of ['', 'Basic invalid', 'Basic ' + btoa('admin:wrong'), 'Basic ' + btoa('other:' + env.ADMIN_VIEW_TOKEN)]) {
    const response = await adminResponse(new Request('https://example.com/admin', { headers: { Authorization: value } }), env);
    assert.equal(response.status, 200);
    assert.ok(!(await response.text()).includes('Gerar nova senha'));
  }
  const now = 10000000;
  const login = await adminResponse(new Request('https://example.com/admin/login', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: 'admin', password: env.ADMIN_VIEW_TOKEN }) }), env, now);
  assert.equal(login.status, 303);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  assert.match(login.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);
  const panel = await adminResponse(new Request('https://example.com/admin', { headers: { Cookie: cookie } }), env, now + 59 * 60000);
  assert.equal(panel.status, 200);
  assert.ok((await panel.text()).includes('BistroHub'));
  const password = await adminResponse(new Request('https://example.com/auth/admin/password', { headers: { Cookie: cookie } }), env, now + 59 * 60000);
  assert.equal(password.status, 200);
  assert.equal((await adminResponse(new Request('https://example.com/admin/session', { headers: { Cookie: cookie } }), env, now + 61 * 60000)).status, 401);
  const renewed = panel.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await adminResponse(new Request('https://example.com/admin/session', { headers: { Cookie: renewed } }), env, now + 61 * 60000)).status, 204);
  for (const origin of ['', 'https://attacker.example']) {
    const denied = await adminResponse(new Request('https://example.com/auth/admin/password', { method: 'POST', headers: { Cookie: cookie, Origin: origin } }), env, now);
    assert.equal(denied.status, 403);
  }
});
test('owner panel never embeds credentials and password endpoint requires the owner token', async () => {
  const { adminResponse } = await import('../server/cloudflare/admin-auth.mjs');
  const env = { ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', ADMIN_VIEW_TOKEN: 'test-owner-token' };
  const panel = await adminResponse(new Request('https://example.com/admin'), env);
  const html = await panel.text();
  assert.ok(panel.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.ok(!html.includes(env.ADMIN_VIEW_TOKEN)); assert.ok(!html.includes(env.ADMIN_PASSWORD_SECRET));
  const denied = await adminResponse(new Request('https://example.com/auth/admin/password', { headers: { Authorization: 'Bearer wrong' } }), env);
  assert.equal(denied.status, 401);
  const allowed = await adminResponse(new Request('https://example.com/auth/admin/password', { headers: { Authorization: 'Bearer ' + env.ADMIN_VIEW_TOKEN } }), env);
  assert.equal(allowed.status, 200); assert.match((await allowed.json()).password, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(allowed.headers.get('Cache-Control'), 'no-store');
});
function fixture(recovery) {
  const values = new Map(); let fail = false;
  const storage = { getItemAsync: async (key) => values.get(key) ?? null, setItemAsync: async (key, value) => { if (fail) throw Error(); values.set(key, value); } };
  const time = { value: new Date(2026, 8, 25, 6).getTime() };
  const create = () => createLocalAuth(storage, async (size) => randomBytes(size), () => time.value, undefined, recovery);
  return { create, time, get saved() { return values.get('comandadigitalprint.credentials.v1') ?? null; }, set fail(value) { fail = value; } };
}

test('offline recovery survives cleared storage, persists lockout and resumes weekly admin after reconnecting', async () => {
  const { pbkdf2Sync } = require('node:crypto');
  const code = 'ABCDEFGHJKLMNPQR';
  const salt = randomBytes(16).toString('hex');
  const recovery = { salt, hash: pbkdf2Sync(code, Buffer.from(salt, 'hex'), 600000, 32, 'sha256').toString('hex'), iterations: 600000 };
  const f = fixture(recovery), fresh = f.create(); await fresh.load();
  await assert.rejects(fresh.recoverOffline(code, '1234567', '1234567'));
  for (let i = 0; i < 5; i++) await assert.rejects(fresh.recoverOffline('wrong', '123456', '123456'), /incorreta/);
  const restarted = f.create(); await restarted.load();
  await assert.rejects(restarted.recoverOffline(code, '123456', '123456'), /minuto/);
  f.time.value += 60001;
  f.fail = true;
  await assert.rejects(restarted.recoverOffline(code, '123456', '123456'));
  assert.equal(f.saved, null);
  await assert.rejects(restarted.verify('login', '123456', 'admin'));
  f.fail = false;
  await restarted.recoverOffline('abcd-efgh-jklm-npqr', '123456', '123456');
  assert.ok(!f.saved.includes(code)); assert.ok(!f.saved.includes('123456'));
  const offline = f.create(); await offline.load();
  await offline.verify('login', '123456', 'admin');
  await assert.rejects(offline.recoverOffline(code, '654321', '654321'), /configurado/);
  await assert.rejects(offline.syncAdmin('https://example.com/auth/admin', async () => { throw Error('offline'); }));
  await offline.verify('login', '123456', 'admin');
  const { weeklyAdmin } = await import('../server/cloudflare/admin-auth.mjs');
  const weekly = await weeklyAdmin('test-only-secret-not-for-deployment-1234');
  await offline.syncAdmin('https://example.com/auth/admin', async () => ({ ok: true, json: async () => weekly }));
  await assert.rejects(offline.verify('login', '123456', 'admin'));
  await offline.verify('login', weekly.password, 'admin');
});

test('local users survive restart, require unlocked settings and support disable and password reset offline', async () => {
  const f = fixture(), auth = f.create(); await auth.load();
  await assert.rejects(auth.verify('login', 'abc123', 'admin'), /Recupere/);
  await auth.setup('admin', 'abc123', 'abc123');
  await assert.rejects(auth.createUser('staff', '123456', '123456'));
  await auth.verify('settings', '2066');
  await assert.rejects(auth.createUser('admin', '123456', '123456'));
  await assert.rejects(auth.createUser('staff', '1234567', '1234567'));
  await auth.createUser('Staff', '123456', '123456');
  await assert.rejects(auth.createUser('staff', '123456', '123456'));
  assert.deepEqual(auth.listUsers(), [{ username: 'staff', active: true }]);
  assert.deepEqual(auth.loginUsers(), ['admin', 'staff']);
  f.fail = true;
  await assert.rejects(auth.updateUser('staff', false));
  await assert.rejects(auth.createUser('other', '123456', '123456'));
  assert.deepEqual(auth.listUsers(), [{ username: 'staff', active: true }]);
  f.fail = false;
  const reopened = f.create(); await reopened.load();
  await assert.rejects(reopened.verify('login', 'wrong', 'staff'));
  await reopened.verify('login', '123456', 'STAFF');
  await reopened.verify('settings', '2066');
  await assert.rejects(reopened.updateUser('staff', false));
  reopened.logout();
  await assert.rejects(reopened.updateUser('staff', true, '654321', '654321'));
  await reopened.verify('login', 'abc123', 'admin');
  await reopened.verify('settings', '2066');
  await reopened.updateUser('staff', false);
  assert.deepEqual(reopened.loginUsers(), ['admin']);
  await assert.rejects(reopened.verify('login', '123456', 'staff'));
  await reopened.updateUser('staff', true, '654321', '654321');
  assert.deepEqual(reopened.loginUsers(), ['admin', 'staff']);
  reopened.lockSettings();
  await assert.rejects(reopened.updateUser('staff', false));
  reopened.logout();
  await assert.rejects(reopened.verify('login', '123456', 'staff'));
  await reopened.verify('login', '654321', 'staff');
});

test('staff can change only their own password after unlocking settings', async () => {
  const f = fixture(), admin = f.create(); await admin.load(); await admin.setup('admin', 'abc123', 'abc123');
  await admin.verify('settings', '2066'); await admin.createUser('staff', '123456', '123456');
  const staff = f.create(); await staff.load(); await staff.verify('login', '123456', 'staff'); await staff.verify('settings', '2066');
  await assert.rejects(staff.createUser('other', '123456', '123456'), /protegido/);
  await assert.rejects(staff.updateUser('staff', true, '654321', '654321'), /protegido/);
  await assert.rejects(staff.changeOwnPassword('wrong', '654321', '654321'), /atual incorreta/);
  await staff.changeOwnPassword('123456', '654321', '654321');
  staff.logout(); await assert.rejects(staff.verify('login', '123456', 'staff'));
  await staff.verify('login', '654321', 'staff');
});

test('native password wrapper preserves old and weekly hashes and releases stalled verification', async (t) => {
  const crypto = require('node:crypto');
  const code = ts.transpileModule(fs.readFileSync('src/services/passwordDigest.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const load = (pbkdf2) => {
    const result = {};
    new Function('exports', 'require', code)(result, (name) => name === 'react-native-quick-crypto' ? { pbkdf2 } : require(name));
    return result.passwordDigest;
  };
  const nativeDigest = load(crypto.pbkdf2);
  const salt = '1234567890abcdef1234567890abcdef';
  for (const iterations of [100000, 600000]) {
    const expected = crypto.pbkdf2Sync('old-senha-á-123', Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');
    assert.equal(await nativeDigest('old-senha-á-123', salt, iterations), expected);
  }
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let finish;
  const stalled = load((...args) => { finish = args.at(-1); })('123456', salt, 100000);
  const rejected = assert.rejects(stalled, /demorou/);
  t.mock.timers.tick(10000);
  await rejected;
  finish(null, Buffer.alloc(32)); // A late response must not turn failure into a successful login.
  await assert.rejects(stalled, /demorou/);
});
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
  const panel = await (await adminResponse(new Request('https://example.com/admin', { headers: { Cookie: (await adminResponse(new Request('https://example.com/admin/login', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: 'admin', password: env.ADMIN_VIEW_TOKEN }) }), env)).headers.get('Set-Cookie').split(';')[0] } }), env)).text();
  new Function(panel.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.ok(panel.includes('Gerar nova senha agora'));
  env.ADMIN_PANEL_USER = 'owner@example.com';
  const loginRequest = (password) => new Request('https://example.com/admin/login', { method: 'POST', headers: { Origin: 'https://example.com', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: env.ADMIN_PANEL_USER, password }) });
  assert.equal((await adminResponse(loginRequest(env.ADMIN_VIEW_TOKEN), env)).status, 303);
  for (let i = 0; i < 5; i++) await adminResponse(loginRequest('wrong'), env);
  assert.equal((await adminResponse(loginRequest(env.ADMIN_VIEW_TOKEN), env)).status, 429);
  database.close();
});
test('offline login persists hashed credentials, rejects wrong passwords and protects settings', async () => {
  const f = fixture(), first = f.create();
  assert.equal(await first.load(), false);
  await first.setup('admin', 'abc123', 'abc123');
  assert.ok(!f.saved.includes('abc123'));
  const reopened = f.create(); await reopened.load();
  await assert.rejects(reopened.verify('settings', '2066'));
  await assert.rejects(reopened.verify('login', 'incorrect', 'admin'));
  await reopened.verify('login', 'abc123', 'admin');
  await reopened.verify('settings', '2066');
  f.time.value += 3600000;
  await assert.rejects(reopened.verify('settings', '2066'));
  await reopened.verify('settings', '2067');
  reopened.logout(); await assert.rejects(reopened.verify('settings', '2067'));
  assert.equal(settingsAccessCode(new Date(2026, 8, 25, 6)), '2066');
});
test('settings password uses the local 12-hour clock', async () => {
  assert.equal(settingsAccessCode(new Date(2026, 9, 1, 3)), '2040');
  assert.equal(settingsAccessCode(new Date(2026, 9, 1, 15)), '2040');
  assert.equal(settingsAccessCode(new Date(2026, 9, 1, 12)), '2049');
  assert.equal(settingsAccessCode(new Date(2026, 9, 1, 0)), '2049');
  const f = fixture(), auth = f.create();
  await auth.load();
  await auth.setup('admin', 'abc123', 'abc123');
  f.time.value = new Date(2026, 9, 1, 15).getTime();
  await auth.verify('settings', '2040');
});
test('failed credential writes never create access; corrupt storage fails closed', async () => {
  const f = fixture(), auth = f.create(); await auth.load(); f.fail = true;
  await assert.rejects(auth.setup('admin', 'abc123', 'abc123'));
  assert.equal(f.saved, null);
  await assert.rejects(auth.verify('login', 'abc123', 'admin'));
  const corrupt = createLocalAuth({ getItemAsync: async () => 'null', setItemAsync: async () => {} }, randomBytes);
  await assert.rejects(corrupt.load());
  await assert.rejects(corrupt.setup('admin', 'abc123', 'abc123'));
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
