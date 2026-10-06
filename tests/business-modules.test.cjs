const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const { Script } = require('node:vm');
const { loadTs } = require('./helpers/load-ts.cjs');
const { fixture } = require('./helpers/business-fixture.cjs');
const { parseMoney, businessTotal } = loadTs('src/services/business.ts');
const item = (price = 1250) => ({ id: randomUUID(), name: 'Pizza', category: 'Pizzas', quantity: 2, note: 'Sem cebola', unitPriceCents: price });
const preorder = (fulfillment = 'pickup') => ({ id: randomUUID(), customer: 'Ana', contact: '555-1234', address: fulfillment === 'delivery' ? '123 Main St' : '', fulfillment, dueAt: '2026-12-15T18:00:00Z', createdAt: new Date().toISOString(), status: 'scheduled', items: [{ ...item(), unitPriceCents: undefined }] });

const open = deviceId => ({ operation: 'open', deviceId, id: randomUUID(), openingCents: 10000 });
const sale = session => ({ operation: 'sale', deviceId: session.deviceId, sessionId: session.id, id: randomUUID(), customer: 'Ana', items: [item()], method: 'cash', tenderedCents: 3000, note: '' });

test('USD values use integer cents and reject invalid, negative or excessive amounts', () => {
  for (const [text, cents] of [['0', 0], ['0.10', 10], ['12,34', 1234], [' 1.5 ', 150], ['1000000.00', 100000000]]) assert.equal(parseMoney(text), cents);
  for (const text of ['', '-1', 'NaN', 'Infinity', '1e3', '1.001', '1,000.00', '1000000.01']) assert.throws(() => parseMoney(text));
  assert.equal(businessTotal([item(10), { ...item(33), quantity: 3 }]), 119);
  assert.throws(() => businessTotal([{ ...item(), unitPriceCents: undefined }]));
  assert.throws(() => businessTotal([item(0)]));
});

