const assert = require('node:assert/strict');
const { test } = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { createHash, pbkdf2Sync } = require('node:crypto');
const fs = require('node:fs');

const origin = 'https://example.com';
const start = Date.UTC(2026, 9, 10);
const minute = 60 * 1000;
const recipient = 'owner@example.com';
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const passwordHash = (password, salt) => pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');

async function fixture(t, initialRevision = 0) {
  const { adminResponse, provisionableStores, weeklyAdmin } = await import('../server/cloudflare/admin-auth.mjs');
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  for (const name of ['schema.sql', 'cloud-schema.sql', 'diagnostics-schema.sql', 'store-schema.sql']) {
    db.exec(fs.readFileSync('server/cloudflare/' + name, 'utf8'));
  }
  const statement = (sql, args = []) => ({
    sql, args,
    bind: (...values) => statement(sql, values),
    first: async () => db.prepare(sql).get(...args),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: db.prepare(sql).run(...args).changes } }),
  });
  // D1 serializes each batch as a transaction. No await may interleave another
  // test request between BEGIN and COMMIT on this shared SQLite connection.
  const batch = async statements => {
    db.exec('BEGIN');
    try {
      const results = statements.map(item => {
        const rows = db.prepare(item.sql).all(...item.args);
        return { results: rows, meta: { changes: db.prepare('SELECT changes() AS count').get().count } };
      });
      db.exec('COMMIT');
      return results;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  const env = {
    DB: { prepare: statement, batch },
    ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234',
    ADMIN_VIEW_TOKEN: 'old-owner-panel-password',
    ADMIN_PANEL_USER: recipient,
    RESEND_API_KEY: 'testkey',
    PASSWORD_RESET_FROM: 'onboarding@resend.dev',
    ADMIN_RECOVERY_EMAIL: recipient,
    PASSWORD_RESET_ORIGIN: origin,
  };
  const oldPassword = initialRevision ? 'old-owner8' : env.ADMIN_VIEW_TOKEN;
  if (initialRevision) {
    const salt = '1234567890abcdef1234567890abcdef';
    db.prepare('INSERT INTO panel_password(id,salt,hash,iterations,revision) VALUES(1,?,?,100000,?)')
      .run(salt, passwordHash(oldPassword, salt), initialRevision);
  }
  const sent = [];
  const fetchState = { response: null, fail: false, error: null };
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.ok(['https://api.resend.com/emails', 'https://api.brevo.com/v3/smtp/email'].includes(url), 'tests must never send real mail or call another network URL');
    assert.equal(options.method, 'POST');
    const brevo = url === 'https://api.brevo.com/v3/smtp/email';
    if (brevo) assert.equal(options.headers['api-key'], env.BREVO_API_KEY);
    else assert.equal(options.headers.Authorization, 'Bearer ' + env.RESEND_API_KEY);
    const payload = JSON.parse(options.body);
    sent.push({ ...payload, headers: options.headers, payload, url });
    if (fetchState.error) throw typeof fetchState.error === 'function' ? fetchState.error(payload, options) : fetchState.error;
    if (fetchState.fail === 'throw') throw new Error('mock provider unreachable');
    if (fetchState.response) return fetchState.response;
    return new Response(JSON.stringify(brevo ? { messageId: 'mock-brevo-message-id' } : { id: 'mock-email-id' }), { status: fetchState.fail ? 503 : brevo ? 201 : 200 });
  };
  t.after(() => { global.fetch = originalFetch; });
  const call = (path, now = start, options = {}, context) => adminResponse(new Request(origin + path, options), env, now, context);
  return { db, env, sent, fetchState, call, oldPassword, provisionableStores, weeklyAdmin };
}

