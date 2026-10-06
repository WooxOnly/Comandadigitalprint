const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID, randomBytes, pbkdf2Sync } = require('node:crypto');
const fs = require('node:fs');
const { Script } = require('node:vm');
const { fixture } = require('./helpers/business-fixture.cjs');
const { loadTs } = require('./helpers/load-ts.cjs');
const { calculateSale } = require('../shared/cash-pricing.mjs');
const { normalizePayments } = require('../shared/cash-payments.mjs');
const { prepareRefund, remainingRefund } = require('../shared/cash-refunds.mjs');
const customer = () => ({ id: randomUUID(), name: 'Ana', phone: '555-1234', email: '', addresses: ['123 Main St', '456 Elm St'], notes: 'Preferência de contato', active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
const items = () => [{ id: randomUUID(), name: 'Pizza', category: 'Pizzas', quantity: 2, unitPriceCents: 1000, note: '' }, { id: randomUUID(), name: 'Bebida', category: 'Bebidas', quantity: 1, unitPriceCents: 333, note: '' }];
const open = (openingCents = 5000) => ({ id: randomUUID(), operation: 'open', deviceId: randomUUID(), openingCents });
const sale = (session, extra = {}) => ({ operation: 'sale', id: randomUUID(), deviceId: session.deviceId, sessionId: session.id, customer: 'Ana', note: '', items: items(), method: 'card', ...extra });
const reversal = (session, original, refund = { mode: 'full' }) => ({ operation: 'refund', id: randomUUID(), deviceId: session.deviceId, sessionId: session.id, saleId: original.id, reason: 'Devolução solicitada', refund });
const write = (f, value, prefix = 'customer:', base = 0, actor = f.a) => f.call('/change', { id: randomUUID(), key: prefix + value.id, value, base }, actor.token);
const report = async f => { const result = await f.call('/cash/report?' + new URLSearchParams({ start: '2026-01-01T00:00:00.000Z', end: '2027-01-01T00:00:00.000Z', timeZone: 'America/New_York' }), undefined, f.a.token); assert.equal(result.status, 200); return result.json(); };
async function staff(f, username = 'staff') {
  const salt = randomBytes(16).toString('hex'), hash = pbkdf2Sync('password', Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
  f.db.prepare('INSERT INTO store_records(store_id, key, data, revision) VALUES(?, ?, ?, 1)').run(f.a.storeId, 'user:' + username, JSON.stringify({ username, active: true, login: { salt, hash, iterations: 100000 } }));
  const login = await (await f.call('/login', { storeId: f.a.storeId, username, password: 'password' })).json(); assert.ok(login.token);
  return { storeId: f.a.storeId, username, token: login.token };
}
async function ownerCookie(f) {
  const page = await f.adminResponse(new Request('https://example.com/admin'), f.env), csrf = page.headers.get('Set-Cookie').split(';')[0];
  const login = await f.adminResponse(new Request('https://example.com/admin/login', { method: 'POST', headers: { Cookie: csrf, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrf.split('=')[1], username: 'admin', password: f.env.ADMIN_VIEW_TOKEN }) }), f.env);
  assert.equal(login.status, 303); return login.headers.get('Set-Cookie').split(';')[0];
}

test('owner portal retains three-flag client compatibility and defaults off', async t => {
  const f = await fixture(t), cookie = await ownerCookie(f);
  const change = modules => f.adminResponse(new Request('https://example.com/admin/stores', { method: 'PATCH', headers: { Cookie: cookie, Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.a.storeId, name: 'Seabra 1', modules }) }), f.env);
  assert.deepEqual((await (await f.call('/store?storeId=seabra-1&moduleVersion=2')).json()).modules, { preorders: false, cash: false, customers: false });
  for (let mask = 0; mask < 8; mask++) {
    const modules = { preorders: !!(mask & 1), cash: !!(mask & 2), customers: !!(mask & 4) };
    assert.deepEqual((await (await change(modules)).json()).modules, { ...modules, preparation: false });
    assert.deepEqual((await (await f.call('/store?storeId=seabra-1&moduleVersion=2')).json()).modules, modules);
    assert.deepEqual((await (await f.call('/store?storeId=seabra-2&moduleVersion=2')).json()).modules, { preorders: false, cash: false, customers: false });
  }
  assert.equal((await change({ preorders: false, cash: false, customers: 'yes' })).status, 400);
  assert.equal((await change({ preorders: false, cash: false, customers: true, fourth: true })).status, 400);
  await change({ preorders: false, cash: false }); // old portal payload keeps Customers
  assert.equal((await (await f.call('/store?storeId=seabra-1&moduleVersion=2')).json()).modules.customers, true);
  assert.deepEqual((await (await f.call('/store?storeId=seabra-1')).json()).modules, { preorders: false, cash: false });
  const panel = await (await f.adminResponse(new Request('https://example.com/admin', { headers: { Cookie: cookie } }), f.env)).text();
  for (const name of ['cash', 'preorders', 'customers']) assert.match(panel, new RegExp('name="' + name + '"'));
  for (const script of panel.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Script(script[1]);
  f.db.exec(fs.readFileSync('server/cloudflare/store-schema.sql', 'utf8'));
  assert.equal((await (await f.call('/store?storeId=seabra-1&moduleVersion=2')).json()).modules.customers, true);
});

test('customer registry runs alone, syncs offline, preserves disabled queues and detects conflicting edits', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, false, true);
  const a = f.tablet(), b = f.tablet(); for (const tablet of [a, b]) { await tablet.cloud.setSession(f.a); await tablet.cloud.sync(); }
  const record = customer(); a.offline = true; await a.cloud.write({ ['customer:' + record.id]: record });
  const restored = f.tablet(a.saved); restored.offline = true; await restored.cloud.load();
  assert.equal(restored.cloud.modules().customers, true); assert.equal((await restored.cloud.list('customer:'))[0].name, record.name);
  f.modules(f.a.storeId, false, false, false); a.offline = false; await a.cloud.sync(); assert.ok(a.cloud.pending('customer:' + record.id));
  const disabled = customer();
  await assert.rejects(a.cloud.write({ ['customer:' + disabled.id]: disabled }), error => error.code === 'MODULE_DISABLED');
  f.modules(f.a.storeId, false, false, true); await a.cloud.sync(); await b.cloud.sync();
  assert.equal((await b.cloud.list('customer:'))[0].addresses.length, 2);
  for (const [tablet, notes] of [[a, 'A'], [b, 'B']]) { tablet.offline = true; await tablet.cloud.write({ ['customer:' + record.id]: { ...record, notes } }); tablet.offline = false; }
  await a.cloud.sync(); await b.cloud.sync(); assert.equal(b.cloud.status().status, 'CONFLICT');
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM cash_sessions').get().n, 0);
  const kitchen = { id: randomUUID(), plate: '1', customer: '', items: [{ id: randomUUID(), name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }], createdAt: new Date().toISOString() };
  assert.equal((await write(f, kitchen, 'order:')).status, 200);
});

