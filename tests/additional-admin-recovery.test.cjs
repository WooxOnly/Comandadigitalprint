const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { createHash, pbkdf2Sync } = require('node:crypto');
const fs = require('node:fs');

const origin = 'https://example.com';
const now = Date.UTC(2026, 9, 15);
const ownerEmail = 'owner@example.test';
const identities = [
  { id: '11111111-1111-4111-8111-111111111111', username: 'first-admin@example.test', password: 'first-admin8' },
  { id: '22222222-2222-4222-8222-222222222222', username: 'second-admin@example.test', password: 'second-admin8' },
];
const hashToken = value => createHash('sha256').update(value).digest('hex');
const hashPassword = (value, salt) => pbkdf2Sync(value, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
const plain = value => value ? { ...value } : value;

async function fixture(t) {
  const recovery = await import('../server/cloudflare/password-recovery.mjs');
  const { adminResponse, provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of ['schema.sql', 'cloud-schema.sql', 'diagnostics-schema.sql', 'store-schema.sql']) {
    db.exec(fs.readFileSync('server/cloudflare/' + name, 'utf8'));
  }
  const statement = (sql, args = []) => ({
    sql, args, bind: (...values) => statement(sql, values),
    first: async () => db.prepare(sql).get(...args),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: db.prepare(sql).run(...args).changes } }),
  });
  const batch = async statements => {
    db.exec('BEGIN');
    try {
      const results = statements.map(item => ({ results: db.prepare(item.sql).all(...item.args) }));
      db.exec('COMMIT');
      return results;
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const env = {
    DB: { prepare: statement, batch }, ADMIN_PASSWORD_SECRET: 'test-only-long-signing-secret-never-for-deployment',
    ADMIN_VIEW_TOKEN: 'test-only-legacy-owner-secret', ADMIN_PANEL_USER: 'admin', ADMIN_RECOVERY_EMAIL: ownerEmail,
    RESEND_API_KEY: 'test-resend-key', PASSWORD_RESET_FROM: 'sender@example.test', PASSWORD_RESET_ORIGIN: origin,
  };
  const salt = '1234567890abcdef1234567890abcdef';
  db.prepare('INSERT INTO panel_password(id,salt,hash,iterations,revision) VALUES(1,?,?,100000,1)').run(salt, hashPassword('owner-pass8', salt));
  db.prepare("INSERT INTO panel_preferences(id,language) VALUES(1,'es')").run();
  for (const account of identities) {
    db.prepare('INSERT INTO panel_admin_accounts(id,username,salt,hash,revision,active,language) VALUES(?,?,?,?,1,1,NULL)')
      .run(account.id, account.username, salt, hashPassword(account.password, salt));
  }
  const sent = [], delivery = { failure: false, pending: null };
  const previousFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.ok(['https://api.resend.com/emails', 'https://api.brevo.com/v3/smtp/email'].includes(url), 'never send a real email');
    sent.push({ url, body: JSON.parse(options.body), headers: options.headers });
    if (delivery.pending) return delivery.pending;
    return new Response(JSON.stringify({ id: 'mock-provider-message' }), { status: delivery.failure ? 403 : url.includes('brevo') ? 201 : 200 });
  };
  t.after(() => { global.fetch = previousFetch; });
  const request = ip => new Request(origin + '/admin/recover', { headers: { 'CF-Connecting-IP': ip || '192.0.2.1' } });
  const send = (username, language = 'pt', options = {}) => recovery.requestRecovery(request(options.ip), env, username, language, options.now ?? now, options.context);
  const reset = (token, password = 'replacement8', timestamp = now) => recovery.resetPassword(request(), env, token, password, timestamp);
  const valid = (token, timestamp = now) => recovery.recoveryTokenValid(env, token, timestamp);
  const token = (index = sent.length - 1) => {
    const text = sent[index].body.text ?? sent[index].body.textContent;
    const match = text.match(/https:\/\/example\.com\/admin\/reset-password\?token=([a-f0-9]{64})/);
    assert.ok(match); return match[1];
  };
  return { db, env, sent, delivery, send, reset, valid, token, adminResponse, provisionableStores };
}
const account = (f, index = 0) => plain(f.db.prepare('SELECT * FROM panel_admin_accounts WHERE id=?').get(identities[index].id));
const extraTokens = f => f.db.prepare('SELECT * FROM panel_admin_password_recovery ORDER BY token_hash').all().map(plain);
const ownerState = f => Object.fromEntries(['panel_password', 'panel_login', 'panel_preferences', 'panel_password_recovery', 'store_admin_rotation', 'admin_rotation', 'stores', 'manager_users'].map(table => [table, f.db.prepare('SELECT * FROM ' + table).all().map(plain)]));