test('portal flags default off, validate booleans, require owner login and apply to one company', async t => {
  const f = await fixture(t);
  const defaults = await (await f.call('/store?storeId=seabra-1')).json();
  assert.deepEqual(defaults.modules, { preorders: false, cash: false });
  const page = await f.adminResponse(new Request('https://example.com/admin'), f.env);
  const csrfCookie = page.headers.get('Set-Cookie').split(';')[0];
  const login = await f.adminResponse(new Request('https://example.com/admin/login', { method: 'POST', headers: { Cookie: csrfCookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrfCookie.split('=')[1], username: 'admin', password: f.env.ADMIN_VIEW_TOKEN }) }), f.env);
  assert.equal(login.status, 303);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  const change = (body, method = 'PATCH', auth = cookie, origin = 'https://example.com') => f.adminResponse(new Request('https://example.com/admin/stores', { method, headers: { Cookie: auth, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), f.env);
  assert.equal((await change({ id: 'seabra-1', name: 'Changed', modules: { cash: true, preorders: false } }, 'PATCH', '')).status, 401);
  assert.equal((await change({ id: 'seabra-1', name: 'Changed', modules: { cash: true, preorders: false } }, 'PATCH', cookie, 'https://evil.example')).status, 403);
  for (const invalid of [{ cash: true }, { cash: 1, preorders: false }, { cash: true, preorders: false, extra: true }]) assert.equal((await change({ id: 'seabra-1', name: 'Seabra 1', modules: invalid })).status, 400);
  assert.equal((await change({ id: 'seabra-1', name: 'Seabra 1', modules: { cash: true, preorders: false } })).status, 200);
  assert.deepEqual((await (await f.call('/store?storeId=seabra-1')).json()).modules, { cash: true, preorders: false });
  assert.deepEqual((await (await f.call('/store?storeId=seabra-2')).json()).modules, { cash: false, preorders: false });
  const created = await (await change({ name: 'Orders only', modules: { cash: false, preorders: true } }, 'POST')).json();
  assert.deepEqual(created.modules, { cash: false, preorders: true, customers: false, preparation: false });
  const panel = await (await f.adminResponse(new Request('https://example.com/admin', { headers: { Cookie: cookie } }), f.env)).text();
  assert.match(panel, /name="preorders"/); assert.match(panel, /name="cash"/);
  for (const match of panel.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Script(match[1]);
  f.db.exec(fs.readFileSync('server/cloudflare/store-schema.sql', 'utf8'));
  assert.deepEqual((await (await f.call('/store?storeId=seabra-1')).json()).modules, { cash: true, preorders: false });
});

test('scheduled pickup and delivery work without Cash and cannot cross company boundaries', async t => {
  const f = await fixture(t); const record = preorder();
  const write = (value, session = f.a, base = 0) => f.call('/change', { id: randomUUID(), key: 'preorder:' + value.id, value, base }, session.token);
  assert.equal((await write(record)).status, 403);
  f.modules('seabra-1', true, false);
  const response = await write(record); assert.equal(response.status, 200);
  const revision = (await response.json()).revision;
  assert.equal((await write({ ...record, status: 'ready' }, f.a, revision)).status, 200);
  assert.equal((await write({ ...record, status: 'cancelled' }, f.a, revision)).status, 409);
  assert.equal((await write(preorder('delivery'))).status, 200);
  assert.equal((await write({ ...preorder('delivery'), address: '' })).status, 400);
  assert.equal((await write(record, f.b)).status, 403);
  const changes = await (await f.call('/changes', undefined, f.b.token)).json();
  assert.ok(!changes.changes.some(value => value.key.startsWith('preorder:')));
  assert.equal((await f.cash(open(randomUUID()))).status, 403);
});

test('Cash is independent: opening, cash/card/Zelle, change, movements and counted closing', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true);
  const opening = open(randomUUID());
  let result = await f.cash(opening); assert.equal(result.status, 200);
  assert.equal((await f.cash(opening)).status, 200);
  assert.equal((await f.cash({ ...opening, openingCents: 1 })).value.error, 'INVALID_RETRY');
  assert.equal((await f.cash({ ...opening, id: randomUUID() })).value.error, 'CASH_ALREADY_OPEN');
  assert.equal((await f.cash(open(randomUUID()))).status, 200);
  const transaction = sale(opening);
  result = await f.cash(transaction); assert.equal(result.status, 200);
  assert.equal(result.value.receipt.totalCents, 2500); assert.equal(result.value.receipt.changeCents, 500);
  const frozenReceipt = result.value.receipt;
  assert.equal((await f.cash(transaction)).status, 200);
  assert.equal((await f.cash({ ...transaction, tenderedCents: 4000 })).value.error, 'INVALID_RETRY');
  assert.equal((await f.cash({ ...transaction, id: randomUUID(), tenderedCents: 2499 })).value.error, 'INSUFFICIENT_PAYMENT');
  for (const method of ['card', 'zelle']) assert.equal((await f.cash({ ...sale(opening), method, tenderedCents: 0 })).status, 200);
  const movement = { deviceId: opening.deviceId, sessionId: opening.id, note: 'Troco' };
  assert.equal((await f.cash({ ...movement, id: randomUUID(), operation: 'in', amountCents: 500 })).status, 200);
  result = await f.cash({ ...movement, id: randomUUID(), operation: 'out', amountCents: 1000 });
  assert.deepEqual(result.value.sessions.find(s => s.id === opening.id).summary, { cashCents: 2500, cardCents: 2500, zelleCents: 2500, inCents: 500, outCents: 1000, expectedCents: 12000 });
  assert.equal((await f.cash({ ...movement, id: randomUUID(), operation: 'out', amountCents: 12001 })).value.error, 'INSUFFICIENT_CASH');
  assert.equal((await f.cash({ ...movement, id: randomUUID(), operation: 'in', amountCents: -1 })).value.error, 'INVALID_DATA');
  const closing = { operation: 'close', sessionId: opening.id, deviceId: opening.deviceId, countedCents: 11900 };
  result = await f.cash(closing); assert.equal(result.status, 200);
  const closed = result.value.sessions.find(s => s.id === opening.id); assert.equal(closed.countedCents - closed.summary.expectedCents, -100);
  assert.equal((await f.cash(closing)).status, 200);
  assert.equal((await f.cash({ ...closing, countedCents: 1 })).value.error, 'INVALID_RETRY');
  assert.equal((await f.cash(sale(opening))).value.error, 'CASH_CLOSED');
  assert.deepEqual((await f.cash(transaction)).value.receipt, frozenReceipt);
  assert.equal(f.db.prepare("SELECT count(*) AS count FROM store_records WHERE key LIKE 'order:%' OR key LIKE 'preorder:%'").get().count, 0);
  f.db.exec(fs.readFileSync('server/cloudflare/store-schema.sql', 'utf8'));
  assert.equal(f.db.prepare('SELECT count(*) AS count FROM cash_entries').get().count, 5);
});