test('customers validate, archive instead of deleting and remain isolated between companies', async t => {
  const f = await fixture(t), record = customer(); assert.equal((await write(f, record)).status, 403);
  f.modules(f.a.storeId, false, false, true); f.modules(f.b.storeId, false, false, true);
  for (const invalid of [{ ...record, name: ' ' }, { ...record, phone: '', email: '' }, { ...record, addresses: Array(11).fill('address') }, { ...record, active: 1 }]) assert.equal((await write(f, invalid)).status, 400);
  const saved = await write(f, record); assert.equal(saved.status, 200); const revision = (await saved.json()).revision;
  assert.equal((await write(f, { ...record, active: false }, 'customer:', revision)).status, 200);
  assert.equal((await f.call('/customers/history?customerId=' + record.id, undefined, f.b.token)).status, 404);
  assert.equal((await f.call('/customers/history?customerId=' + record.id)).status, 401);
  assert.equal((await f.call('/customers/history?customerId=' + record.id, undefined, f.a.token)).status, 200);
  f.modules(f.a.storeId, false, false, false); assert.equal((await f.call('/customers/history?customerId=' + record.id, undefined, f.a.token)).status, 403);
  assert.ok(f.db.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').get(f.a.storeId, 'customer:' + record.id));
});

test('optional customer links capture names, include all tablets in history and allow old records after module disabled', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, true, true, true); const record = customer(); await write(f, record);
  const order = { id: randomUUID(), customerId: record.id, customer: record.name, contact: record.phone, address: record.addresses[0], fulfillment: 'delivery', delivery: { feeCents: 500, driver: '', status: 'pending' }, dueAt: '2026-12-15T18:00:00.000Z', createdAt: new Date().toISOString(), status: 'scheduled', items: items() };
  const saved = await write(f, order, 'preorder:'); assert.equal(saved.status, 200); const revision = (await saved.json()).revision;
  for (let index = 0; index < 2; index++) { const session = open(); await f.cash(session); assert.equal((await f.cash(sale(session, { customerId: record.id }))).status, 200); }
  const history = await (await f.call('/customers/history?customerId=' + record.id, undefined, f.a.token)).json(); assert.equal(history.sales.length, 2); assert.equal(history.preorders.length, 1); assert.ok(history.sales.every(sale => sale.totalCents === 2333));
  const employee = await staff(f);
  const staffHistory = await (await f.call('/customers/history?customerId=' + record.id, undefined, employee.token)).json(); assert.ok(staffHistory.sales.every(sale => sale.totalCents === undefined));
  f.modules(f.a.storeId, true, true, false);
  assert.equal((await write(f, { ...order, status: 'ready' }, 'preorder:', revision)).status, 200);
  const session = open(); await f.cash(session); assert.equal((await f.cash(sale(session, { customerId: record.id }))).value.error, 'MODULE_DISABLED');
  assert.equal((await f.cash(sale(session))).status, 200);
  f.modules(f.a.storeId, false, false, true);
  const alone = await (await f.call('/customers/history?customerId=' + record.id, undefined, f.a.token)).json(); assert.deepEqual(alone.sales, []); assert.deepEqual(alone.preorders, []);
});

