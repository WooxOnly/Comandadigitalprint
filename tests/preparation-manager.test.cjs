const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { Script } = require('node:vm');
const { fixture } = require('./helpers/business-fixture.cjs');
const { loadTs } = require('./helpers/load-ts.cjs');
const { kitchenAlertIds, newKitchenOrders } = loadTs('src/services/kitchenAlerts.ts');
const origin = 'https://example.com', password = 'manager-test-password-123';
const clock = Date.parse('2026-10-07T14:00:00Z');
const at = seconds => new Date(clock + seconds * 1000).toISOString();
const kitchen = () => ({ id: randomUUID(), plate: '7', customer: 'Private customer', createdAt: at(0), tabletLabel: '2', dailyNumber: 3, items: [{ id: randomUUID(), name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] });
const write = (f, key, value, base = 0, actor = f.a, id = randomUUID()) => f.call('/change', { id, key, value, base }, actor.token);
async function owner(f) {
  const page = await f.adminResponse(new Request(origin + '/admin'), f.env), csrf = page.headers.get('Set-Cookie').split(';')[0];
  const result = await f.adminResponse(new Request(origin + '/admin/login', { method: 'POST', headers: { Cookie: csrf, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrf.split('=')[1], username: 'admin', password: f.env.ADMIN_VIEW_TOKEN }) }), f.env);
  assert.equal(result.status, 303); return result.headers.get('Set-Cookie').split(';')[0];
}
async function setup(t, ids = ['seabra-1', 'seabra-2']) {
  const f = await fixture(t), cookie = await owner(f);
  const { managerResponse } = await import('../server/cloudflare/manager-api.mjs');
  f.admin = (path, data, headers = {}) => f.adminResponse(new Request(origin + path, { method: data === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...headers }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) }), f.env);
  let response = await f.admin('/admin/manager-clients', { name: 'Client group', storeIds: ids, active: true }); assert.equal(response.status, 201);
  f.client = (await response.json()).client;
  response = await f.admin('/admin/manager-users', { clientId: f.client.id, name: 'Manager', username: 'manager', password, active: true }); assert.equal(response.status, 201);
  f.user = (await response.json()).user;
  f.manager = (path, cookie = '', extra = {}, now = clock) => managerResponse(new Request(origin + path, { headers: { Cookie: cookie, ...extra } }), f.env, now);
  f.login = async (username = 'manager', pass = password, extra = {}, now = clock) => {
    const page = await f.manager('/gestor'), csrf = page.headers.get('Set-Cookie').split(';')[0];
    return managerResponse(new Request(origin + '/gestor/login', { method: 'POST', headers: { Cookie: csrf, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', ...extra }, body: new URLSearchParams({ csrf: csrf.split('=')[1], username, password: pass }) }), f.env, now);
  };
  f.signin = async () => { const result = await f.login(); assert.equal(result.status, 303); return result.headers.get('Set-Cookie').split(';')[0]; };
  f.report = (cookie, id = '', period = { start: at(0), end: at(3600) }) => f.manager('/gestor/api/production?' + new URLSearchParams({ ...period, storeId: id }), cookie);
  return f;
}

test('preparation chronology preserves exact times and keeps missing historical stages unknown', async () => {
  const { nextPreparation, preparationDurations } = await import('../shared/preparation-times.mjs');
  const { validPreparation } = await import('../shared/operations-validation.mjs');
  const order = kitchen(), started = nextPreparation(null, order, 'preparing', at(60)), ready = nextPreparation(started, order, 'ready', at(180)), completed = nextPreparation(ready, order, 'completed', at(240));
  assert.deepEqual(preparationDurations(order, completed), { waitSeconds: 60, preparationSeconds: 120, totalSeconds: 180 });
  assert.equal(completed.startedAt, at(60)); assert.equal(completed.readyAt, at(180)); assert.equal(completed.completedAt, at(240)); assert.ok(validPreparation(completed));
  assert.throws(() => nextPreparation(null, order, 'ready', at(60))); assert.throws(() => nextPreparation(started, order, 'ready', at(59)));
  assert.equal(validPreparation({ ...completed, readyAt: at(59) }), false); assert.equal(validPreparation({ ...started, readyAt: at(60) }), false);
  const historical = { orderId: order.id, status: 'ready', updatedAt: at(200) };
  assert.ok(validPreparation(historical)); assert.deepEqual(preparationDurations(order, historical), { waitSeconds: null, preparationSeconds: null, totalSeconds: null });
  const transitioned = nextPreparation(historical, order, 'completed', at(300));
  assert.equal(transitioned.readyAt, at(200)); assert.equal(transitioned.startedAt, undefined);
});

test('kitchen alerts start silently and notify each new ID once even after filters or duplicate snapshots', () => {
  assert.deepEqual(kitchenAlertIds([{ id: 'old-on-first-sync', createdAt: at(-1) }, { id: 'new', createdAt: at(1) }], clock), ['new']);
  const first = newKitchenOrders(['old'], null); assert.deepEqual(first.added, []);
  const next = newKitchenOrders(['old', 'new', 'new'], first.seen); assert.deepEqual(next.added, ['new']);
  const removed = newKitchenOrders([], next.seen); assert.deepEqual(newKitchenOrders(['old', 'new'], removed.seen).added, []);
});

test('server rejects time rewrites and reversed clocks while retries and stale conflicts preserve the original time', async t => {
  const f = await fixture(t), order = kitchen(), { nextPreparation } = await import('../shared/preparation-times.mjs'); f.modules(f.a.storeId, false, false, false, true);
  assert.equal((await write(f, 'order:' + order.id, order)).status, 200);
  const key = 'preparation:' + order.id, started = nextPreparation(null, order, 'preparing', at(60)), mutation = randomUUID();
  const result = await write(f, key, started, 0, f.a, mutation); const base = (await result.json()).revision;
  assert.equal((await write(f, key, started, 0, f.a, mutation)).status, 200);
  const ready = nextPreparation(started, order, 'ready', at(120));
  assert.equal((await write(f, key, { ...ready, startedAt: at(70) }, base)).status, 409);
  assert.equal((await write(f, key, { orderId: order.id, status: 'ready', updatedAt: at(120) }, base)).status, 409);
  assert.equal((await write(f, key, { ...ready, startedAt: at(-1) }, base)).status, 400);
  const stale = await write(f, key, ready, 0); assert.equal(stale.status, 409); assert.equal((await stale.json()).error, 'CONFLICT');
  assert.equal((await write(f, key, ready, base)).status, 200);
  assert.equal(JSON.parse(f.db.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').get(f.a.storeId, key).data).startedAt, at(60));
});

test('offline progress coalesces all timestamps, survives restart and syncs after its source order', async t => {
  const f = await fixture(t), tablet = f.tablet(), order = kitchen(), { nextPreparation } = await import('../shared/preparation-times.mjs'); f.modules(f.a.storeId, false, false, false, true);
  await tablet.cloud.setSession(f.a); await tablet.cloud.sync(); tablet.offline = true;
  await tablet.cloud.write({ ['order:' + order.id]: order }); let previous = null;
  for (const [status, seconds] of [['preparing', 60], ['ready', 180], ['completed', 240]]) { previous = nextPreparation(previous, order, status, at(seconds)); await tablet.cloud.write({ ['preparation:' + order.id]: previous }); }
  const reloaded = f.tablet(tablet.saved); await reloaded.cloud.setSession(f.a); await reloaded.cloud.sync(); assert.equal(reloaded.cloud.pending('preparation:' + order.id), false);
  assert.deepEqual(await reloaded.cloud.get('preparation:' + order.id), previous);
});

test('only the owner browser session provisions clients and manager users; passwords never return in owner APIs', async t => {
  const f = await setup(t), { managerAdminResponse } = await import('../server/cloudflare/manager-admin.mjs');
  const anonymous = await f.adminResponse(new Request(origin + '/admin/manager-users'), f.env); assert.equal(anonymous.status, 401);
  const bearer = await f.adminResponse(new Request(origin + '/admin/manager-clients', { headers: { Authorization: 'Bearer ' + f.env.ADMIN_VIEW_TOKEN } }), f.env); assert.equal(bearer.status, 401);
  const crossOrigin = await f.admin('/admin/manager-clients', { name: 'Bad', active: true, storeIds: [f.a.storeId] }, { Origin: 'https://foreign.example' }); assert.equal(crossOrigin.status, 403);
  const forged = await managerAdminResponse(new Request(origin + '/admin/manager-users'), f.env, { browserLogin: false }); assert.equal(forged.status, 401);
  const users = await (await f.admin('/admin/manager-users')).text(); assert.ok(!/salt|hash|password/.test(users));
  const row = f.db.prepare('SELECT hash, salt FROM manager_users WHERE id = ?').get(f.user.id); assert.match(row.hash, /^[a-f0-9]{64}$/); assert.notEqual(row.hash, password);
  assert.equal((await f.manager('/gestor/signup')).status, 401);
});

test('administrative validation rejects missing stores, duplicate logins, short passwords and stale client edits', async t => {
  const f = await setup(t);
  for (const ids of [[], [f.a.storeId, f.a.storeId], ['does-not-exist']]) assert.ok((await f.admin('/admin/manager-clients', { name: 'Bad', active: true, storeIds: ids })).status >= 400);
  const data = { clientId: f.client.id, name: 'Another', username: 'another', password: 'short', active: true };
  assert.equal((await f.admin('/admin/manager-users', data)).status, 400);
  assert.equal((await f.admin('/admin/manager-users', { ...data, username: 'manager', password })).status, 409);
  assert.equal((await f.admin('/admin/manager-clients', { ...f.client, name: 'New name' })).status, 200);
  assert.equal((await f.admin('/admin/manager-clients', { ...f.client, name: 'Stale' })).status, 409);
});

test('manager login requires same-origin CSRF, throttles bad credentials and keeps cookies separate from the owner and tablet', async t => {
  const f = await setup(t);
  assert.equal((await f.login('manager', password, { Origin: 'https://foreign.example' })).status, 403);
  assert.equal((await f.login('manager', password, { Cookie: '' })).status, 403);
  for (let i = 0; i < 5; i++) assert.equal((await f.login('manager', 'incorrect')).status, 401);
  assert.equal((await f.login()).status, 429);
  const result = await f.login('manager', password, {}, clock + 900001); assert.equal(result.status, 303);
  const cookie = result.headers.get('Set-Cookie').split(';')[0]; assert.match(cookie, /^__Host-bistro_manager=/); assert.match(result.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await f.adminResponse(new Request(origin + '/admin/manager-users', { headers: { Cookie: cookie } }), f.env)).status, 401);
  const ownerSession = await owner(f); assert.equal((await f.manager('/gestor/api/stores', ownerSession)).status, 401);
  assert.equal((await f.manager('/gestor/api/stores', '', { Authorization: 'Bearer ' + f.a.token })).status, 401);
});

test('a one-store manager cannot query other stores, while store deactivation and module changes apply immediately', async t => {
  const f = await setup(t, ['seabra-1']), cookie = await f.signin(); f.modules(f.a.storeId, false, true, false, false);
  const stores = (await (await f.manager('/gestor/api/stores', cookie)).json()).stores; assert.deepEqual(stores.map(s => s.id), [f.a.storeId]); assert.deepEqual(stores[0].modules, { preparation: false, preorders: false, cash: true, customers: false });
  assert.equal((await f.report(cookie, f.b.storeId)).status, 403);
  const order = kitchen(); assert.equal((await write(f, 'order:' + order.id, order)).status, 200);
  let report = await (await f.report(cookie)).json(); assert.equal(report.summary.count, 0); assert.equal(report.disabledStores.length, 1);
  f.modules(f.a.storeId, false, false, false, true); report = await (await f.report(cookie)).json(); assert.equal(report.summary.count, 1);
  f.db.prepare('UPDATE stores SET active = 0 WHERE id = ?').run(f.a.storeId); assert.equal((await f.report(cookie, f.a.storeId)).status, 403);
  assert.deepEqual((await (await f.manager('/gestor/api/stores', cookie)).json()).stores, []);
});

test('manager sessions expire and are revoked on password reset, user disable, client disable or changed store bindings', async t => {
  const f = await setup(t); let cookie = await f.signin();
  assert.equal((await f.manager('/gestor/api/stores', cookie, {}, clock + 4 * 3600000)).status, 401);
  let response = await f.admin('/admin/manager-users', { ...f.user, password: 'a-new-manager-password-123' }); assert.equal(response.status, 200); f.user = (await response.json()).user;
  assert.equal((await f.manager('/gestor/api/stores', cookie)).status, 401); assert.equal((await f.login()).status, 401);
  let login = await f.login('manager', 'a-new-manager-password-123'); cookie = login.headers.get('Set-Cookie').split(';')[0];
  response = await f.admin('/admin/manager-clients', { ...f.client, storeIds: [f.a.storeId] }); f.client = (await response.json()).client;
  assert.equal((await f.manager('/gestor/api/stores', cookie)).status, 401);
  login = await f.login('manager', 'a-new-manager-password-123'); cookie = login.headers.get('Set-Cookie').split(';')[0];
  await f.admin('/admin/manager-clients', { ...f.client, active: false }); assert.equal((await f.manager('/gestor/api/stores', cookie)).status, 401); assert.equal((await f.login('manager', 'a-new-manager-password-123')).status, 401);
  response = await f.admin('/admin/manager-clients', { ...f.client, revision: f.client.revision + 1, active: true }); f.client = (await response.json()).client;
  login = await f.login('manager', 'a-new-manager-password-123'); cookie = login.headers.get('Set-Cookie').split(';')[0];
  await f.admin('/admin/manager-users', { ...f.user, password: '', active: false }); assert.equal((await f.manager('/gestor/api/stores', cookie)).status, 401);
});

test('production averages use measured samples across stores, expose no customer/payment data and select current statuses by emission date', async t => {
  const f = await setup(t), cookie = await f.signin(), { nextPreparation } = await import('../shared/preparation-times.mjs');
  for (const actor of [f.a, f.b]) f.modules(actor.storeId, false, false, false, true);
  for (const [actor, start, ready] of [[f.a, 60, 180], [f.a, 60, 180], [f.b, 60, 420], [f.a, null, null]]) {
    const order = kitchen(); assert.equal((await write(f, 'order:' + order.id, order, 0, actor)).status, 200);
    const value = start === null ? { orderId: order.id, status: 'ready', updatedAt: at(120) } : nextPreparation(nextPreparation(null, order, 'preparing', at(start)), order, 'ready', at(ready));
    assert.equal((await write(f, 'preparation:' + order.id, value, 0, actor)).status, 200);
  }
  const result = await f.report(cookie); assert.equal(result.status, 200); const text = await result.text(), report = JSON.parse(text);
  assert.equal(report.summary.count, 4); assert.equal(report.summary.counts.ready, 4);
  assert.deepEqual(report.summary.averages.preparationSeconds, { seconds: 200, samples: 3 }); assert.deepEqual(report.summary.averages.totalSeconds, { seconds: 260, samples: 3 });
  assert.equal(report.stores.find(s => s.id === f.a.storeId).metrics.averages.preparationSeconds.samples, 2);
  assert.ok(report.orders.every(o => o.number === '2-003')); assert.equal(report.orders.filter(o => o.preparationSeconds === null).length, 1);
  assert.ok(!/Private customer|payments|hash|salt/.test(text));
  const selected = await (await f.report(cookie, f.b.storeId)).json(); assert.equal(selected.summary.count, 1);
  const empty = await (await f.report(cookie, '', { start: at(1), end: at(3600) })).json(); assert.equal(empty.summary.count, 0); assert.equal(empty.summary.averages.totalSeconds.seconds, null);
});

test('production period boundaries compare actual instants across stored UTC offsets', async t => {
  const f = await setup(t, ['seabra-1']), cookie = await f.signin(); f.modules(f.a.storeId, false, false, false, true);
  const order = { ...kitchen(), createdAt: '2026-10-07T09:05:00-05:00' };
  assert.equal((await write(f, 'order:' + order.id, order)).status, 200);
  assert.equal((await (await f.report(cookie)).json()).summary.count, 1);
  assert.equal((await (await f.report(cookie, '', { start: at(300), end: at(301) })).json()).summary.count, 1);
  assert.equal((await (await f.report(cookie, '', { start: at(0), end: at(300) })).json()).summary.count, 0);
});

test('portal bounds annual periods and aggregates every record above the old 5000 limit', async t => {
  const f = await setup(t, ['seabra-1']), cookie = await f.signin(); f.modules(f.a.storeId, false, false, false, true);
  assert.equal((await f.report(cookie, '', { start: at(0), end: at(367 * 86400) })).status, 400);
  assert.equal((await f.report(cookie, '', { start: 'bad', end: at(10) })).status, 400);
  assert.equal((await f.report(cookie, '', { from: '2026-10-01', to: '2026-10-31', tmaBasis: '__proto__' })).status, 400);
  const order = kitchen();
  f.db.prepare("WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<5001) INSERT INTO store_records(store_id,key,data,revision) SELECT ?, 'order:bulk-'||n, ?, n FROM numbers").run(f.a.storeId, JSON.stringify(order));
  const response = await f.report(cookie); assert.equal(response.status, 200); const report = await response.json(); assert.equal(report.summary.count, 5001); assert.equal(report.orders.length, 100); assert.equal(report.breakdowns.hours.reduce((sum, hour) => sum + hour.metrics.count, 0), 5001); assert.equal((await f.report(cookie, '', { from: '2026-10-01', to: '2026-10-31', timeZone: 'Invalid/Zone' })).status, 400);
});

test('manager HTML scripts parse, client names are escaped, and CSP permits only nonce scripts', async t => {
  const f = await setup(t), cookie = await f.signin();
  const edited = await f.admin('/admin/manager-clients', { ...f.client, name: '<script>alert(1)</script>' }); assert.equal(edited.status, 200);
  const newCookie = await f.signin();
  for (const response of [await f.admin('/admin/gestores'), await f.manager('/gestor', newCookie), await f.manager('/gestor')]) {
    assert.equal(response.status, 200); assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
    assert.equal(response.headers.get('Referrer-Policy'), 'same-origin');
    const content = await response.text(); for (const script of content.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Script(script[1]);
    assert.ok(!content.includes('<script>alert(1)</script>'));
  }
  assert.equal((await f.manager('/gestor/api/stores', cookie)).status, 401);
});