function csrf(response) {
  const cookie = response.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_csrf='));
  assert.ok(cookie, 'every recovery form must get a CSRF cookie');
  return cookie.split(';')[0];
}
async function post(f, path, fields, now = start, options = {}, context) {
  const pagePath = path === '/admin/reset-password' ? path + '?token=' + (fields.token || '') : '/admin/recover';
  const cookie = options.cookie || csrf(await f.call(pagePath, now));
  const body = options.body ?? new URLSearchParams({ csrf: cookie.split('=')[1], ...fields });
  return f.call(path, now, {
    method: options.method || 'POST',
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': options.ip || '192.0.2.1', ...options.headers },
    body,
  }, context);
}
async function requestEmail(f, now = start, username = recipient, options = {}, context) {
  return post(f, '/admin/recover', { username }, now, options, context);
}
function emailedToken(f, index = f.sent.length - 1) {
  const message = f.sent[index];
  assert.ok(message, 'a mocked email must have been created');
  const match = (message.text ?? message.textContent).match(/https:\/\/example\.com\/admin\/reset-password\?token=([a-f0-9]{64})/);
  assert.ok(match, 'the email must use the fixed configured HTTPS origin and a 256-bit token');
  return match[1];
}
const reset = (f, token, password = 'newpass8', now = start, options = {}) => post(f, '/admin/reset-password', { token, newPassword: password, confirmPassword: password }, now, options);
const plain = value => value ? { ...value } : value;
const passwordState = f => plain(f.db.prepare('SELECT * FROM panel_password WHERE id=1').get());
const loginState = f => plain(f.db.prepare('SELECT attempts, blocked_until FROM panel_login WHERE id=1').get());
const tokens = f => f.db.prepare('SELECT * FROM panel_password_recovery ORDER BY token_hash').all().map(plain);
const state = f => ({ password: passwordState(f), login: loginState(f), tokens: tokens(f), limits: f.db.prepare('SELECT * FROM panel_recovery_limits ORDER BY key').all().map(plain) });
const resultMessage = markup => markup.match(/<p class="success" role="status"[^>]*>([^<]+)<\/p>/)?.[1];
async function login(f, password, now = start) {
  const cookie = csrf(await f.call('/admin', now));
  return f.call('/admin/login', now, {
    method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrf: cookie.split('=')[1], username: recipient, password }),
  });
}

test('owner login links to recovery; recovery and reset GETs protect URLs and do not consume tokens', async t => {
  const f = await fixture(t);
  const loginPage = await f.call('/admin');
  assert.match(await loginPage.text(), /href="\/admin\/recover"[^>]*>Esqueceu a senha\?/);
  const request = await requestEmail(f);
  assert.equal(request.status, 200);
  assert.ok(resultMessage(await request.text()));
  assert.deepEqual(f.sent[0].to, [recipient]);
  assert.equal(f.sent[0].from, f.env.PASSWORD_RESET_FROM);
  const token = emailedToken(f);
  assert.equal(f.sent[0].headers['Idempotency-Key'], 'bistro-reset-' + tokenHash(token));
  const row = tokens(f)[0];
  assert.equal(row.token_hash, tokenHash(token));
  assert.equal(row.password_revision, 0);
  assert.equal(row.expires_at, start + 15 * minute);
  assert.equal(row.used_at, null);
  assert.ok(!JSON.stringify(row).includes(token), 'D1 stores the token digest, never the raw secret');
  for (let count = 0; count < 3; count++) {
    const page = await f.call('/admin/reset-password?token=' + token);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('Cache-Control'), 'no-store');
    assert.equal(page.headers.get('Referrer-Policy'), 'same-origin');
    assert.match(page.headers.get('Content-Security-Policy'), /form-action 'self'/);
    assert.match(page.headers.get('Content-Security-Policy'), /connect-src 'self'/);
    assert.match(await page.text(), /name="newPassword"[^>]*minlength="8"/);
    assert.equal(tokens(f)[0].used_at, null);
    assert.equal(passwordState(f), undefined);
  }
});