test('delivery fee and driver work without Cash, enforce dispatch/delivery timestamps and protect completed deliveries', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, true, false);
  const order = { id: randomUUID(), customer: 'Ana', contact: '555', address: 'Main St', fulfillment: 'delivery', delivery: { feeCents: 500, driver: '', status: 'pending' }, dueAt: '2026-12-15T18:00:00.000Z', createdAt: new Date().toISOString(), status: 'scheduled', items: items().map(({ unitPriceCents, ...item }) => item) };
  const initial = await write(f, order, 'preorder:'); assert.equal(initial.status, 200); let base = (await initial.json()).revision;
  for (const delivery of [{ ...order.delivery, status: 'out' }, { ...order.delivery, status: 'out', driver: 'Pedro' }, { ...order.delivery, feeCents: -1 }]) assert.equal((await write(f, { ...order, delivery }, 'preorder:', base)).status, 400);
  const out = { ...order, delivery: { ...order.delivery, driver: 'Pedro', status: 'out', dispatchedAt: '2026-10-05T16:00:00.000Z' } };
  const dispatched = await write(f, out, 'preorder:', base); assert.equal(dispatched.status, 200); base = (await dispatched.json()).revision;
  assert.equal((await write(f, order, 'preorder:', base)).status, 409);
  assert.equal((await write(f, { ...out, status: 'completed' }, 'preorder:', base)).status, 400);
  const delivered = { ...out, delivery: { ...out.delivery, status: 'delivered', deliveredAt: '2026-10-05T17:00:00.000Z' } };
  const saved = await write(f, delivered, 'preorder:', base); assert.equal(saved.status, 200); base = (await saved.json()).revision;
  assert.equal((await write(f, { ...delivered, delivery: { ...delivered.delivery, driver: 'Other' } }, 'preorder:', base)).status, 409);
  assert.equal((await write(f, { ...delivered, status: 'completed' }, 'preorder:', base)).status, 200);
});

