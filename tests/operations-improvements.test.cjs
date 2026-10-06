const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID, randomBytes, pbkdf2Sync } = require('node:crypto');
const { Script } = require('node:vm');
const { loadTs } = require('./helpers/load-ts.cjs');
const { fixture } = require('./helpers/business-fixture.cjs');
const { searchCatalog, isProductAvailable } = loadTs('src/services/catalogOptions.ts');
const { agendaWindow, shiftAgenda, preorderTiming } = loadTs('src/services/preorderAgenda.ts');
const { buildPrintPlan, customerReceiptPrinter, dispatchPrintPlan } = loadTs('src/services/printerRouting.ts');
const { inspectBackupSnapshot } = loadTs('src/services/backupRecovery.ts');
const date = () => new Date().toISOString();
const kitchen = () => ({ id: randomUUID(), plate: '7', customer: '', createdAt: date(), items: [{ id: randomUUID(), productId: 'pizza', name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] });
const write = (f, key, value, base = 0, actor = f.a, id = randomUUID()) => f.call('/change', { id, key, value, base }, actor.token);
async function ownerCookie(f) {
  const page = await f.adminResponse(new Request('https://example.com/admin'), f.env), csrf = page.headers.get('Set-Cookie').split(';')[0];
  const login = await f.adminResponse(new Request('https://example.com/admin/login', { method: 'POST', headers: { Cookie: csrf, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrf.split('=')[1], username: 'admin', password: f.env.ADMIN_VIEW_TOKEN }) }), f.env);
  assert.equal(login.status, 303); return login.headers.get('Set-Cookie').split(';')[0];
}
async function staff(f) {
  const salt = randomBytes(16).toString('hex'), hash = pbkdf2Sync('password', Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
  f.db.prepare('INSERT INTO store_records(store_id, key, data, revision) VALUES(?, ?, ?, 1)').run(f.a.storeId, 'user:staff', JSON.stringify({ username: 'staff', active: true, login: { salt, hash, iterations: 100000 } }));
  const login = await (await f.call('/login', { storeId: f.a.storeId, username: 'staff', password: 'password' })).json();
  return { storeId: f.a.storeId, username: 'staff', token: login.token };
}
const restrict = (f, access) => f.db.prepare('INSERT INTO store_access_settings(store_id, data) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET data = excluded.data').run(f.a.storeId, JSON.stringify(access));

test('catalog search matches accents, category and description; favorites preserve product identity and availability defaults', () => {
  const products = [{ id: 'a', name: 'Café', category: 'Bebidas', description: 'Quente' }, { id: 'b', name: 'Pizza', category: 'Comida' }], options = { b: { productId: 'b', available: false, favorite: true } };
  assert.equal(searchCatalog(products, options, ' cafe ')[0], products[0]);
  assert.equal(searchCatalog(products, options, 'QUENTE')[0], products[0]);
  assert.deepEqual(searchCatalog(products, options).map(p => p.id), ['b', 'a']);
  assert.deepEqual(searchCatalog(products, options, '', true).map(p => p.id), ['b']);
  assert.equal(isProductAvailable('a', options), true); assert.equal(isProductAvailable('b', options), false);
  assert.deepEqual(products.map(p => p.id), ['a', 'b']);
});

test('four independent owner flags support every combination, legacy metadata and valid portal JavaScript', async t => {
  const f = await fixture(t), cookie = await ownerCookie(f);
  for (let mask = 0; mask < 16; mask++) {
    const modules = { preorders: !!(mask & 1), cash: !!(mask & 2), customers: !!(mask & 4), preparation: !!(mask & 8) };
    const result = await f.adminResponse(new Request('https://example.com/admin/stores', { method: 'PATCH', headers: { Cookie: cookie, Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.a.storeId, name: 'Seabra 1', modules }) }), f.env);
    assert.equal(result.status, 200); assert.deepEqual((await result.json()).modules, modules);
    assert.deepEqual((await (await f.call('/store?storeId=seabra-1&moduleVersion=3')).json()).modules, modules);
  }
  assert.deepEqual((await (await f.call('/store?storeId=seabra-1&moduleVersion=2')).json()).modules, { preorders: true, cash: true, customers: true });
  assert.deepEqual((await (await f.call('/store?storeId=seabra-1')).json()).modules, { preorders: true, cash: true });
  const html = await (await f.adminResponse(new Request('https://example.com/admin', { headers: { Cookie: cookie } }), f.env)).text();
  assert.match(html, /name="preparation"/); assert.match(html, /admin\/activity/);
  for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Script(script[1]);
});

