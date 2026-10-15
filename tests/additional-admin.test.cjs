const assert = require('node:assert/strict');
const { test } = require('node:test');
const { pbkdf2Sync, randomBytes, randomUUID } = require('node:crypto');
const { fixture } = require('./helpers/business-fixture.cjs');

const origin = 'https://example.com';
const panelCookie = '__Host-comanda_panel';
const extraPassword = 'Additional-password-123';
const extraUsername = 'additional-admin@example.com';
const digest = (password, salt, iterations = 100000) => pbkdf2Sync(password, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');

function remember(jar, response) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], index = pair.indexOf('=');
    if (/Max-Age=0(?:;|$)/.test(cookie)) jar.delete(pair.slice(0, index));
    else jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function setup(t) {
  const f = await fixture(t);
  f.env.ADMIN_PANEL_USER = 'primary-admin@example.com';
  f.env.ADMIN_RECOVERY_EMAIL = 'recovery-admin@example.com';
  const addAccount = (username = extraUsername, password = extraPassword) => {
    const id = randomUUID(), salt = randomBytes(16).toString('hex');
    f.db.prepare('INSERT INTO panel_admin_accounts(id, username, salt, hash) VALUES(?, ?, ?, ?)').run(id, username, salt, digest(password, salt));
    return id;
  };
  const extraId = addAccount();
  const account = (id = extraId) => f.db.prepare('SELECT * FROM panel_admin_accounts WHERE id = ?').get(id);
  const ownerPreference = () => f.db.prepare('SELECT language FROM panel_preferences WHERE id = 1').get()?.language;
  const browser = (initialCookies = new Map()) => {
    const jar = new Map(initialCookies);
    const request = async (path, options = {}, now) => {
      const response = await f.adminResponse(new Request(origin + path, {
        ...options,
        headers: { Cookie: [...jar].map(([name, value]) => name + '=' + value).join('; '), Origin: origin, ...options.headers },
      }), f.env, now);
      remember(jar, response);
      return response;
    };
    const json = (path, body, headers = {}) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    const login = async (username = extraUsername, password = extraPassword, now) => {
      jar.delete(panelCookie);
      await request('/admin', {}, now);
      assert.ok(jar.get('__Host-comanda_csrf'));
      return request('/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password, csrf: jar.get('__Host-comanda_csrf') }),
      }, now);
    };
    return { jar, request, json, login };
  };
  const owner = browser();
  assert.equal((await owner.login(f.env.ADMIN_PANEL_USER, f.env.ADMIN_VIEW_TOKEN)).status, 303);
  return { ...f, extraId, account, addAccount, ownerPreference, browser, owner };
}

function sessionIdentity(browser) {
  const value = browser.jar.get(panelCookie);
  assert.ok(value, 'Authenticated response must retain the panel session cookie');
  return JSON.parse(Buffer.from(value.split('.')[0], 'hex').toString('utf8'));
}

test('additional administrator has an independent password and case-insensitive email while both owner aliases remain valid', async t => {
  const f = await setup(t), extra = f.browser();
  assert.equal((await extra.login('ADDITIONAL-ADMIN@EXAMPLE.COM')).status, 303);
  assert.equal(sessionIdentity(extra).accountId, f.extraId);
  assert.equal((await extra.request('/admin/session')).status, 204);
  for (const username of [f.env.ADMIN_PANEL_USER, f.env.ADMIN_RECOVERY_EMAIL]) {
    assert.equal((await f.browser().login(username, f.env.ADMIN_VIEW_TOKEN)).status, 303);
    assert.equal((await f.browser().login(username, extraPassword)).status, 401);
  }
  assert.equal((await f.browser().login(extraUsername, f.env.ADMIN_VIEW_TOKEN)).status, 401);
  assert.equal((await extra.login()).status, 303);
  assert.equal(f.account().username, extraUsername);
  assert.notEqual(f.account().hash, extraPassword);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM panel_admin_accounts').get().count, 1);
});

