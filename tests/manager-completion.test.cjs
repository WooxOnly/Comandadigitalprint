const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { fixture } = require('./helpers/business-fixture.cjs');
const origin = 'https://example.com';
async function manager(t, ids = ['seabra-1', 'seabra-2']) {
  const f = await fixture(t), { managerResponse } = await import('../server/cloudflare/manager-api.mjs');
  let response = await f.adminResponse(new Request(origin + '/admin'), f.env), csrf = response.headers.get('Set-Cookie').split(';')[0];
  response = await f.adminResponse(new Request(origin + '/admin/login', { method: 'POST', headers: { Cookie: csrf, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrf.split('=')[1], username: 'admin', password: f.env.ADMIN_VIEW_TOKEN }) }), f.env);
  const cookie = response.headers.get('Set-Cookie').split(';')[0];
  const admin = (path, data) => f.adminResponse(new Request(origin + path, { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), f.env);
  response = await admin('/admin/manager-clients', { name: 'Group', active: true, storeIds: ids }); assert.equal(response.status, 201);
  const client = (await response.json()).client;
  response = await admin('/admin/manager-users', { clientId: client.id, name: 'Gestor', username: 'manager', password: 'manager-password-123', active: true }); assert.equal(response.status, 201);
  response = await managerResponse(new Request(origin + '/gestor'), f.env); csrf = response.headers.get('Set-Cookie').split(';')[0];
  response = await managerResponse(new Request(origin + '/gestor/login', { method: 'POST', headers: { Cookie: csrf, Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrf.split('=')[1], username: 'manager', password: 'manager-password-123' }) }), f.env); assert.equal(response.status, 303);
  const session = response.headers.get('Set-Cookie').split(';')[0];
  const report = async (type, params = {}) => managerResponse(new Request(origin + '/gestor/api/' + type + '?' + new URLSearchParams({ from: '2026-10-01', to: '2026-10-31', timeZone: 'UTC', ...params }), { headers: { Cookie: session } }), f.env);
  return { ...f, report, session, managerResponse };
}
async function cashActivity(f, s = f.a, amount = 1000, extra = {}) {
  const open = { operation: 'open', id: randomUUID(), deviceId: randomUUID(), openingCents: 10000 };
  assert.equal((await f.cash(open, s)).status, 200);
  const input = { operation: 'sale', id: randomUUID(), deviceId: open.deviceId, sessionId: open.id, customer: 'SECRET CUSTOMER', note: '', items: [{ id: randomUUID(), productId: 'pizza', name: 'Pizza', category: 'Pizzas', quantity: 1, note: 'SECRET NOTE', unitPriceCents: amount }], method: 'cash', tenderedCents: 20000, ...extra };
  const result = await f.cash(input, s); assert.equal(result.status, 200, JSON.stringify(result.value));
  f.db.prepare('UPDATE cash_entries SET created_at = ? WHERE store_id = ? AND id = ?').run('2026-10-07T14:00:00.000Z', s.storeId, input.id);
  return { open, input, result: result.value };
}
test('manager financial area reconciles tablet totals, split legs, tax, tips, delivery, partial returns and closed registers', async t => {
  const f = await manager(t); f.modules('seabra-1', false, true);
  f.db.prepare('INSERT INTO store_cash_settings(store_id,data) VALUES(?,?)').run('seabra-1', JSON.stringify({ tax: { enabled: true, rateBps: 750 }, managers: [] }));
  const { open, input } = await cashActivity(f, f.a, 1000, { discount: { kind: 'amount', value: 100, reason: 'Promotion' }, taxRateBps: 750, tipCents: 200, deliveryFeeCents: 100, payments: [{ method: 'cash', amountCents: 500, tenderedCents: 1000 }, { method: 'card', amountCents: 500 }, { method: 'zelle', amountCents: 275 }] });
  const refundId = randomUUID(); assert.equal((await f.cash({ operation: 'refund', id: refundId, deviceId: open.deviceId, sessionId: open.id, saleId: input.id, reason: 'SECRET REASON', refund: { mode: 'amount', amountCents: 250 } })).status, 200);
  f.db.prepare('UPDATE cash_refunds SET created_at = ? WHERE id = ?').run('2026-10-08T15:00:00.000Z', refundId);
  assert.equal((await f.cash({ operation: 'close', id: randomUUID(), deviceId: open.deviceId, sessionId: open.id, countedCents: 10000 })).status, 200);
  f.db.prepare('UPDATE cash_sessions SET closed_at = ? WHERE id = ?').run('2026-10-08T15:01:00.000Z', open.id);
  const response = await f.report('sales'); assert.equal(response.status, 200); const web = await response.json();
  const tablet = await (await f.call('/cash/report?' + new URLSearchParams({ start: web.start, end: web.end, timeZone: web.timeZone }), undefined, f.a.token)).json();
  assert.deepEqual(web.totals, tablet.totals); assert.deepEqual(web.methods, tablet.methods); assert.equal(web.totals.netReceiptsCents, 1025); assert.equal(web.averageTicketCents, 900); assert.equal(web.closingCount, 1); assert.equal(web.closingDifferenceCents, tablet.closings[0].differenceCents);
  for (const type of ['hours', 'weekdays', 'days', 'months']) for (const key of Object.keys(web.totals)) assert.equal(web.breakdowns[type].reduce((sum, bucket) => sum + bucket.totals[key], 0), web.totals[key]);
  assert.equal(web.products[0].netSalesCents, web.totals.netSalesCents); assert.equal(web.categories[0].netSalesCents, web.totals.netSalesCents);
  const text = JSON.stringify(web); for (const secret of ['SECRET CUSTOMER', 'SECRET NOTE', 'SECRET REASON', 'priceAdjustments', 'customerId']) assert.ok(!text.includes(secret));
});
test('sales scopes independent modules, denies foreign stores and respects deactivation immediately', async t => {
  const f = await manager(t, ['seabra-1']); f.modules('seabra-1', false, true); f.modules('seabra-2', false, true, false, true);
  await cashActivity(f); await cashActivity(f, f.b, 2000);
  assert.equal((await f.report('sales', { storeId: 'seabra-2' })).status, 403);
  let value = await (await f.report('sales')).json(); assert.equal(value.totals.grossCents, 1000); assert.equal(value.stores.length, 1);
  assert.equal((await (await f.report('production')).json()).summary.count, 0);
  f.modules('seabra-1', false, false, true, true); value = await (await f.report('sales')).json(); assert.equal(value.totals.salesCount, 0); assert.deepEqual(value.stores, []); assert.equal(value.disabledStores.length, 1);
  f.db.prepare("UPDATE stores SET active = 0 WHERE id = 'seabra-1'").run(); assert.equal((await f.report('sales', { storeId: 'seabra-1' })).status, 403);
  assert.equal((await f.managerResponse(new Request(origin + '/gestor/api/sales'), f.env)).status, 401);
});
test('group sales aggregates stores with reused product IDs and uses weighted ticket rather than average of stores', async t => {
  const f = await manager(t); f.modules('seabra-1', false, true); f.modules('seabra-2', false, true);
  await cashActivity(f, f.a, 1000); await cashActivity(f, f.b, 3000); await cashActivity(f, f.b, 5000, { items: [{ id: randomUUID(), productId: 'pizza', name: 'Bread', category: 'Bread', quantity: 1, note: '', unitPriceCents: 5000 }] });
  const value = await (await f.report('sales')).json(); assert.equal(value.totals.salesCount, 3); assert.equal(value.averageTicketCents, 3000); assert.equal(value.totals.netSalesCents, 9000); assert.equal(value.products.reduce((sum, row) => sum + row.netSalesCents, 0), 9000); assert.equal(value.operators.length, 2);
});
test('returns of old sales enter the local refund day with negative net sales and no fake average ticket', async t => {
  const f = await manager(t); f.modules('seabra-1', false, true); const { open, input } = await cashActivity(f);
  f.db.prepare('UPDATE cash_entries SET created_at = ? WHERE id = ?').run('2026-09-30T14:00:00.000Z', input.id);
  const id = randomUUID(); assert.equal((await f.cash({ operation: 'refund', id, saleId: input.id, deviceId: open.deviceId, sessionId: open.id, reason: 'Returned' })).status, 200);
  f.db.prepare('UPDATE cash_adjustments SET created_at = ? WHERE id = ?').run('2026-10-08T00:30:00.000Z', id);
  const value = await (await f.report('sales', { from: '2026-10-07', to: '2026-10-07', timeZone: 'America/New_York' })).json();
  assert.equal(value.totals.salesCount, 0); assert.equal(value.totals.netSalesCents, -1000); assert.equal(value.averageTicketCents, null); assert.equal(value.breakdowns.hours[20].totals.netSalesCents, -1000); assert.equal(value.breakdowns.days[0].key, '2026-10-07');
});
test('financial limits reject the entire period and never report clipped totals', async t => {
  const f = await manager(t); f.modules('seabra-1', false, true); const { open } = await cashActivity(f);
  f.db.prepare("WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<10000) INSERT INTO cash_entries(store_id,id,session_id,kind,method,amount_cents,created_at,actor,note,data) SELECT 'seabra-1','bulk-'||x,?,'in','cash',1,'2026-10-07T14:00:00.000Z','admin','','null' FROM n").run(open.id);
  const response = await f.report('sales'); assert.equal(response.status, 400); const value = await response.json(); assert.match(value.error, /10.000/); assert.equal(value.totals, undefined);
});
test('production products and categories count all quantities, preserve flavor combinations and do not repeat order counts', async t => {
  const f = await manager(t); f.modules('seabra-1', false, false, false, true);
  const id = randomUUID(), items = [{ id: 'a', name: '½ Pizza A / ½ Pizza B', category: 'Pizzas', quantity: 2, note: 'SECRET NOTE', flavors: ['Pizza A', 'Pizza B'], extras: [{ name: 'Cheese', placement: 'whole' }] }, { id: 'b', name: 'Plain pizza', category: 'Pizzas', quantity: 3, note: '' }, { id: 'c', name: 'Bread', category: 'Bread', quantity: 1, note: '' }];
  f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,1)').run('seabra-1', 'order:' + id, JSON.stringify({ id, plate: '1', customer: 'SECRET CUSTOMER', createdAt: '2026-10-07T14:00:00Z', items }));
  const value = await (await f.report('production')).json(); assert.equal(value.productCount, 3); assert.equal(value.products.reduce((sum, item) => sum + item.quantity, 0), 6); assert.equal(value.categories.find(row => row.category === 'Pizzas').orders, 1); assert.equal(value.categories.find(row => row.category === 'Pizzas').quantity, 5); assert.ok(!JSON.stringify(value).includes('SECRET'));
});
test('stage operators survive offline coalescing, remain distinct per store and preserve old unattributed records', async t => {
  const f = await manager(t); f.modules('seabra-1', false, false, false, true);
  const { nextPreparation } = await import('../shared/preparation-times.mjs'), { validPreparation } = await import('../shared/operations-validation.mjs');
  const order = { id: randomUUID(), plate: '1', customer: '', items: [{ id: 'a', name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }], createdAt: '2026-10-07T14:00:00Z' };
  let value = nextPreparation(null, order, 'preparing', '2026-10-07T14:01:00Z', 'chef'); value = nextPreparation(value, order, 'ready', '2026-10-07T14:04:00Z', 'helper'); value = nextPreparation(value, order, 'completed', '2026-10-07T14:05:00Z', 'admin'); assert.ok(validPreparation(value));
  f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,1)').run('seabra-1', 'order:' + order.id, JSON.stringify(order)); f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,2)').run('seabra-1', 'preparation:' + order.id, JSON.stringify(value));
  const oldId = randomUUID(); f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,1)').run('seabra-1', 'order:' + oldId, JSON.stringify({ ...order, id: oldId })); f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,2)').run('seabra-1', 'preparation:' + oldId, JSON.stringify({ orderId: oldId, status: 'completed', updatedAt: '2026-10-07T14:10:00Z' }));
  const report = await (await f.report('production')).json(); const chef = report.operators.find(row => row.username === 'chef'), helper = report.operators.find(row => row.username === 'helper'), admin = report.operators.find(row => row.username === 'admin'), old = report.operators.find(row => row.username === null);
  assert.equal(chef.started, 1); assert.equal(chef.ready, 0); assert.equal(helper.preparation.seconds, 180); assert.equal(admin.tma.seconds, 300); assert.equal(old.completed, 1); assert.equal(old.tma.seconds, null);
  assert.ok(validPreparation(nextPreparation(null, order, 'preparing', '2026-10-07T14:01:00Z', '_chef')));
  assert.ok(!validPreparation({ ...value, startedBy: '<script>' })); assert.ok(!validPreparation({ ...value, startedAt: undefined }));
});
test('known stage actors cannot be rewritten or added retroactively and foreign users cannot be assigned', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, false, false, true);
  const order = { id: randomUUID(), plate: '1', customer: '', items: [{ id: 'a', name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }], createdAt: '2026-10-07T14:00:00Z' };
  const write = (key, value, base = 0) => f.call('/change', { id: randomUUID(), key, value, base }, f.a.token);
  assert.equal((await write('order:' + order.id, order)).status, 200);
  const first = { orderId: order.id, status: 'preparing', updatedAt: '2026-10-07T14:01:00Z', startedAt: '2026-10-07T14:01:00Z', startedBy: 'other-store-user' };
  assert.equal((await write('preparation:' + order.id, first)).status, 400);
  const response = await write('preparation:' + order.id, { ...first, startedBy: 'admin' }); assert.equal(response.status, 200); const revision = (await response.json()).revision;
  assert.equal((await write('preparation:' + order.id, { ...first, status: 'ready', updatedAt: '2026-10-07T14:02:00Z', readyAt: '2026-10-07T14:02:00Z', startedBy: undefined }, revision)).status, 409);
});