for (const initialRevision of [0, 7]) {
  test(`reset works at password revision ${initialRevision}, revokes old sessions, and preserves tablet credentials and store data`, async t => {
    const f = await fixture(t, initialRevision);
    const oldLogin = await login(f, f.oldPassword);
    assert.equal(oldLogin.status, 303);
    const oldCookie = oldLogin.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_panel=')).split(';')[0];
    const weeklyBefore = await f.weeklyAdmin(f.env.ADMIN_PASSWORD_SECRET, start, 0, 'seabra-1');
    const storesBefore = f.db.prepare('SELECT * FROM stores ORDER BY id').all();
    const rotationsBefore = f.db.prepare('SELECT * FROM store_admin_rotation ORDER BY store_id').all();
    assert.equal((await requestEmail(f)).status, 200);
    const token = emailedToken(f);
    f.db.prepare('UPDATE panel_login SET attempts=9, blocked_until=? WHERE id=1').run(start + 60000);
    const response = await reset(f, token);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('Location'), '/admin?changed=1');
    assert.match(response.headers.get('Set-Cookie'), /__Host-comanda_panel=; Max-Age=0/);
    const saved = passwordState(f);
    assert.equal(saved.revision, initialRevision + 1);
    assert.equal(saved.iterations, 100000);
    assert.equal(saved.hash, passwordHash('newpass8', saved.salt));
    assert.equal(tokens(f)[0].used_at, start);
    assert.deepEqual(loginState(f), { attempts: 0, blocked_until: 0 });
    assert.equal((await f.call('/admin/session', start + 1, { headers: { Cookie: oldCookie } })).status, 401);
    assert.equal((await f.provisionableStores(recipient, f.oldPassword, f.env, start + 1)).status, 401);
    assert.equal((await f.provisionableStores(recipient, 'newpass8', f.env, start + 1)).status, 200);
    assert.equal((await login(f, 'newpass8', start + 1)).status, 303);
    assert.deepEqual(await f.weeklyAdmin(f.env.ADMIN_PASSWORD_SECRET, start, 0, 'seabra-1'), weeklyBefore);
    assert.deepEqual(f.db.prepare('SELECT * FROM stores ORDER BY id').all(), storesBefore);
    assert.deepEqual(f.db.prepare('SELECT * FROM store_admin_rotation ORDER BY store_id').all(), rotationsBefore);
  });
}

test('password length and confirmation are enforced before mutation and leave the token usable', async t => {
  const f = await fixture(t, 3);
  await requestEmail(f);
  const token = emailedToken(f), before = state(f);
  for (const [password, confirmation] of [['short77', 'short77'], ['newpass8', 'different8'], ['x'.repeat(257), 'x'.repeat(257)]]) {
    const response = await post(f, '/admin/reset-password', { token, newPassword: password, confirmPassword: confirmation });
    assert.equal(response.status, 400);
    const markup = await response.text();
    assert.ok(!markup.includes('value="' + password + '"'), 'a password must never be echoed into a form');
    assert.deepEqual(state(f), before);
  }
  assert.equal((await reset(f, token, 'newpass8')).status, 303, 'exactly eight characters are sufficient');
});

test('tokens expire at the fifteen-minute boundary and malformed or unknown tokens cannot change credentials', async t => {
  const f = await fixture(t, 2);
  await requestEmail(f);
  const token = emailedToken(f), before = passwordState(f), used = tokens(f)[0].used_at;
  assert.equal((await f.call('/admin/reset-password?token=' + token, start + 15 * minute - 1)).status, 200);
  assert.equal((await f.call('/admin/reset-password?token=' + token, start + 15 * minute)).status, 400);
  assert.equal((await reset(f, token, 'newpass8', start + 15 * minute)).status, 400);
  for (const invalid of ['not-a-token', '1'.repeat(64), 'f'.repeat(63), 'F'.repeat(64)]) {
    assert.equal((await f.call('/admin/reset-password?token=' + invalid)).status, 400);
    assert.equal((await reset(f, invalid)).status, 400);
  }
  assert.deepEqual(passwordState(f), before);
  assert.equal(tokens(f)[0].used_at, used);
});

test('a used token cannot reset again or erase failures recorded after the successful reset, even at the same timestamp', async t => {
  const f = await fixture(t);
  await requestEmail(f);
  const token = emailedToken(f);
  assert.equal((await reset(f, token)).status, 303);
  f.db.prepare('UPDATE panel_login SET attempts=2,blocked_until=0 WHERE id=1').run();
  const before = passwordState(f);
  assert.equal((await reset(f, token, 'another8')).status, 400);
  assert.deepEqual(passwordState(f), before);
  assert.deepEqual(loginState(f), { attempts: 2, blocked_until: 0 });
  assert.equal(tokens(f)[0].used_at, start);
  assert.equal((await f.call('/admin/reset-password?token=' + token)).status, 400);
});