test('additional administrator reaches groups before locations and can manage groups, locations and manager users', async t => {
  const f = await setup(t), extra = f.browser();
  assert.equal((await extra.login()).status, 303);
  const root = await extra.request('/admin'); assert.equal(root.status, 200);
  const markup = await root.text();
  assert.match(markup, /selectedGroupId="",hasStore=false/);
  assert.match(markup, /selected:"groups"/);
  assert.ok(!markup.includes('store-picker'));
  assert.equal((await extra.request('/admin/gestores')).status, 200);
  const created = await extra.json('/admin/manager-clients', { name: 'Additional admin group', active: true, storeIds: [] });
  assert.equal(created.status, 201); const group = (await created.json()).client;
  const location = await extra.json('/admin/stores', { name: 'Additional admin location', groupId: group.id, modules: { cash: true, preorders: true, customers: true, preparation: true } });
  assert.equal(location.status, 201); const store = await location.json();
  assert.deepEqual(store.modules, { cash: true, preorders: true, customers: true, preparation: true });
  const listed = await extra.request('/admin/stores?groupId=' + group.id);
  assert.equal(listed.status, 200); assert.deepEqual((await listed.json()).map(item => item.id), [store.id]);
  assert.equal((await extra.request('/admin?groupId=' + group.id + '&storeId=' + store.id)).status, 200);
  assert.equal((await extra.request('/admin/gestores?groupId=' + group.id)).status, 200);
  const manager = await extra.json('/admin/manager-users', { clientId: group.id, username: 'test-manager', name: 'Test manager', password: 'Manager-password-123', active: true });
  assert.equal(manager.status, 201);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM manager_users').get().count, 1);
  const directory = await extra.request('/admin/manager-clients'); assert.equal(directory.status, 200);
  assert.ok((await directory.json()).clients.some(item => item.id === group.id));
});

test('session renewals preserve the additional account identity and owner password changes do not revoke it', async t => {
  const f = await setup(t), extra = f.browser();
  assert.equal((await extra.login()).status, 303);
  const ownerChange = await f.owner.json('/admin/change-password', { currentPassword: f.env.ADMIN_VIEW_TOKEN, newPassword: 'New-owner-password-123', confirmPassword: 'New-owner-password-123' });
  assert.equal(ownerChange.status, 200);
  for (const path of ['/admin/session', '/admin', '/admin/stores', '/admin/session']) {
    const response = await extra.request(path);
    assert.equal(response.status, path === '/admin/session' ? 204 : 200);
    assert.equal(sessionIdentity(extra).accountId, f.extraId, 'Renewal must not switch additional administrator to the owner');
  }
  assert.equal((await extra.login()).status, 303);
  assert.equal((await f.browser().login(f.env.ADMIN_PANEL_USER, 'New-owner-password-123')).status, 303);
  assert.equal((await f.browser().login(f.env.ADMIN_RECOVERY_EMAIL, 'New-owner-password-123')).status, 303);
});

test('tablet provisioning accepts the additional administrator independently and returns the same active locations as the owner', async t => {
  const f = await setup(t);
  f.db.prepare("UPDATE stores SET active = 0 WHERE id = 'seabra-2'").run();
  const owner = await f.call('/provision', { username: f.env.ADMIN_PANEL_USER, password: f.env.ADMIN_VIEW_TOKEN });
  assert.equal(owner.status, 200); const expected = await owner.json();
  const extra = await f.call('/provision', { username: 'ADDITIONAL-ADMIN@EXAMPLE.COM', password: extraPassword });
  assert.equal(extra.status, 200); assert.deepEqual(await extra.json(), expected);
  assert.deepEqual(expected.stores.map(item => item.id), ['seabra-1']);
  const wrong = await f.call('/provision', { username: extraUsername, password: f.env.ADMIN_VIEW_TOKEN });
  assert.equal(wrong.status, 401); assert.equal((await wrong.json()).error, 'BAD_LOGIN');
});