test('sold-out metadata syncs offline and detects conflicts without mutating or preventing old kitchen orders', async t => {
  const f = await fixture(t), a = f.tablet(), b = f.tablet();
  for (const tablet of [a, b]) { await tablet.cloud.setSession(f.a); await tablet.cloud.sync(); }
  const order = kitchen(); a.offline = true; await a.cloud.write({ ['order:' + order.id]: order });
  await b.cloud.write({ 'product-option:pizza': { productId: 'pizza', available: false, favorite: true } }); await b.cloud.sync();
  a.offline = false; await a.cloud.sync(); assert.equal(a.cloud.pending('order:' + order.id), false);
  assert.equal((await a.cloud.get('product-option:pizza')).available, false);
  const base = f.db.prepare('SELECT revision FROM store_records WHERE store_id = ? AND key = ?').get(f.a.storeId, 'order:' + order.id).revision;
  assert.equal((await write(f, 'order:' + order.id, { ...order, plate: '8' }, base)).status, 409);
  for (const tablet of [a, b]) { tablet.offline = true; await tablet.cloud.write({ 'product-option:pizza': { productId: 'pizza', available: true, favorite: tablet === a } }); tablet.offline = false; }
  await a.cloud.sync(); await b.cloud.sync(); assert.equal(b.cloud.status().status, 'CONFLICT');
  const old = await (await f.call('/changes', undefined, f.a.token)).json(); assert.ok(!old.changes.some(row => row.key.startsWith('product-option:')));
  assert.ok((await (await f.call('/changes?features=operations-v1', undefined, f.a.token)).json()).changes.some(row => row.key.startsWith('product-option:')));
});

test('Cash rejects a newly sold-out product but preserves confirmed retry identity and its receipt', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true);
  const opening = { operation: 'open', id: randomUUID(), deviceId: randomUUID(), openingCents: 0 }; await f.cash(opening);
  const sale = { operation: 'sale', id: randomUUID(), deviceId: opening.deviceId, sessionId: opening.id, items: kitchen().items.map(item => ({ ...item, unitPriceCents: 1000 })), customer: '', note: '', method: 'card' };
  const original = await f.cash(sale); assert.equal(original.status, 200);
  await write(f, 'product-option:pizza', { productId: 'pizza', available: false, favorite: false });
  assert.equal((await f.cash({ ...sale, id: randomUUID() })).value.error, 'PRODUCT_UNAVAILABLE');
  assert.deepEqual((await f.cash(sale)).value.receipt, original.value.receipt);
});

test('Preparation works alone, requires a synced kitchen order, moves forward and resolves competing stages through CAS', async t => {
  const f = await fixture(t), order = kitchen(), value = { orderId: order.id, status: 'preparing', updatedAt: date() }, key = 'preparation:' + order.id;
  assert.equal((await write(f, key, value)).status, 403);
  f.modules(f.a.storeId, false, false, false, true); assert.equal((await write(f, key, value)).status, 400);
  await write(f, 'order:' + order.id, order);
  const first = await write(f, key, value); assert.equal(first.status, 200); const base = (await first.json()).revision;
  const ready = await write(f, key, { ...value, status: 'ready' }, base); assert.equal(ready.status, 200);
  const conflict = await write(f, key, { ...value, status: 'completed' }, base); assert.equal(conflict.status, 409); assert.equal((await conflict.json()).error, 'CONFLICT');
  assert.equal((await write(f, key, value, (await ready.json()).revision)).status, 409);
  assert.equal((await write(f, key, { ...value, status: 'completed' }, base, f.b)).status, 403);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM cash_sessions').get().n, 0);
});