async function loginCookie(f, username, password) {
  const page = await f.adminResponse(new Request(origin + '/admin'), f.env, now);
  const csrf = page.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_csrf=')).split(';')[0];
  const response = await f.adminResponse(new Request(origin + '/admin/login', {
    method: 'POST', headers: { Cookie: csrf, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrf: csrf.split('=')[1], username, password }),
  }), f.env, now);
  assert.equal(response.status, 303);
  return response.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_panel=')).split(';')[0];
}
const sessionStatus = async (f, cookie) => (await f.adminResponse(new Request(origin + '/admin/session', { headers: { Cookie: cookie } }), f.env, now)).status;

test('additional administrator recovery uses the stored email, separate token table, and all existing email languages', async t => {
  const f = await fixture(t), before = ownerState(f);
  const subjects = { pt: 'Redefinição de senha · BistroHub', en: 'Password reset · BistroHub', es: 'Restablecimiento de contraseña · BistroHub' };
  for (const [language, subject] of Object.entries(subjects)) {
    assert.equal((await f.send('  ' + identities[0].username.toUpperCase() + '  ', language)).status, 200);
    const payload = f.sent.at(-1).body, token = f.token();
    assert.deepEqual(payload.to, [identities[0].username]);
    assert.equal(payload.subject, subject);
    assert.equal(await f.valid(token), true);
    const stored = extraTokens(f).find(row => row.token_hash === hashToken(token));
    assert.equal(stored.account_id, identities[0].id);
    assert.equal(stored.password_revision, 1);
    assert.equal(stored.expires_at, now + 15 * 60 * 1000);
    assert.equal(stored.used_at, null);
    assert.ok(!JSON.stringify(stored).includes(token));
  }
  assert.deepEqual(ownerState(f), before);
  assert.equal(f.db.prepare("SELECT * FROM panel_recovery_limits WHERE key='owner-email'").get(), undefined);
});

test('unknown, inactive, and invalid stored email accounts get a generic response without sending or claiming owner quota', async t => {
  const f = await fixture(t), before = ownerState(f);
  f.db.prepare('UPDATE panel_admin_accounts SET active=0 WHERE id=?').run(identities[1].id);
  const salt = '1234567890abcdef1234567890abcdef';
  f.db.prepare('INSERT INTO panel_admin_accounts(id,username,salt,hash) VALUES(?,?,?,?)').run('invalid', 'not-an-email', salt, hashPassword('invalid-pass8', salt));
  const responses = [];
  for (const username of ['unknown@example.test', identities[1].username, 'not-an-email']) responses.push(await f.send(username));
  assert.ok(responses.every(value => value.status === 200 && value.success));
  assert.deepEqual(responses[0], responses[1]);
  assert.deepEqual(responses[1], responses[2]);
  assert.equal(f.sent.length, 0);
  assert.equal(extraTokens(f).length, 0);
  assert.equal(f.db.prepare("SELECT * FROM panel_recovery_limits WHERE key='owner-email'").get(), undefined);
  assert.deepEqual(ownerState(f), before);
});