test('split cash/card/Zelle with tips and delivery reconciles tax, change, drawer and immutable retry', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true);
  f.db.prepare('INSERT INTO store_cash_settings(store_id, data) VALUES(?, ?)').run(f.a.storeId, JSON.stringify({ tax: { enabled: true, rateBps: 725 }, managers: [] }));
  const session = open(); await f.cash(session);
  const transaction = sale(session, { discount: { kind: 'amount', value: 233, reason: 'Desconto' }, taxRateBps: 725, tipCents: 400, deliveryFeeCents: 250, payments: [{ method: 'zelle', amountCents: 920 }, { method: 'cash', amountCents: 1000, tenderedCents: 1200 }, { method: 'card', amountCents: 1000 }] });
  let result = await f.cash(transaction); assert.equal(result.status, 200); const receipt = result.value.receipt;
  assert.equal(receipt.subtotalCents, 2333); assert.equal(receipt.taxCents, 170); assert.equal(receipt.totalCents, 2920); assert.equal(receipt.changeCents, 200); assert.equal(receipt.method, 'split');
  assert.deepEqual(result.value.sessions[0].summary, { cashCents: 1000, cardCents: 1000, zelleCents: 920, inCents: 0, outCents: 0, expectedCents: 6000 });
  assert.deepEqual((await f.cash(transaction)).value.receipt, receipt);
  assert.equal((await f.cash({ ...transaction, tipCents: 399, deliveryFeeCents: 251 })).value.error, 'INVALID_RETRY');
  assert.equal((await f.cash({ ...transaction, payments: [{ method: 'cash', amountCents: 920, tenderedCents: 1120 }, { method: 'card', amountCents: 2000 }] })).value.error, 'INVALID_RETRY');
  const totals = (await report(f)).totals; assert.equal(totals.netSalesCents, 2100); assert.equal(totals.netTipCents, 400); assert.equal(totals.netDeliveryFeeCents, 250); assert.equal(totals.netReceiptsCents, 2920);
  assert.equal(totals.netReceiptsCents, totals.netSalesCents + totals.netTaxCents + totals.netTipCents + totals.netDeliveryFeeCents);
});

test('payments reject duplicates, invalid legs, insufficient cash and unmatched totals before recording', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true); const session = open(); await f.cash(session);
  for (const payments of [[], [{ method: 'cash', amountCents: 2333, tenderedCents: 1 }], [{ method: 'cash', amountCents: 1000 }, { method: 'cash', amountCents: 1333 }], [{ method: 'bank', amountCents: 2333 }], [{ method: 'card', amountCents: -1 }], [{ method: 'zelle', amountCents: 2300 }], [{ method: 'card', amountCents: 2400 }]]) assert.equal((await f.cash(sale(session, { payments }))).status, 400);
  assert.equal((await f.cash(sale(session, { tipCents: -1 }))).status, 400);
  assert.equal((await f.cash(sale(session, { deliveryFeeCents: 1.1 }))).status, 400);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM cash_entries').get().n, 0);
});

test('successive item/amount/full refunds reconcile quantities, components, methods, tips and delivery', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true); const session = open(); await f.cash(session);
  const transaction = sale(session, { tipCents: 400, deliveryFeeCents: 250, payments: [{ method: 'cash', amountCents: 1000, tenderedCents: 1200 }, { method: 'card', amountCents: 1000 }, { method: 'zelle', amountCents: 983 }] });
  const original = (await f.cash(transaction)).value.receipt; assert.equal(original.totalCents, 2983);
  const first = reversal(session, transaction, { mode: 'items', items: [{ index: 0, quantity: 1 }], refundTip: false, refundDeliveryFee: false });
  const firstResult = await f.cash(first); assert.equal(firstResult.status, 200); assert.equal(firstResult.value.entries[0].reversal.partial, true); assert.equal(firstResult.value.entries[0].reversal.amountCents, 1000);
  assert.equal((await f.cash(first)).status, 200);
  assert.equal((await f.cash({ ...first, refund: { ...first.refund, refundTip: true } })).value.error, 'INVALID_RETRY');
  let current = await report(f); assert.equal(current.totals.netSalesCents, 1333); assert.equal(current.totals.netTipCents, 400); assert.equal(current.products.find(row => row.name === 'Pizza').reversedQuantity, 1);
  const second = reversal(session, transaction, { mode: 'amount', amountCents: 500 }); assert.equal((await f.cash(second)).status, 200);
  assert.equal((await f.cash(reversal(session, transaction, { mode: 'amount', amountCents: 2000 }))).status, 400);
  const third = reversal(session, transaction); const returned = await f.cash(third); assert.equal(returned.status, 200);
  assert.equal(returned.value.entries[0].reversal.remainingCents, 0); assert.equal(returned.value.sessions[0].summary.expectedCents, 5000);
  assert.equal((await f.cash(reversal(session, transaction))).value.error, 'SALE_ALREADY_REVERSED');
  current = await report(f); for (const key of ['netSalesCents', 'netTaxCents', 'netTipCents', 'netDeliveryFeeCents', 'netReceiptsCents']) assert.equal(current.totals[key], 0);
  assert.equal(current.totals.refundCount, 3); assert.ok(current.methods.every(row => row.netCents === 0)); assert.ok(current.products.every(row => row.netQuantity === 0 && row.netSalesCents === 0));
  assert.deepEqual(JSON.parse(f.db.prepare('SELECT data FROM cash_entries WHERE id = ?').get(transaction.id).data), original);
});

