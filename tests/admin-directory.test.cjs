const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { fixture } = require('./helpers/business-fixture.cjs');
const origin = 'https://example.com';
async function setup(t) {
  const f = await fixture(t);
  const entry = await f.adminResponse(new Request(origin + '/admin'), f.env);
  const csrfCookie = entry.headers.getSetCookie().find(c => c.startsWith('__Host-comanda_csrf=')).split(';')[0];
  const login = await f.adminResponse(new Request(origin + '/admin/login', { method: 'POST', headers: { Cookie: csrfCookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: 'admin', password: f.env.ADMIN_VIEW_TOKEN, csrf: csrfCookie.split('=')[1] }) }), f.env);
  assert.equal(login.status, 303);
  const cookie = login.headers.getSetCookie().find(c => c.startsWith('__Host-comanda_panel=')).split(';')[0];
  const request = (path, data, method = 'POST') => f.adminResponse(new Request(origin + path, { method: data === undefined ? 'GET' : method, headers: { Cookie: cookie, Origin: origin, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), f.env);
  const group = (name, storeIds, active = true) => { const id = randomUUID(); f.db.prepare('INSERT INTO manager_clients(id,name,store_ids,active) VALUES(?,?,?,?)').run(id, name, JSON.stringify(storeIds), Number(active)); return id; };
  return { ...f, request, group, cookie };
}
test('owner entry starts with groups; explicit group and location preserve all owner access without a default location', async t => {
  const f = await setup(t), first = f.group('Grupo principal', ['seabra-1']), second = f.group('Grupo secundário', ['seabra-2'], false);
  const root = await (await f.request('/admin')).text();
  assert.ok(!root.includes('store-picker')); assert.match(root, /selectedGroupId="",hasStore=false/);
  assert.match(root, /selected:"groups"/); assert.ok(root.includes('Grupo principal')); assert.ok(root.includes('Grupo secundário'));
  assert.ok(!root.includes('class="edit-store"')); assert.ok(!root.includes('Painel do Gestor</a>'));
  const group = await (await f.request('/admin?groupId=' + first)).text();
  assert.match(group, /selected:"locations"/); assert.ok(group.includes('groupId=' + first + '&amp;storeId=seabra-1#stores'));
  assert.ok(!group.includes('data-store-id="seabra-2"'));
  const store = await (await f.request('/admin?groupId=' + second + '&storeId=seabra-2')).text();
  assert.match(store, /selected:"stores"/); assert.match(store, /data-store-id="seabra-2"/); assert.ok(!store.includes('data-store-id="seabra-1"'));
  assert.equal((await f.request('/admin?groupId=' + first + '&storeId=seabra-2')).status, 400);
  assert.equal((await f.request('/admin?groupId=missing')).status, 404);
  assert.equal((await f.request('/admin?storeId=missing')).status, 404);
  assert.equal((await f.request('/admin?storeId=invalid_')).status, 400);
});
test('unassigned and inactive locations remain available to owner without reactivating them', async t => {
  const f = await setup(t); f.group('Grupo', ['seabra-1']); f.db.prepare("UPDATE stores SET active=0 WHERE id='seabra-2'").run();
  assert.ok((await (await f.request('/admin')).text()).includes('Lojas sem grupo'));
  const stores = await (await f.request('/admin/stores?groupId=unassigned')).json(); assert.deepEqual(stores.map(s => s.id), ['seabra-2']); assert.equal(stores[0].active, 0);
  assert.match(await (await f.request('/admin?groupId=unassigned&storeId=seabra-2')).text(), /data-store-id="seabra-2"/);
  assert.equal((await f.request('/admin/stores', { id: 'seabra-2', name: 'Loja arquivada' }, 'PATCH')).status, 200);
  assert.equal(f.db.prepare("SELECT active FROM stores WHERE id='seabra-2'").get().active, 0);
  const group = await f.request('/admin/manager-clients', { name: 'Grupo arquivado', storeIds: ['seabra-2'], active: true }); assert.equal(group.status, 201);
  const registry = await (await f.request('/admin/manager-clients')).json(); assert.equal(registry.stores.find(s => s.id === 'seabra-2').active, 0);
});
test('groups can be created empty, then new locations are linked atomically without taking a colliding existing location', async t => {
  const f = await setup(t);
  const created = await f.request('/admin/manager-clients', { name: 'Grupo novo', active: true, storeIds: [] }); assert.equal(created.status, 201);
  const group = (await created.json()).client; assert.deepEqual(group.storeIds, []);
  assert.match(await (await f.request('/admin?groupId=' + group.id)).text(), /Este grupo ainda não tem lojas/);
  const store = await f.request('/admin/stores', { name: 'Seabra 1', groupId: group.id, modules: { preorders: true, cash: false, customers: false, preparation: true } });
  assert.equal(store.status, 201); const value = await store.json(); assert.equal(value.id, 'seabra-1-2');
  const saved = f.db.prepare('SELECT store_ids, revision FROM manager_clients WHERE id=?').get(group.id);
  assert.deepEqual(JSON.parse(saved.store_ids), ['seabra-1-2']); assert.equal(saved.revision, 2);
  assert.equal(value.modules.preparation, true);
  const parallel = await Promise.all(['Loja paralela A', 'Loja paralela B'].map(name => f.request('/admin/stores', { name, groupId: group.id })));
  assert.deepEqual(parallel.map(r => r.status), [201, 201]);
  assert.equal(JSON.parse(f.db.prepare('SELECT store_ids FROM manager_clients WHERE id=?').get(group.id).store_ids).length, 3);
  for (const groupId of ['missing','unassigned',null]) assert.equal((await f.request('/admin/stores', { name: 'Não criar', groupId })).status, groupId === 'missing' ? 404 : 400);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM stores WHERE name='Não criar'").get().count, 0);
});
test('global and group diagnostics and activity include location names and respect explicit scope', async t => {
  const f = await setup(t), group = f.group('Primeiro', ['seabra-1']);
  for (const id of ['seabra-1', 'seabra-2']) {
    f.db.prepare('INSERT INTO store_diagnostics(store_id,id,device_id,created_at,received_at,actor,event,code) VALUES(?,?,?,?,?,?,?,?)').run(id, id, 'tablet', '2026-10-09T10:00:00Z', '2026-10-09T10:00:00Z', 'admin', 'sync.failed', id);
    f.db.prepare('INSERT INTO store_admin_activity(store_id,created_at,actor,action) VALUES(?,?,?,?)').run(id, '2026-10-09T10:00:00Z', 'owner', 'Changed ' + id);
  }
  for (const [query, ids] of [['', ['seabra-1','seabra-2']], ['&groupId=' + group, ['seabra-1']], ['&storeId=seabra-2', ['seabra-2']]]) {
    const logs = await (await f.request('/admin/logs?kind=errors' + query)).json(); assert.deepEqual(logs.map(s => s.store_id).sort(), ids); assert.ok(logs.every(s => s.store_name));
    const activity = await (await f.request('/admin/activity?' + query.slice(1))).json(); assert.deepEqual(activity.events.map(s => s.store_id).sort(), ids); assert.ok(activity.events.every(s => s.store_name));
  }
  const empty = f.group('Vazio', []);
  assert.deepEqual(await (await f.request('/admin/logs?kind=errors&groupId=' + empty)).json(), []);
  assert.deepEqual((await (await f.request('/admin/activity?groupId=' + empty)).json()).events, []);
  assert.equal((await f.request('/admin/logs?kind=errors&groupId=' + group + '&storeId=seabra-2')).status, 400);
  assert.equal((await f.request('/admin/activity?groupId=missing')).status, 404);
});
test('browser password consultation and rotation require an explicit location and keep other rotations untouched', async t => {
  const f = await setup(t);
  assert.equal((await f.request('/auth/admin/password')).status, 400);
  assert.equal((await f.request('/auth/admin/password', {})).status, 400);
  assert.equal((await f.request('/auth/admin/password?storeId=seabra-2', {})).status, 200);
  assert.equal(f.db.prepare("SELECT revision FROM store_admin_rotation WHERE store_id='seabra-1'").get().revision, 0);
  assert.equal(f.db.prepare("SELECT revision FROM store_admin_rotation WHERE store_id='seabra-2'").get().revision, 1);
});
test('owner web password accepts eight characters, rejects seven and still requires current password and confirmation', async t => {
  const f = await setup(t), currentPassword = f.env.ADMIN_VIEW_TOKEN;
  const change = (newPassword, confirmPassword = newPassword, current = currentPassword) => f.request('/admin/change-password', { currentPassword: current, newPassword, confirmPassword });
  assert.equal((await change('abc1234')).status, 400); assert.equal((await change('abcdefgh', 'different')).status, 400); assert.equal((await change('abcdefgh', 'abcdefgh', 'wrong')).status, 403);
  assert.equal((await change('abcdefgh')).status, 200); assert.equal((await f.request('/admin/session')).status, 401);
  const entry = await f.adminResponse(new Request(origin + '/admin'), f.env), csrfCookie = entry.headers.getSetCookie().find(c => c.startsWith('__Host-comanda_csrf=')).split(';')[0];
  assert.equal((await f.adminResponse(new Request(origin + '/admin/login', { method: 'POST', headers: { Cookie: csrfCookie, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: 'admin', password: 'abcdefgh', csrf: csrfCookie.split('=')[1] }) }), f.env)).status, 303);
});
test('manager web account creation and reset accept eight characters and preserve blank-password edits', async t => {
  const f = await setup(t), clientId = f.group('Grupo', ['seabra-1']), account = { clientId, name: 'Gestora', username: 'manager', active: true };
  assert.equal((await f.request('/admin/manager-users', { ...account, password: '1234567' })).status, 400);
  const created = await f.request('/admin/manager-users', { ...account, password: 'abcdefgh' }); assert.equal(created.status, 201); let user = (await created.json()).user;
  const { digest } = await import('../server/cloudflare/manager-auth.mjs');
  const row = () => f.db.prepare('SELECT salt,hash FROM manager_users WHERE id=?').get(user.id);
  assert.equal(row().hash, await digest('abcdefgh', row().salt)); const previous = row().hash;
  const edit = await f.request('/admin/manager-users', { ...user, password: '' }); assert.equal(edit.status, 200); user = (await edit.json()).user; assert.equal(row().hash, previous);
  assert.equal((await f.request('/admin/manager-users', { ...user, password: '1234567' })).status, 400);
  const reset = await f.request('/admin/manager-users', { ...user, password: '87654321' }); assert.equal(reset.status, 200); assert.equal(row().hash, await digest('87654321', row().salt));
  assert.match(await (await f.request('/admin/gestores?groupId=' + clientId)).text(), /minlength='8'/);
});
