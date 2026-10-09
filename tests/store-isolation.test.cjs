const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');

const schema = (name) => fs.readFileSync('server/cloudflare/' + name, 'utf8');
function database() {
  const db = new DatabaseSync(':memory:');
  for (const name of ['schema.sql', 'cloud-schema.sql', 'diagnostics-schema.sql', 'store-schema.sql']) db.exec(schema(name));
  return db;
}
function binding(db) {
  return { prepare(sql) {
    const statement = (args = []) => ({
      bind: (...values) => statement(values),
      first: async () => db.prepare(sql).get(...args),
      all: async () => ({ results: db.prepare(sql).all(...args) }),
      run: async () => { const result = db.prepare(sql).run(...args); return { meta: { changes: result.changes } }; },
    });
    return statement();
  } };
}

test('migration preserves Seabra 1 data, revisions and diagnostics without overwriting newer writes', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const name of ['schema.sql', 'cloud-schema.sql', 'diagnostics-schema.sql']) db.exec(schema(name));
    db.prepare('INSERT INTO cloud_events(seq, mutation, key, data, actor, created_at) VALUES(?, ?, ?, ?, ?, ?)').run(14, 'legacy-order-settings', 'order-settings', '{"requireCustomer":true}', 'admin', '2026-09-30T00:00:00Z');
    db.prepare('UPDATE admin_rotation SET revision = 4 WHERE id = 1').run();
    db.prepare('INSERT INTO diagnostics(id, device_id, created_at, received_at, actor, event, code) VALUES(?, ?, ?, ?, ?, ?, ?)').run('legacy-diagnostic', 'tablet', '2026-09-30T00:00:00Z', '2026-09-30T00:00:00Z', 'admin', 'sync.failed', 'TEST');
    db.exec(schema('store-schema.sql'));
    assert.equal(db.prepare("SELECT code FROM store_codes WHERE store_id = 'seabra-1'").get().code, 1);
    const migrated = db.prepare("SELECT data, revision FROM store_records WHERE store_id = 'seabra-1' AND key = 'order-settings'").get();
    assert.equal(migrated.data, '{"requireCustomer":true}');
    assert.equal(migrated.revision, 14);
    assert.equal(db.prepare("SELECT seq FROM store_events WHERE store_id = 'seabra-1' AND mutation = 'legacy-order-settings'").get().seq, 14);
    assert.equal(db.prepare("SELECT revision FROM store_admin_rotation WHERE store_id = 'seabra-1'").get().revision, 4);
    assert.equal(db.prepare("SELECT count(*) AS count FROM store_diagnostics WHERE store_id = 'seabra-1'").get().count, 1);
    db.prepare('INSERT INTO store_events(store_id, mutation, key, data, actor, created_at) VALUES(?, ?, ?, ?, ?, ?)').run('seabra-1', 'new-edit', 'order-settings', '{"requireCustomer":false}', 'admin', '2026-10-03T00:00:00Z');
    db.exec(schema('store-schema.sql'));
    db.prepare("INSERT INTO stores(id, name, active) VALUES('seabra-2', 'Seabra 2', 1)").run();
    assert.equal(db.prepare("SELECT code FROM store_codes WHERE store_id = 'seabra-2'").get().code, 2);
    assert.throws(() => db.prepare("UPDATE store_codes SET code = 9 WHERE store_id = 'seabra-1'").run(), /cannot be changed/);
    assert.deepEqual(JSON.parse(db.prepare("SELECT data FROM store_records WHERE store_id = 'seabra-1' AND key = 'order-settings'").get().data), { requireCustomer: false });
    assert.equal(db.prepare("SELECT data FROM cloud_records WHERE key = 'order-settings'").get().data, '{"requireCustomer":true}');
  } finally { db.close(); }
});