test('selected item refunds bound remaining quantities and can return just tip or delivery with tax', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true); const session = open(); await f.cash(session);
  const transaction = sale(session, { tipCents: 100, deliveryFeeCents: 200 }); await f.cash(transaction);
  for (const refund of [{ mode: 'items', items: [{ index: 0, quantity: 3 }], refundTip: false, refundDeliveryFee: false }, { mode: 'items', items: [{ index: 0, quantity: 1 }, { index: 0, quantity: 1 }], refundTip: false, refundDeliveryFee: false }, { mode: 'items', items: [{ index: -1, quantity: 1 }], refundTip: false, refundDeliveryFee: false }]) assert.equal((await f.cash(reversal(session, transaction, refund))).value.error, 'INVALID_REFUND');
  assert.equal((await f.cash(reversal(session, transaction, { mode: 'items', items: [], refundTip: true, refundDeliveryFee: false }))).status, 200);
  assert.equal((await f.cash(reversal(session, transaction, { mode: 'items', items: [], refundTip: true, refundDeliveryFee: false }))).value.error, 'INVALID_REFUND');
  assert.equal((await f.cash(reversal(session, transaction, { mode: 'items', items: [], refundTip: false, refundDeliveryFee: true }))).status, 200);
  const reportValue = await report(f); assert.equal(reportValue.totals.netTipCents, 0); assert.equal(reportValue.totals.netDeliveryFeeCents, 0); assert.equal(reportValue.totals.netSalesCents, 2333); assert.ok(reportValue.products.every(row => row.reversedQuantity === 0));
});

test('partial refunds require manager, cannot exceed drawer, and prevent void after partial return', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true); const session = open(0); await f.cash(session);
  const transaction = sale(session, { items: [{ ...items()[0], quantity: 1 }], payments: [{ method: 'cash', amountCents: 500 }, { method: 'card', amountCents: 500 }] }); await f.cash(transaction);
  const employee = await staff(f), partial = reversal(session, transaction, { mode: 'amount', amountCents: 400 });
  assert.equal((await f.cash(partial, employee)).value.error, 'MANAGER_REQUIRED');
  await f.cash({ operation: 'out', id: randomUUID(), sessionId: session.id, deviceId: session.deviceId, amountCents: 500, note: 'Retirada' });
  assert.equal((await f.cash(partial)).value.error, 'INSUFFICIENT_CASH');
  await f.cash({ operation: 'in', id: randomUUID(), sessionId: session.id, deviceId: session.deviceId, amountCents: 200, note: 'Reposição' });
  assert.equal((await f.cash(partial)).status, 200);
  assert.equal((await f.cash({ ...reversal(session, transaction), operation: 'void' })).value.error, 'VOID_AFTER_REFUND');
  assert.equal((await f.cash({ ...reversal(session, transaction), reason: '' })).value.error, 'INVALID_DATA');
  f.modules(f.b.storeId, false, true); const other = open(); await f.cash(other, f.b);
  assert.equal((await f.cash(reversal(other, transaction), f.b)).value.error, 'SALE_NOT_FOUND');
});

test('simultaneous partial refunds atomically bound total returned and leave remaining balance refundable', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true); const session = open(); await f.cash(session);
  const transaction = sale(session, { items: [{ ...items()[0], quantity: 1 }] }); await f.cash(transaction);
  const prepare = f.env.DB.prepare;
  let arrived = 0, release; const barrier = new Promise(resolve => { release = resolve; });
  f.env.DB.prepare = sql => {
    const wrap = statement => ({ ...statement, bind: (...args) => wrap(statement.bind(...args)), all: async () => {
      const result = await statement.all();
      if (sql.startsWith('SELECT * FROM cash_reversals WHERE store_id = ? AND sale_id = ?') && arrived < 2) { arrived++; if (arrived === 2) release(); await barrier; }
      return result;
    } });
    return wrap(prepare(sql));
  };
  const attempts = await Promise.all([1, 2].map(() => f.cash(reversal(session, transaction, { mode: 'amount', amountCents: 600 }))));
  f.env.DB.prepare = prepare;
  assert.deepEqual(attempts.map(value => value.status).sort(), [200, 409]);
  assert.equal(f.db.prepare('SELECT SUM(amount_cents) AS amount FROM cash_reversals WHERE sale_id = ?').get(transaction.id).amount, 600);
  assert.equal((await f.cash(reversal(session, transaction))).status, 200);
  assert.equal(f.db.prepare('SELECT SUM(amount_cents) AS amount FROM cash_reversals WHERE sale_id = ?').get(transaction.id).amount, 1000);
});