test('concurrent cash operations cannot double open, overdraw or duplicate a payment', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true);
  const opening = open(randomUUID());
  const openings = await Promise.all([f.cash(opening), f.cash({ ...opening, id: randomUUID() })]);
  assert.deepEqual(openings.map(v => v.status).sort(), [200, 409]);
  const session = openings.find(v => v.status === 200).value.sessions[0];
  const withdrawals = await Promise.all([1, 2].map(() => f.cash({ operation: 'out', sessionId: session.id, deviceId: opening.deviceId, id: randomUUID(), amountCents: 6000, note: 'Retirada' })));
  assert.deepEqual(withdrawals.map(v => v.status).sort(), [200, 409]);
  const transaction = sale({ ...session, deviceId: opening.deviceId });
  const sales = await Promise.all([f.cash(transaction), f.cash(transaction)]);
  assert.deepEqual(sales.map(v => v.status), [200, 200]);
  assert.equal(f.db.prepare('SELECT count(*) AS count FROM cash_entries WHERE id = ?').get(transaction.id).count, 1);
  f.modules('seabra-2', false, true);
  assert.equal((await f.cash({ ...transaction, id: randomUUID() }, f.b)).value.error, 'CASH_CLOSED');
  assert.equal((await f.call('/cash?deviceId=' + opening.deviceId, undefined, f.b.token)).status, 200);
  assert.deepEqual((await (await f.call('/cash?deviceId=' + opening.deviceId, undefined, f.b.token)).json()).entries, []);
  assert.equal((await f.call('/cash', transaction)).status, 401);
  assert.equal((await f.call('/change', { id: randomUUID(), key: 'cash:' + randomUUID(), value: transaction, base: 0 }, f.a.token)).status, 400);
});

test('flags sync to tablets, survive offline restart and preserve queued preorders when disabled', async t => {
  const f = await fixture(t); f.modules('seabra-1', true, false);
  const a = f.tablet(), b = f.tablet();
  for (const tablet of [a, b]) { await tablet.cloud.setSession(f.a); await tablet.cloud.sync(); assert.deepEqual(tablet.cloud.modules(), { preorders: true, cash: false, customers: false, preparation: false }); }
  a.offline = true; const record = preorder('delivery'); await a.cloud.write({ ['preorder:' + record.id]: record }); await a.cloud.sync();
  const restarted = f.tablet(a.saved); restarted.offline = true; await restarted.cloud.load();
  assert.deepEqual(restarted.cloud.modules(), { preorders: true, cash: false, customers: false, preparation: false }); assert.equal((await restarted.cloud.list('preorder:')).length, 1);
  f.modules('seabra-1', false, true); a.offline = false; await a.cloud.sync();
  assert.deepEqual(a.cloud.modules(), { preorders: false, cash: true, customers: false, preparation: false }); assert.ok(a.cloud.pending('preorder:' + record.id));
  const disabled = preorder();
  await assert.rejects(a.cloud.write({ ['preorder:' + disabled.id]: disabled }), error => error.code === 'MODULE_DISABLED');
  f.modules('seabra-1', true, true); await a.cloud.sync(); await b.cloud.sync();
  assert.equal(a.cloud.pending('preorder:' + record.id), false); assert.equal((await b.cloud.list('preorder:'))[0].address, '123 Main St');
  f.modules('seabra-1', false, false); await a.cloud.sync();
  assert.deepEqual(a.cloud.modules(), { preorders: false, cash: false, customers: false, preparation: false });
});

test('financial requests survive lost acknowledgements and app restart without duplicate sales', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true);
  const a = f.tablet(); await a.cloud.setSession(f.a); await a.cloud.sync();
  const opening = { operation: 'open', id: randomUUID(), openingCents: 10000 };
  await a.cloud.cashCommand(opening);
  const transaction = { ...sale({ id: opening.id, deviceId: a.cloud.identity() }) }; delete transaction.deviceId;
  a.loseCashAck = true;
  await assert.rejects(a.cloud.cashCommand(transaction), error => error.code === 'UNAVAILABLE');
  assert.deepEqual(a.cloud.pendingCashCommand(), transaction);
  await assert.rejects(a.cloud.cashCommand({ ...transaction, id: randomUUID() }), error => error.code === 'CASH_PENDING');
  const restarted = f.tablet(a.saved); restarted.offline = true; await restarted.cloud.load();
  assert.deepEqual(restarted.cloud.pendingCashCommand(), transaction);
  await restarted.cloud.setSession(f.a);
  await assert.rejects(restarted.cloud.cashCommand(transaction), error => error.code === 'UNAVAILABLE');
  restarted.offline = false;
  const result = await restarted.cloud.cashCommand(restarted.cloud.pendingCashCommand());
  assert.equal(result.receipt.totalCents, 2500); assert.equal(restarted.cloud.pendingCashCommand(), null);
  assert.equal(f.db.prepare("SELECT count(*) AS count FROM cash_entries WHERE kind = 'sale'").get().count, 1);
  const reloaded = f.tablet(restarted.saved); await reloaded.cloud.load(); assert.equal(reloaded.cloud.cashOverview().sessions[0].summary.cashCents, 2500);
  const rejected = { ...transaction, id: randomUUID(), tenderedCents: 1 };
  await assert.rejects(restarted.cloud.cashCommand(rejected), error => error.code === 'INSUFFICIENT_PAYMENT');
  assert.equal(restarted.cloud.pendingCashCommand(), null);
});