test('additional password change enforces current password, confirmation, eight characters and same-origin without altering any account on failure', async t => {
  const f = await setup(t), extra = f.browser(); await extra.login();
  const previous = { ...f.account() }, ownerState = f.db.prepare('SELECT * FROM panel_password WHERE id = 1').get();
  const change = (newPassword, confirmPassword = newPassword, currentPassword = extraPassword, headers = {}) => extra.json('/admin/change-password', { currentPassword, newPassword, confirmPassword }, headers);
  assert.equal((await change('1234567')).status, 400);
  assert.equal((await change('12345678', 'different')).status, 400);
  assert.equal((await change('12345678', '12345678', 'wrong-current-password')).status, 403);
  assert.equal((await change('12345678', '12345678', f.env.ADMIN_VIEW_TOKEN)).status, 403);
  assert.equal((await change('12345678', '12345678', extraPassword, { Origin: 'https://foreign.example' })).status, 403);
  assert.deepEqual({ ...f.account() }, previous);
  assert.deepEqual(f.db.prepare('SELECT * FROM panel_password WHERE id = 1').get(), ownerState);
  assert.equal((await extra.request('/admin/session')).status, 204);
  assert.equal((await f.owner.request('/admin/session')).status, 204);
});

test('changing an additional password revokes all its sessions while owner aliases and another administrator stay unchanged', async t => {
  const f = await setup(t), extra = f.browser(), secondSession = f.browser(), other = f.browser();
  const otherId = f.addAccount('other-admin@example.com', 'Other-password-123');
  await extra.login(); await secondSession.login(); await other.login('other-admin@example.com', 'Other-password-123');
  const revoked = f.browser(extra.jar), previous = { ...f.account() }, otherBefore = { ...f.account(otherId) };
  const ownerBefore = f.db.prepare('SELECT * FROM panel_password WHERE id = 1').get();
  const response = await extra.json('/admin/change-password', { currentPassword: extraPassword, newPassword: '12345678', confirmPassword: '12345678' });
  assert.equal(response.status, 200); assert.equal(extra.jar.has(panelCookie), false);
  const saved = f.account(); assert.equal(saved.revision, previous.revision + 1); assert.notEqual(saved.salt, previous.salt);
  assert.equal(saved.hash, digest('12345678', saved.salt, saved.iterations));
  assert.deepEqual(f.db.prepare('SELECT * FROM panel_password WHERE id = 1').get(), ownerBefore);
  assert.deepEqual({ ...f.account(otherId) }, otherBefore);
  for (const browser of [revoked, secondSession]) assert.equal((await browser.request('/admin/session')).status, 401);
  assert.equal((await f.owner.request('/admin/session')).status, 204);
  assert.equal((await other.request('/admin/session')).status, 204);
  assert.equal((await f.browser().login(extraUsername, extraPassword)).status, 401);
  assert.equal((await f.browser().login(extraUsername, '12345678')).status, 303);
  for (const username of [f.env.ADMIN_PANEL_USER, f.env.ADMIN_RECOVERY_EMAIL]) assert.equal((await f.browser().login(username, f.env.ADMIN_VIEW_TOKEN)).status, 303);
});

test('disabled additional account immediately loses panel and tablet access without revoking the owner', async t => {
  const f = await setup(t), extra = f.browser(); await extra.login();
  f.db.prepare('UPDATE panel_admin_accounts SET active = 0 WHERE id = ?').run(f.extraId);
  assert.equal((await extra.request('/admin/session')).status, 401);
  assert.equal((await extra.request('/admin/stores')).status, 401);
  assert.equal((await extra.request('/admin/gestores')).status, 303);
  assert.equal((await f.browser().login()).status, 401);
  assert.equal((await f.call('/provision', { username: extraUsername, password: extraPassword })).status, 401);
  assert.equal((await f.owner.request('/admin/session')).status, 204);
});

test('additional account revision revokes its sessions and unsigned identity substitution cannot become another administrator', async t => {
  const f = await setup(t), extra = f.browser(); await extra.login();
  const otherId = f.addAccount('other-admin@example.com', 'Other-password-123');
  const token = extra.jar.get(panelCookie), [payload, signature] = token.split('.');
  for (const accountId of [undefined, otherId]) {
    const data = JSON.parse(Buffer.from(payload, 'hex').toString('utf8'));
    if (accountId === undefined) delete data.accountId; else data.accountId = accountId;
    const forged = f.browser(extra.jar); forged.jar.set(panelCookie, Buffer.from(JSON.stringify(data)).toString('hex') + '.' + signature);
    assert.equal((await forged.request('/admin/session')).status, 401);
  }
  f.db.prepare('UPDATE panel_admin_accounts SET revision = revision + 1 WHERE id = ?').run(f.extraId);
  assert.equal((await extra.request('/admin/session')).status, 401);
  const refreshed = f.browser(); assert.equal((await refreshed.login()).status, 303);
  assert.equal(sessionIdentity(refreshed).accountId, f.extraId);
  assert.equal((await refreshed.request('/admin/session')).status, 204);
  assert.equal((await f.owner.request('/admin/session')).status, 204);
});