test('store sessions isolate logins, changes, retries, menus and diagnostics', async (t) => {
  const { cloudResponse } = await import('../server/cloudflare/cloud-api.mjs');
  const { weeklyAdmin } = await import('../server/cloudflare/admin-auth.mjs');
  const { default: worker } = await import('../server/cloudflare/worker.mjs');
  const db = database(); t.after(() => db.close());
  db.prepare('INSERT INTO stores(id, name, active) VALUES(?, ?, 1)').run('seabra-2', 'Seabra 2');
  const env = { DB: binding(db), ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', MENU_ADMIN_TOKEN: 'default-store-only', ADMIN_VIEW_TOKEN: 'owner-panel-password' };
  const call = (path, data, token) => cloudResponse(new Request('https://example.com/cloud' + path, { method: data === undefined ? 'GET' : 'POST', headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), env);
  const first = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, Date.now(), 0, 'seabra-1');
  const second = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, Date.now(), 0, 'seabra-2');
  assert.notEqual(first.password, second.password);
  assert.equal((await call('/provision', { username: 'admin', password: 'wrong' })).status, 401);
  const provisioned = await call('/provision', { username: 'admin', password: env.ADMIN_VIEW_TOKEN });
  assert.equal(provisioned.status, 200);
  assert.deepEqual(await provisioned.json(), { stores: [
    { id: 'seabra-1', name: 'Seabra 1', code: 1 },
    { id: 'seabra-2', name: 'Seabra 2', code: 2 },
  ] });
  assert.deepEqual(await (await call('/store?storeId=seabra-2')).json(), { storeId: 'seabra-2', name: 'Seabra 2', modules: { preorders: false, cash: false } });
  assert.equal((await call('/store?storeId=missing')).status, 404);
  assert.equal((await call('/store?storeId=invalid_')).status, 400);
  assert.equal((await call('/login', { storeId: 'seabra-2', username: 'admin', password: first.password })).status, 401);
  const a = await (await call('/login', { storeId: 'seabra-1', username: 'admin', password: first.password })).json();
  const b = await (await call('/login', { storeId: 'seabra-2', username: 'admin', password: second.password })).json();
  assert.equal(a.storeId, 'seabra-1'); assert.equal(b.storeId, 'seabra-2');
  const mutation = randomUUID();
  const write = (storeId, token, value) => call('/change', { storeId, key: 'order-settings', value: { requireCustomer: value }, base: 0, id: mutation }, token);
  assert.equal((await write('seabra-1', a.token, true)).status, 200);
  assert.equal((await write('seabra-2', b.token, false)).status, 200);
  assert.equal((await write('seabra-2', a.token, false)).status, 403);
  assert.equal((await call('/changes?storeId=seabra-2', undefined, a.token)).status, 403);
  const changesA = await (await call('/changes', undefined, a.token)).json();
  const changesB = await (await call('/changes', undefined, b.token)).json();
  assert.equal(changesA.changes.find((item) => item.key === 'order-settings').value.requireCustomer, true);
  assert.equal(changesB.changes.find((item) => item.key === 'order-settings').value.requireCustomer, false);
  assert.equal(db.prepare("SELECT count(*) AS count FROM store_records WHERE key = 'order-settings'").get().count, 2);
  const secondMenu = [{ id: 'item-2', name: 'Loja 2', category: 'Pratos', price: 12 }];
  const menuWrite = await call('/change', { key: 'menu', value: secondMenu, base: changesB.changes.find((item) => item.key === 'menu').revision, id: randomUUID() }, b.token);
  assert.equal(menuWrite.status, 200);
  assert.deepEqual(await (await worker.fetch(new Request('https://example.com/menu?storeId=seabra-2'), env)).json(), secondMenu);
  assert.notDeepEqual(await (await worker.fetch(new Request('https://example.com/menu'), env)).json(), secondMenu);
  assert.equal((await worker.fetch(new Request('https://example.com/menu?storeId=seabra-2', { method: 'PUT', headers: { Authorization: 'Bearer default-store-only', 'Content-Type': 'application/json' }, body: '[]' }), env)).status, 403);
  const log = { id: randomUUID(), deviceId: randomUUID(), createdAt: new Date().toISOString(), event: 'sync.failed', code: 'TEST' };
  assert.equal((await call('/diagnostics', log, a.token)).status, 200);
  assert.equal((await call('/diagnostics', log, b.token)).status, 200);
  assert.equal(db.prepare('SELECT count(*) AS count FROM store_diagnostics WHERE id = ?').get(log.id).count, 2);
  db.prepare('UPDATE stores SET active = 0 WHERE id = ?').run('seabra-2');
  assert.equal((await call('/changes', undefined, b.token)).status, 401);
  assert.equal((await call('/store?storeId=seabra-2')).status, 404);
  assert.deepEqual((await (await call('/provision', { username: 'admin', password: env.ADMIN_VIEW_TOKEN })).json()).stores.map((store) => store.id), ['seabra-1']);
});