test('daily kitchen orders stay available with Cash enabled and without an open register', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true);
  const order = { id: randomUUID(), plate: '7', customer: '', createdAt: new Date().toISOString(), items: [{ id: randomUUID(), name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] };
  assert.equal((await f.call('/change', { id: randomUUID(), key: 'order:' + order.id, value: order, base: 0 }, f.a.token)).status, 200);
  assert.equal(f.db.prepare('SELECT count(*) AS count FROM cash_sessions').get().count, 0);
  const a = open(randomUUID()), b = open(randomUUID()); await f.cash(a); await f.cash(b);
  assert.equal((await f.cash({ ...sale(a), orderId: order.id })).status, 200);
  assert.equal((await f.cash({ ...sale(b), orderId: order.id })).value.error, 'ORDER_ALREADY_PAID');
  f.modules('seabra-1', false, false);
  const next = { ...order, id: randomUUID() };
  assert.equal((await f.call('/change', { id: randomUUID(), key: 'order:' + next.id, value: next, base: 0 }, f.a.token)).status, 200);
  assert.equal((await f.cash(sale(a))).value.error, 'MODULE_DISABLED');
});

test('prices sync between tablets and recorded receipts retain their original amounts', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true);
  const a = f.tablet(), b = f.tablet();
  for (const device of [a, b]) { await device.cloud.setSession(f.a); await device.cloud.sync(); }
  await a.cloud.write({ menu: [{ id: 'pizza', name: 'Pizza', category: 'Pizzas', price: 8.75 }] }); await a.cloud.sync(); await b.cloud.sync();
  assert.equal((await b.cloud.get('menu'))[0].price, 8.75);
  const opening = { operation: 'open', id: randomUUID(), openingCents: 0 }; await a.cloud.cashCommand(opening);
  const transaction = { ...sale({ ...opening, deviceId: a.cloud.identity() }), items: [item(875)], tenderedCents: 2000 }; delete transaction.deviceId;
  const recorded = await a.cloud.cashCommand(transaction); assert.equal(recorded.receipt.totalCents, 1750);
  await a.cloud.write({ menu: [{ id: 'pizza', name: 'Updated Pizza', category: 'Pizzas', price: 20 }] }); await a.cloud.sync();
  assert.equal(a.cloud.cashOverview().entries[0].receipt.items[0].unitPriceCents, 875);
  assert.deepEqual((await a.cloud.cashCommand(transaction)).receipt, recorded.receipt);
});

test('closing concurrently with a payment leaves a consistent counted register and prevents later writes', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true);
  const opening = open(randomUUID()); await f.cash(opening);
  const payment = sale(opening);
  const [closing, receipt] = await Promise.all([f.cash({ operation: 'close', sessionId: opening.id, deviceId: opening.deviceId, countedCents: 10000 }), f.cash(payment)]);
  assert.equal(closing.status, 200); assert.ok([200, 409].includes(receipt.status));
  const overview = await (await f.call('/cash?deviceId=' + opening.deviceId, undefined, f.a.token)).json();
  assert.ok(overview.sessions[0].closedAt);
  assert.equal(overview.sessions[0].summary.expectedCents, receipt.status === 200 ? 12500 : 10000);
  assert.equal((await f.cash(sale(opening))).value.error, 'CASH_CLOSED');
});

test('nonfiscal customer receipts retain USD prices, escape HTML and translate in three languages', () => {
  const { buildCustomerReceiptHtml, buildCustomerReceiptEscpos } = loadTs('src/services/customerReceipt.ts');
  const record = { id: randomUUID(), storeName: '<Bistro>', currency: 'USD', createdAt: '2026-10-05T18:00:00Z', customer: '<script>alert(1)</script>', items: [item()], totalCents: 2500, method: 'cash', tenderedCents: 3000, changeCents: 500 };
  for (const [lang, title] of [['pt', 'RECIBO NÃO FISCAL'], ['en', 'NON-FISCAL RECEIPT'], ['es', 'RECIBO NO FISCAL']]) {
    const html = buildCustomerReceiptHtml(record, '80', lang);
    assert.ok(html.includes(title)); assert.ok(html.includes('25')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
    const bytes = buildCustomerReceiptEscpos(record, '80', lang); assert.ok(bytes instanceof Uint8Array); assert.ok(bytes.length > 200);
  }
});