for (const sameToken of [true, false]) {
  test(`concurrent resets with ${sameToken ? 'the same token' : 'different tokens for the same revision'} have one winner`, async t => {
    const f = await fixture(t, 4);
    await requestEmail(f);
    const first = emailedToken(f);
    if (!sameToken) await requestEmail(f);
    const second = sameToken ? first : emailedToken(f);
    f.db.prepare('UPDATE panel_login SET attempts=6,blocked_until=? WHERE id=1').run(start + 30000);
    const passwords = ['winner-8-a', 'winner-8-b'];
    const responses = await Promise.all([reset(f, first, passwords[0]), reset(f, second, passwords[1])]);
    assert.deepEqual(responses.map(response => response.status).sort(), [303, 400]);
    const winner = responses.findIndex(response => response.status === 303), saved = passwordState(f);
    assert.equal(saved.revision, 5);
    assert.equal(saved.hash, passwordHash(passwords[winner], saved.salt));
    assert.equal(tokens(f).filter(row => row.used_at !== null).length, 1);
    assert.deepEqual(loginState(f), { attempts: 0, blocked_until: 0 });
    assert.equal((await f.provisionableStores(recipient, passwords[winner], f.env, start)).status, 200);
    if (!sameToken) assert.equal((await f.call('/admin/reset-password?token=' + [first, second][1 - winner])).status, 400);
  });
}

test('a failure consuming the token rolls back the password, revision, and login counter', async t => {
  const f = await fixture(t, 6);
  await requestEmail(f);
  const token = emailedToken(f);
  f.db.prepare('UPDATE panel_login SET attempts=3,blocked_until=0 WHERE id=1').run();
  const before = { password: passwordState(f), login: loginState(f), tokens: tokens(f) };
  f.db.exec("CREATE TRIGGER test_recovery_failure BEFORE UPDATE OF used_at ON panel_password_recovery BEGIN SELECT RAISE(ABORT, 'simulated D1 failure'); END;");
  assert.equal((await reset(f, token)).status, 503);
  assert.deepEqual({ password: passwordState(f), login: loginState(f), tokens: tokens(f) }, before);
  assert.equal((await f.call('/admin/reset-password?token=' + token)).status, 200);
});

test('cross-origin requests, CSRF failures, duplicate keys, invalid types, and oversized bodies never mutate recovery data', async t => {
  const f = await fixture(t, 5);
  await requestEmail(f);
  const token = emailedToken(f), cookie = csrf(await f.call('/admin/reset-password?token=' + token));
  const fields = { token, newPassword: 'newpass8', confirmPassword: 'newpass8' }, before = state(f);
  const cases = [
    { headers: { Origin: 'https://attacker.example' }, expected: 403 },
    { headers: { Origin: 'null' }, expected: 403 },
    { headers: { Origin: '' }, expected: 403 },
    { headers: { Cookie: '' }, expected: 403 },
    { body: new URLSearchParams({ csrf: 'wrong-csrf', ...fields }), expected: 403 },
    { body: new URLSearchParams([['csrf', cookie.split('=')[1]], ...Object.entries(fields), ['token', token]]), expected: 400 },
    { body: new URLSearchParams({ csrf: cookie.split('=')[1], ...fields, extra: 'unexpected' }), expected: 400 },
    { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields), expected: 400 },
    { body: 'csrf=' + cookie.split('=')[1] + '&padding=' + 'x'.repeat(5000), expected: 413 },
    { method: 'PUT', expected: 405 },
  ];
  for (const item of cases) {
    const response = await post(f, '/admin/reset-password', fields, start, { cookie, ...item });
    assert.equal(response.status, item.expected);
    assert.deepEqual(state(f), before);
  }
  const requestCookie = csrf(await f.call('/admin/recover'));
  for (const item of cases.filter(item => !item.body)) {
    const response = await post(f, '/admin/recover', { username: recipient }, start, { cookie: requestCookie, ...item });
    assert.equal(response.status, item.expected);
    assert.deepEqual(state(f), before);
  }
});

test('unknown users receive the same generic response without sending email or consuming the owner email quota', async t => {
  const f = await fixture(t);
  const unknown = await requestEmail(f, start, 'not-the-owner@example.com');
  assert.equal(unknown.status, 200);
  const generic = resultMessage(await unknown.text());
  assert.ok(generic);
  assert.equal(f.sent.length, 0);
  assert.equal(tokens(f).length, 0);
  assert.equal(f.db.prepare("SELECT * FROM panel_recovery_limits WHERE key='owner-email'").get(), undefined);
  const known = await requestEmail(f, start, '  OWNER@EXAMPLE.COM  ');
  assert.equal(known.status, 200);
  assert.equal(resultMessage(await known.text()), generic);
  assert.equal(f.sent.length, 1);
  assert.equal(f.db.prepare("SELECT attempts FROM panel_recovery_limits WHERE key='owner-email'").get().attempts, 1);
});