test('partial refund after close preserves original counted balance and retry survives lost acknowledgement', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, false, true); const tablet = f.tablet(); await tablet.cloud.setSession(f.a); await tablet.cloud.sync();
  const first = { operation: 'open', id: randomUUID(), openingCents: 1000 }; await tablet.cloud.cashCommand(first);
  const transaction = { ...sale({ ...first, deviceId: tablet.cloud.identity() }), payments: [{ method: 'cash', amountCents: 1000 }, { method: 'zelle', amountCents: 1333 }] }; delete transaction.deviceId;
  await tablet.cloud.cashCommand(transaction); await tablet.cloud.cashCommand({ operation: 'close', sessionId: first.id, countedCents: 2000 });
  const second = { operation: 'open', id: randomUUID(), openingCents: 2000 }; await tablet.cloud.cashCommand(second);
  const partial = { ...reversal({ ...second, deviceId: tablet.cloud.identity() }, transaction, { mode: 'amount', amountCents: 1000 }) }; delete partial.deviceId;
  tablet.loseCashAck = true; await assert.rejects(tablet.cloud.cashCommand(partial), error => error.code === 'UNAVAILABLE');
  const restored = f.tablet(tablet.saved); await restored.cloud.load(); await restored.cloud.setSession(f.a); const result = await restored.cloud.cashCommand(restored.cloud.pendingCashCommand());
  assert.equal(restored.cloud.pendingCashCommand(), null); assert.equal(f.db.prepare('SELECT count(*) AS n FROM cash_refunds').get().n, 1);
  const original = result.sessions.find(row => row.id === first.id); assert.equal(original.summary.expectedCents, 2000); assert.equal(original.countedCents, 2000);
  assert.equal((await report(f)).closings[0].differenceCents, 0);
});

test('rounding through mixed partial refunds conserves every cent and never exceeds payment or line balances', () => {
  for (let sample = 1; sample <= 100; sample++) {
    const lines = items().map((item, index) => ({ ...item, quantity: sample % 7 + 1, unitPriceCents: sample * 13 + index * 31 + 1 }));
    const pricing = calculateSale(lines, { kind: 'percent', value: 3333, reason: 'Discount' }, sample % 2 ? 725 : 0, { tipCents: sample * 5, deliveryFeeCents: sample * 3 });
    const receipt = { ...pricing, items: lines, payments: normalizePayments([{ method: 'cash', amountCents: Math.floor(pricing.totalCents / 3) }, { method: 'card', amountCents: pricing.totalCents - Math.floor(pricing.totalCents / 3) }], pricing.totalCents) };
    const history = [];
    for (const input of [{ mode: 'amount', amountCents: Math.floor(pricing.totalCents / 5) }, { mode: 'items', items: [{ index: 0, quantity: 1 }], refundTip: false, refundDeliveryFee: false }, { mode: 'full' }]) {
      const before = remainingRefund(receipt, history), refund = prepareRefund(receipt, history, input);
      assert.equal(refund.amountCents, refund.payments.reduce((sum, row) => sum + row.amountCents, 0));
      for (const payment of refund.payments) assert.ok(payment.amountCents <= before.payments.find(row => row.method === payment.method).amountCents);
      history.push({ data: refund });
      const after = remainingRefund(receipt, history); assert.equal(after.amountCents, before.amountCents - refund.amountCents);
      assert.ok(after.lines.every(line => line.netCents >= 0 && line.taxCents >= 0 && line.quantity >= 0));
    }
    assert.equal(remainingRefund(receipt, history).amountCents, 0);
    assert.equal(history.reduce((sum, row) => sum + row.data.amountCents, 0), pricing.totalCents);
  }
});