test('resetting one administrator revokes only its sessions, links and login failures while owner and another admin remain intact', async t => {
  const f = await fixture(t);
  const ownerCookie = await loginCookie(f, ownerEmail, 'owner-pass8');
  const firstCookie = await loginCookie(f, identities[0].username, identities[0].password);
  const secondCookie = await loginCookie(f, identities[1].username, identities[1].password);
  await f.send(ownerEmail); const ownerToken = f.token();
  await f.send(identities[1].username); const secondToken = f.token();
  await f.send(identities[0].username); const firstToken = f.token();
  f.db.prepare('UPDATE panel_login SET attempts=2 WHERE id=1').run();
  f.db.prepare('UPDATE panel_admin_accounts SET attempts=6,blocked_until=? WHERE id=?').run(now + 30000, identities[0].id);
  f.db.prepare('UPDATE panel_admin_accounts SET attempts=3 WHERE id=?').run(identities[1].id);
  const ownerBefore = ownerState(f), secondBefore = account(f, 1);
  assert.equal((await f.reset(firstToken)).status, 303);
  assert.equal(account(f).revision, 2);
  assert.equal(account(f).hash, hashPassword('replacement8', account(f).salt));
  assert.equal(account(f).attempts, 0); assert.equal(account(f).blocked_until, 0);
  assert.deepEqual(ownerState(f), ownerBefore); assert.deepEqual(account(f, 1), secondBefore);
  assert.equal(await sessionStatus(f, ownerCookie), 204);
  assert.equal(await sessionStatus(f, secondCookie), 204);
  assert.equal(await sessionStatus(f, firstCookie), 401);
  assert.equal(await f.valid(ownerToken), true); assert.equal(await f.valid(secondToken), true);
  assert.equal((await f.provisionableStores(identities[0].username, identities[0].password, f.env, now)).status, 401);
  assert.equal((await f.provisionableStores(identities[0].username, 'replacement8', f.env, now)).status, 200);
  const firstBeforeReplay = account(f);
  assert.equal((await f.reset(firstToken, 'another-pass8')).status, 400);
  assert.deepEqual(account(f), firstBeforeReplay);
  assert.deepEqual(ownerState(f), ownerBefore);
  const firstBeforeOwner = account(f);
  assert.equal((await f.reset(ownerToken, 'owner-next8')).status, 303);
  assert.deepEqual(account(f), firstBeforeOwner); assert.deepEqual(account(f, 1), secondBefore);
});

for (const invalidation of ['expired', 'disabled', 'revision changed', 'deleted']) {
  test(`an extra admin token invalidated by ${invalidation} cannot reset the owner or another administrator`, async t => {
    const f = await fixture(t);
    await f.send(identities[0].username); const token = f.token();
    let timestamp = now;
    if (invalidation === 'expired') timestamp += 15 * 60 * 1000;
    if (invalidation === 'disabled') f.db.prepare('UPDATE panel_admin_accounts SET active=0 WHERE id=?').run(identities[0].id);
    if (invalidation === 'revision changed') f.db.prepare('UPDATE panel_admin_accounts SET revision=revision+1 WHERE id=?').run(identities[0].id);
    if (invalidation === 'deleted') f.db.prepare('DELETE FROM panel_admin_accounts WHERE id=?').run(identities[0].id);
    const before = { owner: ownerState(f), first: account(f), second: account(f, 1) };
    assert.equal(await f.valid(token, timestamp), false);
    assert.equal((await f.reset(token, 'replacement8', timestamp)).status, 400);
    assert.deepEqual({ owner: ownerState(f), first: account(f), second: account(f, 1) }, before);
    if (invalidation === 'deleted') assert.equal(extraTokens(f).length, 0, 'deleting the account cascades its separate tokens');
  });
}

test('even an artificial cross-table token collision cannot turn a disabled extra token into an owner recovery token', async t => {
  const f = await fixture(t);
  await f.send(identities[0].username); const token = f.token();
  f.db.prepare('INSERT INTO panel_password_recovery(token_hash,password_revision,expires_at) VALUES(?,1,?)').run(hashToken(token), now + 15 * 60 * 1000);
  f.db.prepare('UPDATE panel_admin_accounts SET active=0 WHERE id=?').run(identities[0].id);
  const before = ownerState(f);
  assert.equal(await f.valid(token), false);
  assert.equal((await f.reset(token)).status, 400);
  assert.deepEqual(ownerState(f), before);
});