test('provider HTTP and network failures remove the pending token without exposing account existence or provider details', async t => {
  const f = await fixture(t);
  const logs = [];
  t.mock.method(console, 'error', (...values) => logs.push(values));
  const unknown = await requestEmail(f, start, 'unknown@example.com');
  const generic = resultMessage(await unknown.text());
  for (const mode of [true, 'throw']) {
    f.fetchState.fail = mode;
    const response = await requestEmail(f);
    assert.equal(response.status, 200);
    const markup = await response.text();
    assert.equal(resultMessage(markup), generic);
    assert.ok(!markup.includes('mock provider'));
    assert.equal(tokens(f).length, 0);
    assert.equal(passwordState(f), undefined);
    assert.deepEqual(loginState(f), { attempts: 0, blocked_until: 0 });
  }
  assert.deepEqual(logs, [
    ['BistroHub password recovery email delivery failed', { provider: 'resend', httpStatus: 503 }],
    ['BistroHub password recovery email delivery failed', { provider: 'resend', httpStatus: null }],
  ]);
});

test('waitUntil sends email in the delivery context without blocking the generic HTTP response', async t => {
  const f = await fixture(t), pending = [];
  let completeDelivery;
  f.fetchState.response = new Promise(resolve => { completeDelivery = resolve; });
  const response = await requestEmail(f, start, recipient, {}, { waitUntil: promise => pending.push(promise) });
  assert.equal(response.status, 200);
  assert.equal(pending.length, 1);
  assert.equal(f.sent.length, 1);
  assert.equal(tokens(f).length, 1);
  completeDelivery(new Response(JSON.stringify({ id: 'mock-background-email' }), { status: 200 }));
  await pending[0];
  assert.equal(tokens(f).length, 1);
  assert.equal((await f.call('/admin/reset-password?token=' + emailedToken(f))).status, 200);
});

test('missing or invalid recovery configuration disables the form and rejects all identifiers consistently without mutation', async t => {
  const f = await fixture(t);
  const valid = { ...f.env };
  const invalid = [
    { RESEND_API_KEY: '' }, { ADMIN_RECOVERY_EMAIL: 'invalid-email' }, { PASSWORD_RESET_FROM: 'invalid-email' },
    { PASSWORD_RESET_ORIGIN: 'http://example.com' }, { PASSWORD_RESET_ORIGIN: 'https://example.com/path' },
    { PASSWORD_RESET_ORIGIN: 'https://user:pass@example.com' }, { PASSWORD_RESET_ORIGIN: 'https://example.com/?x=1' },
  ];
  for (const changes of invalid) {
    Object.assign(f.env, valid, changes);
    const before = state(f), page = await f.call('/admin/recover');
    assert.match(await page.text(), /type="submit" disabled/);
    for (const username of [recipient, 'unknown@example.com']) {
      assert.equal((await requestEmail(f, start, username)).status, 503);
      assert.deepEqual(state(f), before);
    }
  }
  assert.equal(f.sent.length, 0);
});

test('request rate limits atomically allow five emails per IP per fifteen minutes and reset at the boundary', async t => {
  const f = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 12 }, () => requestEmail(f)));
  assert.equal(responses.filter(response => response.status === 200).length, 5);
  assert.equal(responses.filter(response => response.status === 429).length, 7);
  assert.equal(f.sent.length, 5);
  const limits = f.db.prepare('SELECT * FROM panel_recovery_limits').all();
  assert.equal(limits.find(row => row.key === 'owner-email').attempts, 5);
  const ip = limits.find(row => row.key !== 'owner-email');
  assert.match(ip.key, /^[a-f0-9]{64}$/);
  assert.equal(ip.attempts, 5);
  assert.equal(ip.reset_at, start + 15 * minute);
  assert.equal((await requestEmail(f, start + 15 * minute - 1)).status, 429);
  assert.equal((await requestEmail(f, start + 15 * minute)).status, 200);
  assert.equal(f.sent.length, 5, 'the independent hourly global quota still applies');
  assert.equal(f.db.prepare('SELECT attempts FROM panel_recovery_limits WHERE key=?').get(ip.key).attempts, 1);
  assert.equal((await requestEmail(f, start + 60 * minute)).status, 200);
  assert.equal(f.sent.length, 6);
});