test('offline preparation coalesces progress, retains audit events and waits for its source order; disabling keeps kitchen sync working', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, false, false, true);
  const a = f.tablet(); await a.cloud.setSession(f.a); await a.cloud.sync(); a.offline = true;
  const order = kitchen(); await a.cloud.write({ ['order:' + order.id]: order });
  for (const status of ['preparing', 'ready', 'completed']) { const id = randomUUID(); await a.cloud.write({ ['preparation:' + order.id]: { orderId: order.id, status, updatedAt: date() }, ['activity:' + id]: { id, kind: 'preparation', target: order.id, details: status, createdAt: date() } }); }
  const reloaded = f.tablet(a.saved); await reloaded.cloud.setSession(f.a); await reloaded.cloud.sync();
  assert.equal(reloaded.cloud.pending('preparation:' + order.id), false); assert.equal((await reloaded.cloud.get('preparation:' + order.id)).status, 'completed');
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM store_events WHERE key LIKE 'activity:%'").get().n, 3);
  const second = kitchen(); reloaded.offline = true; await reloaded.cloud.write({ ['order:' + second.id]: second, ['preparation:' + second.id]: { orderId: second.id, status: 'ready', updatedAt: date() } });
  f.modules(f.a.storeId, false, false); reloaded.offline = false; await reloaded.cloud.sync();
  assert.equal(reloaded.cloud.pending('order:' + second.id), false); assert.ok(reloaded.cloud.pending('preparation:' + second.id));
  f.modules(f.a.storeId, false, false, false, true); await reloaded.cloud.sync(); assert.equal(reloaded.cloud.pending('preparation:' + second.id), false);
});

test('agenda uses local calendar boundaries including DST, while alerts exclude completed/cancelled orders', () => {
  const prior = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    const spring = agendaWindow('2026-03-08', 'day'), fall = agendaWindow('2026-11-01', 'day');
    assert.equal(spring.end - spring.start, 23 * 3600000); assert.equal(fall.end - fall.start, 25 * 3600000);
    const week = agendaWindow('2026-03-08', 'week'); assert.equal(week.end - week.start, 167 * 3600000);
    assert.equal(shiftAgenda('2026-12-31', 1), '2027-01-01'); assert.throws(() => agendaWindow('2026-02-30', 'day'));
    const now = Date.parse('2026-10-05T12:00:00Z');
    assert.equal(preorderTiming('2026-10-05T11:59:59Z', 'scheduled', now), 'Atrasada'); assert.equal(preorderTiming('2026-10-05T13:00:00Z', 'ready', now), 'Próxima hora');
    for (const status of ['completed', 'cancelled']) assert.equal(preorderTiming('2026-10-05T11:00:00Z', status, now), '');
  } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
});

const printer = () => ({ connection: 'wifi', name: 'Principal', address: '192.168.1.10', port: '9100', paperWidth: '80', routing: { enabled: true, destinations: [{ id: 'oven', name: 'Forno', address: '192.168.1.11', port: '9100', paperWidth: '58', categories: ['Pizzas'] }, { id: 'receipt', name: 'Recibos', address: '192.168.1.12', port: '9100', paperWidth: '80', categories: [] }], receiptDestinationId: 'receipt' } });
test('printing routes each item once, keeps default categories and validates all endpoints before dispatch', () => {
  const settings = printer(), order = kitchen(); order.items.push({ ...order.items[0], id: randomUUID(), category: 'Bebidas' });
  const plan = buildPrintPlan(order, settings); assert.deepEqual(plan.map(job => job.id), ['oven', 'default']); assert.equal(plan[0].settings.paperWidth, '58');
  assert.deepEqual(plan.flatMap(job => job.order.items).map(item => item.id), order.items.map(item => item.id)); assert.equal(plan[0].order.id, order.id);
  assert.equal(customerReceiptPrinter(settings).address, '192.168.1.12');
  const disabled = { ...settings, routing: { ...settings.routing, enabled: false } }; assert.equal(buildPrintPlan(order, disabled).length, 1); assert.equal(customerReceiptPrinter(disabled), disabled);
  settings.routing.destinations[1].categories = ['Pizzas']; assert.throws(() => buildPrintPlan(order, settings));
  settings.routing.destinations[1].categories = []; settings.routing.destinations[1].address = '999.1.1.1'; assert.throws(() => buildPrintPlan(order, settings));
});
test('a partial printer failure never resends confirmed destinations on an explicit retry', async () => {
  const order = kitchen(); order.items.push({ ...order.items[0], category: 'Bebidas' }); const plan = buildPrintPlan(order, printer()), completed = new Set(), sent = [];
  await assert.rejects(dispatchPrintPlan(plan, completed, async job => { sent.push(job.id); if (job.id === 'default') throw Error('timeout'); }, () => {}));
  assert.deepEqual([...completed], ['oven']);
  await dispatchPrintPlan(plan, completed, async job => sent.push(job.id), () => {}); assert.deepEqual(sent, ['oven', 'default', 'default']);
});