test('one panel session selects stores inside the portal for logs and weekly password actions', async (t) => {
  const { adminResponse, weeklyAdmin } = await import('../server/cloudflare/admin-auth.mjs');
  const db = database(); t.after(() => db.close());
  db.prepare('INSERT INTO stores(id, name, active) VALUES(?, ?, 1)').run('seabra-2', 'Seabra 2');
  db.prepare('INSERT INTO store_diagnostics(store_id, id, device_id, created_at, received_at, actor, event, code) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run('seabra-1', 'one', 'tablet', '2026-10-03T00:00:00Z', '2026-10-03T00:00:00Z', 'admin', 'sync.failed', 'FIRST');
  db.prepare('INSERT INTO store_diagnostics(store_id, id, device_id, created_at, received_at, actor, event, code) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run('seabra-2', 'two', 'tablet', '2026-10-03T00:00:00Z', '2026-10-03T00:00:00Z', 'admin', 'sync.failed', 'SECOND');
  const env = { DB: binding(db), ADMIN_PASSWORD_SECRET: 'test-only-secret-not-for-deployment-1234', ADMIN_VIEW_TOKEN: 'owner-panel-password' };
  const loginPage = await adminResponse(new Request('https://example.com/admin'), env);
  const csrfCookie = loginPage.headers.get('Set-Cookie').split(';')[0];
  const csrf = csrfCookie.split('=')[1];
  const login = await adminResponse(new Request('https://example.com/admin/login', { method: 'POST', headers: { Cookie: csrfCookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf, username: 'admin', password: env.ADMIN_VIEW_TOKEN }) }), env);
  assert.equal(login.status, 303);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  const request = (path, method = 'GET') => adminResponse(new Request('https://example.com' + path, { method, headers: { Cookie: cookie, Origin: 'https://example.com' } }), env);
  const panel = await (await request('/admin?storeId=seabra-2')).text(); assert.match(panel, /selectedGroupId="unassigned",hasStore=true/);
  const logs = await (await request('/admin/logs?kind=errors&storeId=seabra-2')).json(); assert.deepEqual(logs.map((item) => item.code), ['SECOND']);
  assert.deepEqual((await (await request('/admin/logs?kind=errors&storeId=seabra-1')).json()).map((item) => item.code), ['FIRST']);
  assert.equal((await request('/auth/admin/password?storeId=seabra-1')).status, 200);
  const before = await (await request('/auth/admin/password?storeId=seabra-2')).json();
  assert.equal(before.storeId, 'seabra-2');
  assert.equal(before.password, (await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, Date.now(), 0, 'seabra-2')).password);
  assert.equal((await request('/auth/admin/password?storeId=seabra-2', 'POST')).status, 200);
  assert.equal(db.prepare("SELECT revision FROM store_admin_rotation WHERE store_id = 'seabra-2'").get().revision, 1);
  assert.equal(db.prepare("SELECT revision FROM store_admin_rotation WHERE store_id = 'seabra-1'").get().revision, 0);
  assert.deepEqual((await (await request('/admin/stores')).json()).map((store) => store.id), ['seabra-1', 'seabra-2']);
  assert.deepEqual((await (await request('/admin/stores')).json()).map((store) => store.code), [1, 2]);
  assert.equal((await adminResponse(new Request('https://example.com/admin/stores', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://other.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Seabra 3' }) }), env)).status, 403);
  const rename = (id, name, origin = 'https://example.com') => adminResponse(new Request('https://example.com/admin/stores', { method: 'PATCH', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name }) }), env);
  assert.equal((await rename('seabra-2', 'Novo nome', 'https://other.example')).status, 403);
  assert.equal((await rename('seabra-2', '')).status, 400);
  assert.equal((await rename('invalido_', 'Novo nome')).status, 400);
  assert.equal((await rename('loja-inexistente', 'Novo nome')).status, 404);
  const renamed = await rename('seabra-2', '  Seabra Central  ');
  assert.equal(renamed.status, 200);
  assert.deepEqual(await renamed.json(), { id: 'seabra-2', name: 'Seabra Central', code: 2 });
  assert.equal(db.prepare("SELECT code FROM store_codes WHERE store_id = 'seabra-2'").get().code, 2);
  assert.equal((await (await request('/auth/admin/password?storeId=seabra-2')).json()).storeId, 'seabra-2');
  assert.match(await (await request('/admin?storeId=seabra-2')).text(), /Código 002/);
  const create = (name) => adminResponse(new Request('https://example.com/admin/stores', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }), env);
  assert.equal((await create('')).status, 400);
  assert.equal((await adminResponse(new Request('https://example.com/admin/stores', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: '{' }), env)).status, 400);
  const created = await create('Seabra 3');
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), { id: 'seabra-3', name: 'Seabra 3', code: 3 });
  assert.equal((await request('/auth/admin/password?storeId=seabra-3')).status, 200);
  assert.equal(db.prepare("SELECT count(*) AS count FROM stores WHERE active = 1").get().count, 3);
});