test('split receipts and CSV show tips, delivery, payment parts and partial refund details in all languages', () => {
  const { buildCustomerReceiptHtml, buildCustomerReceiptEscpos } = loadTs('src/services/customerReceipt.ts'), { cashReportCsv } = loadTs('src/services/cashReportCsv.ts');
  const receipt = { id: randomUUID(), storeName: 'Store <test>', currency: 'USD', createdAt: new Date().toISOString(), customer: 'Ana', items: items(), ...calculateSale(items(), undefined, 725, { tipCents: 100, deliveryFeeCents: 200 }), method: 'split', payments: [{ method: 'cash', amountCents: 1000, tenderedCents: 1200, changeCents: 200 }, { method: 'card', amountCents: 1817 }], tenderedCents: 3017, changeCents: 200, reversal: { id: randomUUID(), kind: 'refund', partial: true, createdAt: new Date().toISOString(), actor: 'admin', reason: '<reason>', amountCents: 100, remainingCents: 2717 } };
  for (const [language, tipLabel, refundLabel] of [['pt', 'Gorjeta', 'ESTORNO PARCIAL'], ['en', 'Tip', 'PARTIAL REFUND'], ['es', 'Propina', 'REEMBOLSO PARCIAL']]) {
    const html = buildCustomerReceiptHtml(receipt, '80', language), network = Buffer.from(buildCustomerReceiptEscpos(receipt, '80', language)).toString('latin1');
    assert.ok(html.includes(tipLabel)); assert.ok(html.includes(refundLabel)); assert.ok(network.includes(tipLabel)); assert.ok(network.includes(refundLabel)); assert.ok(html.includes('&lt;reason&gt;')); assert.ok(html.includes('1,000') === false);
  }
  const totals = { grossCents: 2333, discountCents: 0, taxCents: 184, reversedCents: 100, taxReversedCents: 0, netSalesCents: 2233, netTaxCents: 184, netReceiptsCents: 2717, tipCents: 100, tipReversedCents: 0, netTipCents: 100, deliveryFeeCents: 200, deliveryFeeReversedCents: 0, netDeliveryFeeCents: 200, inCents: 0, outCents: 0 };
  const csv = cashReportCsv({ storeName: '=unsafe', storeId: 'seabra-1', start: '', end: '', timeZone: 'UTC', generatedAt: '', totals, days: [], methods: [], products: [], closings: [], movements: [{ id: 'refund', kind: 'refund', method: 'split', amountCents: 100, actor: 'admin', reason: '=unsafe', createdAt: '', payments: receipt.payments, refund: { lines: [], amountCents: 100 } }] });
  for (const label of ['Tips received', 'Net tips', 'Delivery fees received', 'Payment parts (cents)', 'Refund details (cents)']) assert.ok(csv.includes(label)); assert.ok(csv.includes("'=unsafe")); assert.ok(csv.includes('amountCents'));
});

test('a disabled queued customer and linked preorder never block independent kitchen synchronization', async t => {
  const f = await fixture(t); f.modules(f.a.storeId, true, false, true); const tablet = f.tablet(); await tablet.cloud.setSession(f.a); await tablet.cloud.sync();
  tablet.offline = true; const record = customer(); await tablet.cloud.write({ ['customer:' + record.id]: record });
  const preorder = { id: randomUUID(), customer: record.name, customerId: record.id, contact: record.phone, address: '', fulfillment: 'pickup', dueAt: '2026-12-15T18:00:00.000Z', createdAt: new Date().toISOString(), status: 'scheduled', items: items() };
  await tablet.cloud.write({ ['preorder:' + preorder.id]: preorder });
  const kitchen = { id: randomUUID(), plate: '2', customer: '', createdAt: new Date().toISOString(), items: [{ id: randomUUID(), name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] };
  await tablet.cloud.write({ ['order:' + kitchen.id]: kitchen });
  f.modules(f.a.storeId, true, false, false); tablet.offline = false; await tablet.cloud.sync();
  assert.equal(tablet.cloud.pending('order:' + kitchen.id), false); assert.ok(tablet.cloud.pending('customer:' + record.id)); assert.ok(tablet.cloud.pending('preorder:' + preorder.id));
  f.modules(f.a.storeId, true, false, true); await tablet.cloud.sync(); assert.equal(tablet.cloud.status().pending, 0);
  const history = await tablet.cloud.customerHistory(record.id); assert.equal(history.preorders[0].id, preorder.id);
});