test('access restrictions apply on server and offline, preserve revoked queues and allow independent kitchen orders', async t => {
  const f = await fixture(t), employee = await staff(f), a = f.tablet(new Map(), employee); await a.cloud.setSession(employee); await a.cloud.sync();
  a.offline = true; await a.cloud.write({ menu: [{ id: 'pizza', name: 'Pizza', category: 'Pizzas', price: 10 }] });
  const access = { menu: [], settings: [], reprint: [], restore: [] }; restrict(f, access); a.offline = false; await a.cloud.sync();
  assert.equal(a.cloud.pending('menu'), true); assert.equal(a.cloud.allowed('menu'), false); assert.equal(a.cloud.allowed('menu', 'admin'), true);
  assert.equal((await write(f, 'product-option:pizza', { productId: 'pizza', available: false, favorite: false }, 0, employee)).status, 403);
  assert.equal((await write(f, 'order-settings', { requireCustomer: true }, 0, employee)).status, 403);
  a.offline = true; await assert.rejects(a.cloud.write({ menu: [] }), e => e.code === 'ACCESS_DENIED');
  const order = kitchen(); await a.cloud.write({ ['order:' + order.id]: order }); a.offline = false; await a.cloud.sync(); assert.equal(a.cloud.pending('order:' + order.id), false);
  const restarted = f.tablet(a.saved, employee); restarted.offline = true; await restarted.cloud.load(); restarted.cloud.setOfflineActor('staff'); assert.equal(restarted.cloud.allowed('restore'), false);
  await assert.rejects(restarted.cloud.restoreMissing(JSON.parse(a.saved.get('@comandadigitalprint/cloud-v1'))), e => e.code === 'ACCESS_DENIED');
});

test('owner validates access members and audit pagination retains timestamp ties with store isolation', async t => {
  const f = await fixture(t), employee = await staff(f), cookie = await ownerCookie(f);
  const change = access => f.adminResponse(new Request('https://example.com/admin/stores', { method: 'PATCH', headers: { Cookie: cookie, Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.a.storeId, name: 'Seabra 1', access }) }), f.env);
  assert.equal((await change({ menu: ['missing'], settings: null, reprint: null, restore: null })).status, 400);
  assert.equal((await change({ menu: ['staff'], settings: [], reprint: [], restore: [] })).status, 200);
  const option = { productId: 'pizza', available: true, favorite: true }; assert.equal((await write(f, 'product-option:pizza', option, 0, employee)).status, 200);
  const stamp = '2026-10-04T12:00:00.000Z';
  for (let i = 0; i < 110; i++) f.db.prepare('INSERT INTO store_admin_activity(store_id, created_at, actor, action) VALUES(?, ?, ?, ?)').run(f.a.storeId, stamp, 'owner', 'event-' + i);
  f.db.prepare('INSERT INTO store_admin_activity(store_id, created_at, actor, action) VALUES(?, ?, ?, ?)').run(f.a.storeId, '2026-10-03T00:00:00Z', 'owner', 'older');
  const query = suffix => f.adminResponse(new Request('https://example.com/admin/activity?storeId=seabra-1' + suffix, { headers: { Cookie: cookie } }), f.env);
  assert.equal((await f.adminResponse(new Request('https://example.com/admin/activity'), f.env)).status, 401);
  const first = await (await query('')).json(); assert.equal(first.events.filter(row => row.created_at === stamp).length, 110); assert.ok(first.events.some(row => row.actor === 'staff')); assert.equal(first.before, stamp);
  const second = await (await query('&before=' + encodeURIComponent(first.before))).json(); assert.deepEqual(second.events.map(row => row.action), ['older']);
  const other = await (await f.adminResponse(new Request('https://example.com/admin/activity?storeId=seabra-2', { headers: { Cookie: cookie } }), f.env)).json(); assert.equal(other.events.length, 0);
  assert.ok(!JSON.stringify(first).includes('hash')); assert.ok(!JSON.stringify(first).includes('password'));
});