test('the global owner email quota is atomic across different IPs and does not reveal a throttled account', async t => {
  const f = await fixture(t);
  const responses = await Promise.all(Array.from({ length: 12 }, (_, index) => requestEmail(f, start, recipient, { ip: '192.0.2.' + (index + 1) })));
  assert.ok(responses.every(response => response.status === 200));
  const messages = await Promise.all(responses.map(async response => resultMessage(await response.text())));
  assert.ok(messages[0]);
  assert.ok(messages.every(message => message === messages[0]));
  assert.equal(f.sent.length, 5);
  assert.equal(tokens(f).length, 5);
  assert.equal(f.db.prepare("SELECT attempts FROM panel_recovery_limits WHERE key='owner-email'").get().attempts, 5);
  assert.equal((await requestEmail(f, start + 60 * minute, recipient, { ip: '192.0.2.200' })).status, 200);
  assert.equal(f.sent.length, 6);
});

test('reset abuse is independently limited to ten attempts per IP per fifteen minutes without touching the login cooldown', async t => {
  const f = await fixture(t, 1), before = passwordState(f);
  f.db.prepare('UPDATE panel_login SET attempts=2,blocked_until=0 WHERE id=1').run();
  const responses = await Promise.all(Array.from({ length: 15 }, () => reset(f, '1'.repeat(64))));
  assert.equal(responses.filter(response => response.status === 400).length, 10);
  assert.equal(responses.filter(response => response.status === 429).length, 5);
  assert.deepEqual(passwordState(f), before);
  assert.deepEqual(loginState(f), { attempts: 2, blocked_until: 0 });
  assert.equal((await reset(f, '1'.repeat(64), 'newpass8', start + 15 * minute)).status, 400);
  assert.deepEqual(passwordState(f), before);
  assert.deepEqual(loginState(f), { attempts: 2, blocked_until: 0 });
});

test('a configured recovery email is a case-insensitive login alias for the default admin account, including legacy and reset passwords', async t => {
  const f = await fixture(t);
  delete f.env.ADMIN_PANEL_USER;
  for (const username of ['admin', recipient, 'OWNER@EXAMPLE.COM']) {
    assert.equal((await f.provisionableStores(username, f.oldPassword, f.env, start)).status, 200);
  }
  assert.equal((await f.provisionableStores('someone@example.com', f.oldPassword, f.env, start)).status, 401);
  const oldLogin = await login(f, f.oldPassword);
  assert.equal(oldLogin.status, 303);
  const oldCookie = oldLogin.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_panel=')).split(';')[0];
  assert.equal((await f.call('/admin/session', start, { headers: { Cookie: oldCookie } })).status, 204);
  assert.equal((await requestEmail(f, start, 'admin')).status, 200);
  assert.equal((await reset(f, emailedToken(f))).status, 303);
  assert.equal((await f.call('/admin/session', start, { headers: { Cookie: oldCookie } })).status, 401);
  for (const username of ['admin', recipient, 'OWNER@EXAMPLE.COM']) {
    assert.equal((await f.provisionableStores(username, 'newpass8', f.env, start)).status, 200);
    assert.equal((await f.provisionableStores(username, f.oldPassword, f.env, start)).status, 401);
  }
  assert.equal((await login(f, 'newpass8')).status, 303);
  assert.equal((await f.provisionableStores('someone@example.com', 'newpass8', f.env, start)).status, 401);
  assert.equal((await f.provisionableStores('admin', 'newpass8', f.env, start)).status, 200);
});

const configureBrevo = f => {
  f.env.PASSWORD_RESET_PROVIDER = 'brevo';
  f.env.BREVO_API_KEY = 'test-brevo-key';
  f.env.PASSWORD_RESET_FROM = 'verified-sender@gmail.com';
};

for (const provider of [undefined, 'resend']) {
  test(`${provider === undefined ? 'default' : 'explicit'} Resend selection ignores a configured Brevo key`, async t => {
    const f = await fixture(t);
    f.env.PASSWORD_RESET_PROVIDER = provider;
    f.env.BREVO_API_KEY = 'other-provider-key';
    assert.equal((await requestEmail(f)).status, 200);
    assert.equal(f.sent.length, 1);
    assert.equal(f.sent[0].url, 'https://api.resend.com/emails');
    assert.equal(f.sent[0].headers.Authorization, 'Bearer testkey');
    assert.equal(f.sent[0].headers['api-key'], undefined);
    assert.deepEqual(f.sent[0].payload.to, [recipient]);
    assert.ok(!JSON.stringify(f.sent).includes(f.env.BREVO_API_KEY));
  });
}