test('concurrent links for one admin have one winner, but admins sharing a revision can reset independently', async t => {
  const f = await fixture(t);
  await f.send(identities[0].username); const first = f.token();
  await f.send(identities[0].username); const competing = f.token();
  await f.send(identities[1].username); const second = f.token();
  const before = ownerState(f);
  const results = await Promise.all([f.reset(first, 'first-next8'), f.reset(competing, 'first-other8'), f.reset(second, 'second-next8')]);
  assert.deepEqual(results.slice(0, 2).map(value => value.status).sort(), [303, 400]);
  assert.equal(results[2].status, 303);
  assert.equal(account(f).revision, 2); assert.equal(account(f, 1).revision, 2);
  assert.equal(extraTokens(f).filter(row => row.used_at !== null).length, 2);
  assert.deepEqual(ownerState(f), before);
});

test('failure consuming an extra token rolls back its password, revision and counter without changing the owner', async t => {
  const f = await fixture(t);
  await f.send(identities[0].username); const token = f.token();
  f.db.prepare('UPDATE panel_admin_accounts SET attempts=6,blocked_until=? WHERE id=?').run(now + 30000, identities[0].id);
  const before = { owner: ownerState(f), account: account(f), tokens: extraTokens(f) };
  f.db.exec("CREATE TRIGGER test_extra_consume_failure BEFORE UPDATE OF used_at ON panel_admin_password_recovery BEGIN SELECT RAISE(ABORT,'simulated transaction failure'); END;");
  await assert.rejects(f.reset(token), /simulated transaction failure/);
  assert.deepEqual({ owner: ownerState(f), account: account(f), tokens: extraTokens(f) }, before);
  assert.equal(await f.valid(token), true);
});

test('delivery quotas belong to each registered account without consuming the owner delivery quota', async t => {
  const f = await fixture(t);
  for (let index = 0; index < 6; index++) assert.equal((await f.send(identities[0].username, 'pt', { ip: '192.0.2.' + (index + 1) })).status, 200);
  assert.equal(f.sent.length, 5);
  assert.equal(f.db.prepare("SELECT * FROM panel_recovery_limits WHERE key='owner-email'").get(), undefined);
  await f.send(identities[1].username, 'pt', { ip: '192.0.2.100' });
  await f.send(ownerEmail, 'pt', { ip: '192.0.2.101' });
  assert.equal(f.sent.length, 7);
  assert.deepEqual(f.sent.at(-1).body.to, [ownerEmail]);
  assert.equal(f.db.prepare("SELECT attempts FROM panel_recovery_limits WHERE key='owner-email'").get().attempts, 1);
});

test('provider rejection in waitUntil removes only the failed extra token and preserves owner and other admin links', async t => {
  const f = await fixture(t), pending = [], logs = [];
  t.mock.method(console, 'error', (...values) => logs.push(values));
  await f.send(ownerEmail); const ownerToken = f.token();
  await f.send(identities[1].username); const secondToken = f.token();
  const before = ownerState(f), secondBefore = extraTokens(f);
  let finish;
  f.delivery.pending = new Promise(resolve => { finish = resolve; });
  assert.equal((await f.send(identities[0].username, 'pt', { context: { waitUntil: promise => pending.push(promise) } })).status, 200);
  assert.equal(extraTokens(f).length, 2);
  finish(new Response('private provider response', { status: 403 }));
  await pending[0];
  assert.deepEqual(extraTokens(f), secondBefore); assert.deepEqual(ownerState(f), before);
  assert.equal(await f.valid(ownerToken), true); assert.equal(await f.valid(secondToken), true);
  assert.deepEqual(logs, [['BistroHub password recovery email delivery failed', { provider: 'resend', httpStatus: 403 }]]);
});

test('Brevo uses the extra account registered email rather than the owner or the submitted casing', async t => {
  const f = await fixture(t);
  f.env.PASSWORD_RESET_PROVIDER = 'brevo'; f.env.BREVO_API_KEY = 'test-brevo-key';
  const before = ownerState(f);
  assert.equal((await f.send(identities[0].username.toUpperCase())).status, 200);
  assert.equal(f.sent[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.deepEqual(f.sent[0].body.to, [{ email: identities[0].username }]);
  assert.equal((await f.reset(f.token())).status, 303);
  assert.deepEqual(ownerState(f), before);
});