test('backup verification rejects wrong identities and malformed values or queues', () => {
  const deviceId = randomUUID(), order = kitchen(), key = 'order:' + order.id, row = { key, value: order, revision: 0 }, snapshot = { version: 1, storeId: 'seabra-1', deviceId, cursor: 0, values: { [key]: row }, pending: { [key]: { key, value: order, base: 0, id: randomUUID() } } };
  assert.equal(inspectBackupSnapshot(snapshot, 'seabra-1', deviceId).orders, 1);
  for (const bad of [{ ...snapshot, deviceId: randomUUID() }, { ...snapshot, storeId: 'seabra-2' }, { ...snapshot, values: [] }, { ...snapshot, pending: { [key]: { ...snapshot.pending[key], value: { ...order, plate: 'different' } } } }, { ...snapshot, cashAttempt: { operation: 'sale' } }]) assert.throws(() => inspectBackupSnapshot(bad, 'seabra-1', deviceId));
});

test('local recovery fills missing records, preserves newer edits and replays exactly the backed-up cash attempt', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true);
  const a = f.tablet(); await a.cloud.setSession(f.a); await a.cloud.sync();
  const opening = { operation: 'open', id: randomUUID(), openingCents: 0 }; await a.cloud.cashCommand(opening);
  const sale = { operation: 'sale', id: randomUUID(), sessionId: opening.id, items: kitchen().items.map(item => ({ ...item, unitPriceCents: 1000 })), method: 'card', customer: '', note: '' };
  a.loseCashAck = true; await assert.rejects(a.cloud.cashCommand(sale));
  const snapshot = JSON.parse(a.saved.get('@comandadigitalprint/cloud-v1')), order = kitchen(), key = 'order:' + order.id;
  snapshot.values[key] = { key, value: order, revision: 0 }; snapshot.pending[key] = { key, value: order, base: 0, id: randomUUID() };
  snapshot.values.menu = { key: 'menu', value: [], revision: 0 };
  await a.cloud.write({ menu: [{ id: 'new', name: 'Atual', category: 'Pizzas', price: 10 }] });
  assert.equal(await a.cloud.restoreMissing(snapshot), 1); assert.equal((await a.cloud.get('menu'))[0].name, 'Atual');
  assert.deepEqual(a.cloud.pendingCashCommand(), sale); assert.equal(a.cloud.pending(key), true);
  const result = await a.cloud.cashCommand(a.cloud.pendingCashCommand()); assert.equal(result.receipt.totalCents, 1000);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM cash_entries WHERE kind = 'sale'").get().n, 1);
  await a.cloud.sync(); assert.equal(a.cloud.pending(key), false);
});

test('replacement tablet rereads cloud records without cloning printer preferences or cash identity', async t => {
  const f = await fixture(t), original = f.tablet(); await original.cloud.setSession(f.a); await original.cloud.sync();
  const order = kitchen(), oldId = original.cloud.identity(); await original.cloud.write({ ['order:' + order.id]: order, ['printer:' + oldId]: { connection: 'wifi', name: 'Old', address: '192.168.1.10', port: '9100', paperWidth: '80' } }); await original.cloud.sync();
  const replacement = f.tablet(); await replacement.cloud.setSession(f.a); await replacement.cloud.sync(); const newId = replacement.cloud.identity(); assert.notEqual(newId, oldId);
  const state = JSON.parse(replacement.saved.get('@comandadigitalprint/cloud-v1')); delete state.values['order:' + order.id]; replacement.saved.set('@comandadigitalprint/cloud-v1', JSON.stringify(state));
  const restarted = f.tablet(replacement.saved); await restarted.cloud.setSession(f.a); await restarted.cloud.recoverFromCloud();
  assert.equal((await restarted.cloud.get('order:' + order.id)).plate, '7'); assert.equal(restarted.cloud.identity(), newId);
  assert.equal(await restarted.cloud.get('printer:' + newId), undefined);
});