test('Brevo sends the original registered recipient using its own key, fixed REST contract and all three email languages', async t => {
  const f = await fixture(t);
  configureBrevo(f);
  delete f.env.RESEND_API_KEY;
  const languages = {
    pt: ['Redefinição de senha · BistroHub', 'Use este link para redefinir a senha do painel BistroHub:', 'O link expira em 15 minutos e pode ser usado uma única vez.'],
    en: ['Password reset · BistroHub', 'Use this link to reset your BistroHub portal password:', 'The link expires in 15 minutes and can only be used once.'],
    es: ['Restablecimiento de contraseña · BistroHub', 'Utiliza este enlace para restablecer tu contraseña del portal BistroHub:', 'El enlace caduca en 15 minutos y solo se puede utilizar una vez.'],
  };
  for (const [language, [subject, introduction, expiry]] of Object.entries(languages)) {
    const response = await requestEmail(f, start, recipient, { headers: { 'Accept-Language': language } });
    assert.equal(response.status, 200);
    const sent = f.sent.at(-1), token = emailedToken(f);
    assert.equal(sent.url, 'https://api.brevo.com/v3/smtp/email');
    assert.deepEqual(sent.headers, { 'api-key': 'test-brevo-key', 'Content-Type': 'application/json', Accept: 'application/json' });
    assert.deepEqual(sent.payload.sender, { email: 'verified-sender@gmail.com', name: 'BistroHub' });
    assert.deepEqual(sent.payload.to, [{ email: recipient }]);
    assert.equal(sent.payload.subject, subject);
    assert.ok(sent.payload.textContent.startsWith(introduction + '\n\n'));
    assert.ok(sent.payload.textContent.includes(expiry));
    assert.deepEqual(sent.payload.headers, { 'Idempotency-Key': 'bistro-reset-' + tokenHash(token) });
    assert.equal(sent.payload.htmlContent, undefined);
    assert.equal(sent.payload.templateId, undefined);
    assert.equal(tokens(f).find(row => row.token_hash === tokenHash(token)).used_at, null);
  }
  assert.equal(f.sent.length, 3);
});

test('a token delivered through Brevo completes the actual password reset and revokes the existing owner session', async t => {
  const f = await fixture(t, 5);
  configureBrevo(f);
  const oldLogin = await login(f, f.oldPassword);
  assert.equal(oldLogin.status, 303);
  const oldCookie = oldLogin.headers.getSetCookie().find(value => value.startsWith('__Host-comanda_panel=')).split(';')[0];
  const unknown = await requestEmail(f, start, 'unknown@example.com');
  const generic = resultMessage(await unknown.text());
  assert.equal(f.sent.length, 0);
  const known = await requestEmail(f);
  assert.equal(resultMessage(await known.text()), generic);
  const token = emailedToken(f);
  f.db.prepare('UPDATE panel_login SET attempts=6,blocked_until=? WHERE id=1').run(start + 30000);
  assert.equal((await reset(f, token)).status, 303);
  assert.equal(passwordState(f).revision, 6);
  assert.deepEqual(loginState(f), { attempts: 0, blocked_until: 0 });
  assert.equal((await f.call('/admin/session', start, { headers: { Cookie: oldCookie } })).status, 401);
  assert.equal((await f.provisionableStores(recipient, 'newpass8', f.env, start)).status, 200);
  assert.equal((await login(f, 'newpass8')).status, 303);
  assert.equal((await reset(f, token, 'another8')).status, 400);
  assert.equal(f.sent.length, 1, 'reset and login never resend a recovery email');
  assert.equal(f.env.ADMIN_RECOVERY_EMAIL, recipient);
});

