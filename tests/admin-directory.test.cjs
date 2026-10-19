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
  const group = (name, storeIds, active = true) => {
    const id = randomUUID(); f.db.prepare('INSERT INTO manager_clients(id,name,store_ids,active) VALUES(?,?,?,?)').run(id, name, JSON.stringify(storeIds), Number(active)); return id;
  };
  return { ...f, request, group, cookie };
}
test('Clientes lists individual customers and groups directly without an organization above them', async t => {
  const f = await setup(t), group = f.group('Seabra Food', ['seabra-1']);
  const singleResponse = await f.request('/admin/clients', { name: 'Loja independente', kind: 'single', storeIds: ['seabra-2'] });
  assert.equal(singleResponse.status, 201); const single = (await singleResponse.json()).client;
  const root = await (await f.request('/admin')).text();
  assert.match(root, /id="clients"/); assert.ok(root.includes('Seabra Food')); assert.ok(root.includes('Loja independente'));
  assert.ok(!root.includes('class="store-nav"')); assert.ok(!root.includes('class="edit-store"')); assert.ok(!root.includes('id="groups"'));
  assert.ok(root.includes('value="single"')); assert.ok(root.includes('value="group"'));
  const locations = await (await f.request('/admin?groupId=' + group)).text();
  assert.ok(locations.includes('groupId=' + group + '&amp;storeId=seabra-1#stores')); assert.ok(!locations.match(/class="scope-path"[^]*?<\/nav>/)?.[0].includes('Organização pendente'));
  assert.ok(!locations.includes('class="store-nav"'));
  const store = await (await f.request('/admin?groupId=' + single.id + '&storeId=seabra-2')).text();
  assert.ok(store.includes('class="store-nav"')); assert.ok(store.includes('data-store-id="seabra-2"')); assert.ok(!store.includes('data-store-id="seabra-1"'));
  assert.equal((await f.request('/admin?groupId=' + group + '&storeId=seabra-2')).status, 400);
  assert.equal((await f.request('/admin?storeId=seabra-1')).status, 400);
  assert.equal((await f.request('/admin?groupId=missing')).status, 404);
});
test('customer types, revisions and atomic conversions preserve memberships and manager credentials', async t => {
  const f = await setup(t);
  assert.equal((await f.request('/admin/clients', { name: 'Inválido', kind: 'single', storeIds: ['seabra-1', 'seabra-2'] })).status, 400);
  assert.equal((await f.request('/admin/clients', { name: 'Inválido', kind: 'other' })).status, 400);
  const created = await f.request('/admin/clients', { name: 'Individual', kind: 'single', storeIds: ['seabra-1'] }); assert.equal(created.status, 201);
  const client = (await created.json()).client; assert.equal(client.kind, 'single'); assert.equal(client.revision, 1);
  const user = randomUUID(); f.db.prepare('INSERT INTO manager_users(id,client_id,name,username,salt,hash,active,revision) VALUES(?,?,?,?,?,?,1,1)').run(user, client.id, 'Gestora', 'gestora', 'synthetic-salt', 'synthetic-hash');
  const before = { ...f.db.prepare('SELECT * FROM manager_users WHERE id=?').get(user) };
  const upgraded = await f.request('/admin/clients', { id: client.id, revision: 1, name: 'Grupo', kind: 'group', storeIds: ['seabra-1', 'seabra-2'] }, 'PATCH');
  assert.equal(upgraded.status, 200); assert.equal((await upgraded.json()).client.kind, 'group');
  assert.equal((await f.request('/admin/clients', { id: client.id, revision: 1, name: 'Desatualizado', kind: 'single', storeIds: [] }, 'PATCH')).status, 409);
  assert.equal((await f.request('/admin/clients', { id: client.id, revision: 2, name: 'Individual', kind: 'single', storeIds: ['seabra-1','seabra-2'] }, 'PATCH')).status, 400);
  const reduced = await f.request('/admin/clients', { id: client.id, revision: 2, name: 'Individual', kind: 'single', storeIds: ['seabra-1'] }, 'PATCH');
  assert.equal(reduced.status, 200); assert.equal((await reduced.json()).client.revision, 3);
  assert.deepEqual({ ...f.db.prepare('SELECT * FROM manager_users WHERE id=?').get(user) }, before);
  assert.deepEqual(JSON.parse(f.db.prepare('SELECT store_ids FROM manager_clients WHERE id=?').get(client.id).store_ids), ['seabra-1']);
});
test('individual location limits remain atomic when two stores are created concurrently', async t => {
  const f = await setup(t), response = await f.request('/admin/clients', { name: 'Individual', kind: 'single' });
  const client = (await response.json()).client;
  const responses = await Promise.all(['Nova A','Nova B'].map(name => f.request('/admin/stores', { name, groupId: client.id })));
  assert.deepEqual(responses.map(r => r.status).sort(), [201,400]);
  assert.equal(JSON.parse(f.db.prepare('SELECT store_ids FROM manager_clients WHERE id=?').get(client.id).store_ids).length, 1);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM stores WHERE name IN ('Nova A','Nova B')").get().count, 1);
  assert.equal((await f.request('/admin/stores', { name: 'Outra loja', groupId: client.id })).status, 400);
});
test('legacy groups and unassigned locations keep their identity and remain accessible', async t => {
  const f = await setup(t), group = f.group('Grupo legado', ['seabra-1']);
  f.db.prepare("UPDATE stores SET active=0 WHERE id='seabra-2'").run();
  const root = await (await f.request('/admin')).text(); assert.ok(root.includes('Grupo legado')); assert.ok(root.includes('groupId=unassigned&amp;storeId=seabra-2'));
  const clients = (await (await f.request('/admin/clients')).json()).clients; assert.equal(clients.find(c => c.id === group).kind, 'group');
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM manager_client_profiles').get().count, 0);
  const registry = await (await f.request('/admin/manager-clients?groupId=' + group)).json(); assert.deepEqual(registry.stores.map(s=>s.id).sort(), ['seabra-1','seabra-2']);
  assert.equal((await f.request('/admin?groupId=unassigned&storeId=seabra-2')).status, 200);
  f.db.exec(require('node:fs').readFileSync('server/cloudflare/store-schema.sql','utf8'));
  assert.equal((await f.request('/admin?groupId=' + group + '&storeId=seabra-1')).status, 200);
});
test('diagnostics and activity require an explicit location and cannot cross customer memberships', async t => {
  const f = await setup(t), first = f.group('Primeiro', ['seabra-1']), second = f.group('Segundo', ['seabra-2']);
  for (const id of ['seabra-1','seabra-2']) {
    f.db.prepare('INSERT INTO store_diagnostics(store_id,id,device_id,created_at,received_at,actor,event,code) VALUES(?,?,?,?,?,?,?,?)').run(id,id,'tablet','2026-10-14T12:00:00Z','2026-10-14T12:00:00Z','admin','sync.failed',id);
    f.db.prepare('INSERT INTO store_admin_activity(store_id,created_at,actor,action) VALUES(?,?,?,?)').run(id,'2026-10-14T12:00:00Z','owner',id);
  }
  for (const query of ['', 'groupId='+first, 'storeId=seabra-1']) {
    assert.equal((await f.request('/admin/logs?kind=errors&'+query)).status,400); assert.equal((await f.request('/admin/activity?'+query)).status,400);
  }
  for (const [groupId,storeId] of [[first,'seabra-1'],[second,'seabra-2']]) {
    const query = new URLSearchParams({groupId,storeId});
    assert.deepEqual((await (await f.request('/admin/logs?kind=errors&'+query)).json()).map(row=>row.store_id),[storeId]);
    assert.deepEqual((await (await f.request('/admin/activity?'+query)).json()).events.map(row=>row.store_id),[storeId]);
  }
  assert.equal((await f.request('/admin/logs?kind=errors&groupId='+first+'&storeId=seabra-2')).status,400);
});
test('browser password consultation is global and rotating updates every store', async t => {
  const f = await setup(t);
  const before = await (await f.request('/auth/admin/password')).json();
  const rotated = await (await f.request('/auth/admin/password', {})).json();
  assert.notEqual(before.password,rotated.password);
  const second = await (await f.request('/auth/admin/password?storeId=seabra-2')).json();
  assert.equal(second.password,rotated.password);
  assert.equal(f.db.prepare("SELECT revision FROM store_admin_rotation WHERE store_id='seabra-1'").get().revision,1);
  assert.equal(f.db.prepare("SELECT revision FROM store_admin_rotation WHERE store_id='seabra-2'").get(),undefined);
  for(const storeId of ['seabra-1','seabra-2']){
    assert.equal((await f.call('/login',{storeId,username:'admin',password:rotated.password})).status,200);
    assert.equal((await f.call('/login',{storeId,username:'admin',password:before.password})).status,401);
    const publicAuth=await(await f.adminResponse(new Request(origin+'/auth/admin?storeId='+storeId),f.env)).json();
    assert.equal(publicAuth.storeId,storeId);assert.equal(publicAuth.revision,2**48+1);
  }
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
  const f = await setup(t), clientId = f.group('Grupo', ['seabra-1']), account = { clientId, name: 'Gestora', email: 'manager@example.com', active: true };
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
test('owner manages independent app users with CAS, protected hashes, synchronization and revoked sessions', async t => {
  const f=await setup(t),group=f.group('Cliente',['seabra-1']),path='/admin/app-users?groupId='+group+'&storeId=seabra-1';
  assert.equal((await f.adminResponse(new Request(origin+path),f.env)).status,401);
  assert.equal((await f.adminResponse(new Request(origin+path,{method:'POST',headers:{Cookie:f.cookie,Origin:'https://foreign.example','Content-Type':'application/json'},body:'{}'}),f.env)).status,403);
  assert.equal((await f.request('/admin/app-users?groupId='+group)).status,400);
  assert.equal((await f.request('/admin/app-users?groupId='+group+'&storeId=seabra-2')).status,400);
  assert.equal((await f.request(path,{username:'admin',active:true,password:'a',revision:0})).status,400);
  assert.equal((await f.request(path,{username:'cliente',active:true,password:'',revision:0})).status,400);
  assert.equal((await f.request(path,{username:'cliente',active:true,password:'a',revision:0})).status,200);
  const listing=await(await f.request(path)).json(),user=listing.users[0];
  assert.deepEqual(Object.keys(user).sort(),['active','cancelPreorders','correctPreparation','revision','role','username']);assert.equal(user.username,'cliente');
  const login=await f.call('/login',{storeId:'seabra-1',username:'cliente',password:'a'});assert.equal(login.status,200);const session=await login.json();
  assert.equal((await f.call('/login',{storeId:'seabra-2',username:'cliente',password:'a'})).status,401);
  assert.equal((await f.request(path,{username:'cliente',active:true,password:'b',revision:0})).status,409);
  assert.equal((await f.request(path,{username:'cliente',active:true,password:'',revision:user.revision})).status,200);
  assert.equal((await f.call('/login',{storeId:'seabra-1',username:'cliente',password:'a'})).status,200);
  assert.equal((await f.call('/changes?cursor=0&features=operations-v1',undefined,session.token)).status,401,'Changing a user revokes previous online sessions');
  const current=(await(await f.request(path)).json()).users[0];
  assert.equal((await f.request(path,{username:'cliente',active:false,password:'b',revision:current.revision})).status,200);
  assert.equal((await f.call('/login',{storeId:'seabra-1',username:'cliente',password:'b'})).status,401);
  assert.equal(f.db.prepare("SELECT COUNT(*) AS n FROM store_events WHERE store_id='seabra-1' AND key='user:cliente'").get().n,3);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM manager_users').get().n,0,'App access never creates a metrics account');
});

test('owner sets individual cashier cancellation permission without changing the password or granting portal access', async t => {
  const f=await setup(t),group=f.group('Cliente',['seabra-1']),path='/admin/app-users?groupId='+group+'&storeId=seabra-1';
  assert.equal((await f.request(path,{username:'operator',role:'cashier',active:true,password:'a',cancelPreorders:true,revision:0})).status,200);
  let user=(await(await f.request(path)).json()).users[0];assert.equal(user.cancelPreorders,true);
  assert.equal((await f.call('/login',{storeId:'seabra-1',username:'operator',password:'a'})).status,200);
  assert.equal((await f.request(path,{username:'operator',role:'cashier',active:true,password:'',cancelPreorders:'true',revision:user.revision})).status,400);
  assert.equal((await f.request(path,{username:'operator',role:'cashier',active:true,password:'',cancelPreorders:false,revision:user.revision})).status,200);
  user=(await(await f.request(path)).json()).users[0];assert.equal(user.cancelPreorders,false);
  assert.equal((await f.call('/login',{storeId:'seabra-1',username:'operator',password:'a'})).status,200);
});