test('additional administrator language persists across browsers independently of owner and other administrator', async t => {
  const f = await setup(t), extra = f.browser(), other = f.browser();
  const otherId = f.addAccount('other-admin@example.com', 'Other-password-123');
  assert.equal((await f.owner.json('/admin/language', { language: 'pt' })).status, 200);
  assert.deepEqual(await (await extra.json('/admin/language', { language: 'es' })).json(), { language: 'es', savedToAccount: false });
  assert.equal(f.account().language, null);
  assert.equal((await extra.login()).status, 303); assert.equal(f.account().language, 'es');
  assert.equal(f.ownerPreference(), 'pt');
  assert.equal((await other.login('other-admin@example.com', 'Other-password-123')).status, 303);
  assert.deepEqual(await (await other.json('/admin/language', { language: 'en' })).json(), { language: 'en', savedToAccount: true });
  assert.equal(f.account(otherId).language, 'en'); assert.equal(f.account().language, 'es'); assert.equal(f.ownerPreference(), 'pt');
  const anotherBrowser = f.browser(); assert.equal((await anotherBrowser.login()).status, 303);
  for (const path of ['/admin', '/admin/gestores']) assert.equal((await anotherBrowser.request(path)).headers.get('Content-Language'), 'es');
  assert.equal((await other.request('/admin')).headers.get('Content-Language'), 'en');
  assert.equal((await f.owner.request('/admin')).headers.get('Content-Language'), 'pt');
  assert.equal((await anotherBrowser.json('/admin/language', { language: 'en' }, { Origin: 'https://foreign.example' })).status, 403);
  assert.equal(f.account().language, 'es');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM manager_user_preferences').get().count, 0);
});

const loginState = (f, accountId) => ({ ...f.db.prepare(accountId ? 'SELECT attempts, blocked_until FROM panel_admin_accounts WHERE id = ?' : 'SELECT attempts, blocked_until FROM panel_login WHERE id = 1').get(...(accountId ? [accountId] : [])) });