test('unknown or malformed providers and a missing selected key remain unavailable without using the other provider', async t => {
  const f = await fixture(t);
  const cases = [
    { provider: 'other', resend: 'testkey', brevo: 'test-brevo-key' },
    { provider: '', resend: 'testkey', brevo: 'test-brevo-key' },
    { provider: 'BREVO', resend: 'testkey', brevo: 'test-brevo-key' },
    { provider: ' brevo ', resend: 'testkey', brevo: 'test-brevo-key' },
    { provider: null, resend: 'testkey', brevo: 'test-brevo-key' },
    { provider: true, resend: 'testkey', brevo: 'test-brevo-key' },
    { provider: { toString: () => 'brevo' }, resend: 'testkey', brevo: 'test-brevo-key' },
    { provider: 'brevo', resend: 'testkey', brevo: undefined },
    { provider: 'brevo', resend: 'testkey', brevo: '   ' },
    { provider: 'brevo', resend: 'testkey', brevo: { value: 'test-brevo-key' } },
    { provider: 'resend', resend: undefined, brevo: 'test-brevo-key' },
    { provider: undefined, resend: undefined, brevo: 'test-brevo-key' },
  ];
  for (const item of cases) {
    f.env.PASSWORD_RESET_PROVIDER = item.provider;
    f.env.RESEND_API_KEY = item.resend;
    f.env.BREVO_API_KEY = item.brevo;
    const before = state(f);
    assert.match(await (await f.call('/admin/recover')).text(), /type="submit" disabled/);
    assert.equal((await requestEmail(f)).status, 503);
    assert.deepEqual(state(f), before);
    assert.equal(f.sent.length, 0);
  }
});

for (const provider of ['resend', 'brevo']) {
  for (const failure of ['rejected', 'network']) {
    test(`${provider} ${failure} failure cleans up once without fallback or disclosing sensitive provider data`, async t => {
      const f = await fixture(t), logs = [];
      configureBrevo(f);
      f.env.PASSWORD_RESET_PROVIDER = provider;
      t.mock.method(console, 'error', (...values) => logs.push(values));
      const privateContent = 'private-provider-detail ' + recipient + ' testkey test-brevo-key https://example.com/admin/reset-password?token=' + 'f'.repeat(64);
      if (failure === 'rejected') f.fetchState.response = new Response(privateContent, { status: 429, headers: { 'X-Sensitive-Diagnostic': privateContent } });
      else f.fetchState.error = (payload, options) => new Error(privateContent + JSON.stringify({ payload, headers: options.headers }));
      const response = await requestEmail(f);
      assert.equal(response.status, 200);
      const markup = await response.text();
      assert.ok(resultMessage(markup));
      assert.ok(!markup.includes('private-provider-detail'));
      assert.equal(f.sent.length, 1);
      assert.equal(f.sent[0].url, provider === 'brevo' ? 'https://api.brevo.com/v3/smtp/email' : 'https://api.resend.com/emails');
      assert.equal(tokens(f).length, 0);
      assert.equal(passwordState(f), undefined);
      assert.deepEqual(loginState(f), { attempts: 0, blocked_until: 0 });
      assert.deepEqual(logs, [['BistroHub password recovery email delivery failed', { provider, httpStatus: failure === 'rejected' ? 429 : null }]]);
      const logged = JSON.stringify(logs);
      for (const sensitive of [recipient, f.env.PASSWORD_RESET_FROM, f.env.RESEND_API_KEY, f.env.BREVO_API_KEY, emailedToken(f), tokenHash(emailedToken(f)), privateContent]) {
        assert.ok(!logged.includes(sensitive), 'operational logs must contain no recipient, credentials, token, digest or provider detail');
      }
    });
  }
}

test('Brevo delivery in waitUntil returns immediately and still cleans up a rejection without retry or fallback', async t => {
  const f = await fixture(t), pending = [], logs = [];
  configureBrevo(f);
  t.mock.method(console, 'error', (...values) => logs.push(values));
  let completeDelivery;
  f.fetchState.response = new Promise(resolve => { completeDelivery = resolve; });
  const response = await requestEmail(f, start, recipient, {}, { waitUntil: promise => pending.push(promise) });
  assert.equal(response.status, 200);
  assert.equal(pending.length, 1);
  assert.equal(f.sent.length, 1);
  assert.equal(tokens(f).length, 1);
  completeDelivery(new Response('private rejection detail', { status: 403 }));
  await pending[0];
  assert.equal(f.sent.length, 1);
  assert.equal(tokens(f).length, 0);
  assert.deepEqual(logs, [['BistroHub password recovery email delivery failed', { provider: 'brevo', httpStatus: 403 }]]);
});