test('additional login has its own five-failure grace, sixth-failure 30-second wait and ninth-failure 60-second wait', async t => {
  const f = await setup(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  const start = Date.UTC(2026, 9, 14), initialOwner = loginState(f);
  let now = start;
  for (let failure = 1; failure <= 9; failure++) {
    const seconds = failure === 6 ? 30 : failure === 9 ? 60 : 0;
    const result = await provisionableStores('ADDITIONAL-ADMIN@EXAMPLE.COM', 'incorrect-password', f.env, now);
    assert.equal(result.status, seconds ? 429 : 401);
    assert.equal(result.retryAfterSeconds, seconds || undefined);
    assert.deepEqual(loginState(f, f.extraId), { attempts: failure, blocked_until: seconds ? now + seconds * 1000 : 0 });
    assert.deepEqual(loginState(f), initialOwner);
    if (seconds) {
      const state = loginState(f, f.extraId);
      const blocked = await provisionableStores(extraUsername, extraPassword, f.env, now + 1000);
      assert.equal(blocked.status, 429); assert.equal(blocked.retryAfterSeconds, seconds - 1);
      assert.deepEqual(loginState(f, f.extraId), state, 'Requests during a wait must neither increment nor extend it');
      now += seconds * 1000;
    }
  }
  assert.equal((await provisionableStores(extraUsername, extraPassword, f.env, now)).status, 200);
  assert.deepEqual(loginState(f, f.extraId), { attempts: 0, blocked_until: 0 });
  assert.deepEqual(loginState(f), initialOwner);
});

test('successful login clears only its own counter and leaves other administrator and owner failures intact', async t => {
  const f = await setup(t), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  const now = Date.UTC(2026, 9, 14), otherId = f.addAccount('other-admin@example.com', 'Other-password-123');
  for (let failure = 0; failure < 2; failure++) {
    assert.equal((await provisionableStores(f.env.ADMIN_PANEL_USER, 'incorrect-password', f.env, now)).status, 401);
    assert.equal((await provisionableStores(extraUsername, 'incorrect-password', f.env, now)).status, 401);
    assert.equal((await provisionableStores('other-admin@example.com', 'incorrect-password', f.env, now)).status, 401);
  }
  assert.equal((await provisionableStores(extraUsername, extraPassword, f.env, now)).status, 200);
  assert.deepEqual(loginState(f, f.extraId), { attempts: 0, blocked_until: 0 });
  assert.deepEqual(loginState(f), { attempts: 2, blocked_until: 0 });
  assert.deepEqual(loginState(f, otherId), { attempts: 2, blocked_until: 0 });
  assert.equal((await provisionableStores(extraUsername, 'incorrect-password', f.env, now)).status, 401);
  assert.equal((await provisionableStores(f.env.ADMIN_RECOVERY_EMAIL, f.env.ADMIN_VIEW_TOKEN, f.env, now)).status, 200);
  assert.deepEqual(loginState(f), { attempts: 0, blocked_until: 0 });
  assert.deepEqual(loginState(f, f.extraId), { attempts: 1, blocked_until: 0 });
  assert.deepEqual(loginState(f, otherId), { attempts: 2, blocked_until: 0 });
});

test('additional form and tablet provisioning share its counter and a form reload preserves its remaining wait', async t => {
  const f = await setup(t), extra = f.browser(), { provisionableStores } = await import('../server/cloudflare/admin-auth.mjs');
  const start = Date.UTC(2026, 9, 14), accountCookie = '__Host-bistro_admin_login_account';
  for (let failure = 1; failure <= 5; failure++) {
    if (failure % 2) {
      const form = await extra.login(extraUsername, 'incorrect-password', start);
      assert.equal(form.status, 401); assert.equal(form.headers.get('Retry-After'), null);
      assert.ok(!(await form.text()).includes('const retryDeadline='));
      assert.equal(extra.jar.get(accountCookie), f.extraId);
    } else assert.equal((await provisionableStores(extraUsername, 'incorrect-password', f.env, start)).status, 401);
    assert.deepEqual(loginState(f, f.extraId), { attempts: failure, blocked_until: 0 });
  }
  const sixth = await provisionableStores(extraUsername, 'incorrect-password', f.env, start);
  assert.equal(sixth.status, 429); assert.equal(sixth.retryAfterSeconds, 30);
  const reload = await extra.request('/admin', {}, start);
  assert.equal(reload.status, 200); assert.equal(reload.headers.get('Retry-After'), '30');
  const markup = await reload.text();
  assert.match(markup, /type="submit" disabled/); assert.ok(markup.includes('const retryDeadline='));
  assert.ok(markup.includes('Muitas tentativas. Tente novamente em 30 segundos.'));
  const before = loginState(f, f.extraId);
  const blockedForm = await extra.login(extraUsername, extraPassword, start + 1000);
  assert.equal(blockedForm.status, 429); assert.equal(blockedForm.headers.get('Retry-After'), '29');
  assert.deepEqual(loginState(f, f.extraId), before);
  const partial = await extra.request('/admin', {}, start + 10001);
  assert.equal(partial.headers.get('Retry-After'), '20'); assert.deepEqual(loginState(f, f.extraId), before);
  assert.equal((await extra.login(extraUsername, 'incorrect-password', start + 30000)).status, 401);
  assert.equal((await provisionableStores(extraUsername, 'incorrect-password', f.env, start + 30000)).status, 401);
  const ninth = await extra.login(extraUsername, 'incorrect-password', start + 30000);
  assert.equal(ninth.status, 429); assert.equal(ninth.headers.get('Retry-After'), '60');
  assert.equal((await extra.request('/admin', {}, start + 30000)).headers.get('Retry-After'), '60');
  assert.deepEqual(loginState(f, f.extraId), { attempts: 9, blocked_until: start + 90000 });
  assert.deepEqual(loginState(f), { attempts: 0, blocked_until: 0 });
});
