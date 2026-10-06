const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID, randomBytes, pbkdf2Sync } = require('node:crypto');
const fs = require('node:fs');
const { Script } = require('node:vm');
const { fixture } = require('./helpers/business-fixture.cjs');
const { loadTs } = require('./helpers/load-ts.cjs');
const { calculateSale, allocateCents } = require('../shared/cash-pricing.mjs');
const items = (cents = 1000, quantity = 1) => [{ id: randomUUID(), productId: 'pizza', name: 'Pizza', category: 'Pizzas', quantity, note: '', unitPriceCents: cents }];
const opening = (amount = 10000) => ({ operation: 'open', id: randomUUID(), deviceId: randomUUID(), openingCents: amount });
const sale = (session, method = 'cash', cents = 1000) => ({ operation: 'sale', id: randomUUID(), deviceId: session.deviceId, sessionId: session.id, customer: 'Ana', items: items(cents), method, tenderedCents: 20000, note: '' });
const reverse = (session, original, kind = 'refund') => ({ operation: kind, id: randomUUID(), deviceId: session.deviceId, sessionId: session.id, saleId: original.id, reason: 'Devolução solicitada' });
const setSettings = (f, tax = { enabled: false, rateBps: 0 }, managers = [], storeId = 'seabra-1') => f.db.prepare('INSERT INTO store_cash_settings(store_id, data) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET data = excluded.data').run(storeId, JSON.stringify({ tax, managers }));
async function staff(f, username, storeId = 'seabra-1') {
  const salt = randomBytes(16).toString('hex'), hash = pbkdf2Sync('staff-password', Buffer.from(salt, 'hex'), 100000, 32, 'sha256').toString('hex');
  f.db.prepare('INSERT INTO store_records(store_id, key, data, revision) VALUES(?, ?, ?, 1)').run(storeId, 'user:' + username, JSON.stringify({ username, active: true, login: { salt, hash, iterations: 100000 } }));
  const login = await (await f.call('/login', { storeId, username, password: 'staff-password' })).json(); assert.ok(login.token);
  return { storeId, username, token: login.token };
}
const report = async (f, start = '2026-10-01T00:00:00.000Z', end = '2026-11-01T00:00:00.000Z', actor = f.a, timeZone = 'UTC') => {
  const response = await f.call('/cash/report?' + new URLSearchParams({ start, end, timeZone }), undefined, actor.token);
  return { status: response.status, value: await response.json() };
};
async function owner(f) {
  const response = await f.adminResponse(new Request('https://example.com/admin'), f.env), csrf = response.headers.get('Set-Cookie').split(';')[0];
  const login = await f.adminResponse(new Request('https://example.com/admin/login', { method: 'POST', headers: { Cookie: csrf, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf: csrf.split('=')[1], username: 'admin', password: f.env.ADMIN_VIEW_TOKEN }) }), f.env);
  return login.headers.get('Set-Cookie').split(';')[0];
}

test('discount and tax calculations reconcile integer cents and proportional rounding', () => {
  assert.deepEqual(calculateSale(items(), { kind: 'amount', value: 100, reason: 'Cliente' }, 750), { subtotalCents: 1000, discountCents: 100, taxRateBps: 750, taxCents: 68, totalCents: 968 });
  assert.equal(calculateSale(items(999), { kind: 'percent', value: 1250, reason: 'Promoção' }, 725).discountCents, 125);
  assert.deepEqual(allocateCents(1, [1, 1, 1]), [1, 0, 0]); assert.deepEqual(allocateCents(2, [1, 1, 1]), [1, 1, 0]);
  assert.deepEqual(allocateCents(99999999, [99999999, 1]), [99999998, 1]);
  for (const discount of [{ kind: 'amount', value: 1000, reason: 'Cliente' }, { kind: 'amount', value: 100, reason: '' }, { kind: 'percent', value: 10001, reason: 'Erro' }, { kind: 'amount', value: -1, reason: 'Erro' }]) assert.throws(() => calculateSale(items(), discount));
  assert.throws(() => calculateSale(items(), undefined, 7.25));
});

test('owner portal configures tax and managers per company and rejects inactive or foreign users', async t => {
  const f = await fixture(t); await staff(f, 'manager'); await staff(f, 'foreign', 'seabra-2');
  const cookie = await owner(f);
  const patch = cashSettings => f.adminResponse(new Request('https://example.com/admin/stores', { method: 'PATCH', headers: { Cookie: cookie, Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'seabra-1', name: 'Seabra 1', cashSettings }) }), f.env);
  assert.equal((await patch({ tax: { enabled: true, rateBps: 725 }, managers: ['manager'] })).status, 200);
  assert.equal((await patch({ tax: { enabled: true, rateBps: 725 }, managers: ['foreign'] })).status, 400);
  assert.equal((await patch({ tax: { enabled: true, rateBps: 7.25 }, managers: [] })).status, 400);
  assert.equal((await patch({ tax: { enabled: true, rateBps: 10001 }, managers: [] })).status, 400);
  const response = await f.adminResponse(new Request('https://example.com/admin/stores', { headers: { Cookie: cookie } }), f.env), stores = await response.json();
  assert.deepEqual(stores.find(s => s.id === 'seabra-2').cashSettings, { tax: { enabled: false, rateBps: 0 }, managers: [] });
  const html = await (await f.adminResponse(new Request('https://example.com/admin', { headers: { Cookie: cookie } }), f.env)).text();
  assert.match(html, /name="taxRate"/); assert.match(html, /name="cashManager" value="manager" checked/);
  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Script(match[1]);
  f.db.exec(fs.readFileSync('server/cloudflare/store-schema.sql', 'utf8'));
  assert.equal(JSON.parse(f.db.prepare("SELECT data FROM store_cash_settings WHERE store_id = 'seabra-1'").get().data).tax.rateBps, 725);
});

test('only admins and portal-appointed active managers can discount, reverse or read reports', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true);
  const manager = await staff(f, 'manager'), clerk = await staff(f, 'cashier'); setSettings(f, undefined, ['manager']);
  const session = opening(); await f.cash(session, clerk);
  const discounted = { ...sale(session), discount: { kind: 'amount', value: 100, reason: 'Promoção' } };
  assert.equal((await f.cash(discounted, clerk)).value.error, 'MANAGER_REQUIRED');
  assert.equal((await f.cash(discounted, manager)).status, 200);
  const saved = JSON.parse(f.db.prepare('SELECT data FROM cash_entries WHERE id = ?').get(discounted.id).data); assert.equal(saved.authorizedBy, 'manager');
  assert.equal((await f.cash(reverse(session, discounted), clerk)).value.error, 'MANAGER_REQUIRED');
  assert.equal((await report(f, undefined, undefined, clerk)).value.error, 'MANAGER_REQUIRED');
  assert.equal((await report(f, undefined, undefined, manager)).status, 200);
  setSettings(f);
  assert.equal((await f.cash(reverse(session, discounted), manager)).value.error, 'MANAGER_REQUIRED');
  assert.equal((await f.cash(reverse(session, discounted), f.a)).status, 200);
  assert.equal((await f.call('/change', { id: randomUUID(), base: 0, key: 'cash-settings', value: { managers: ['cashier'] } }, clerk.token)).status, 400);
});

test('tax is authoritative, added after discount, and frozen across retries and setting changes', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); setSettings(f, { enabled: true, rateBps: 750 });
  const session = opening(); await f.cash(session);
  const transaction = { ...sale(session), taxRateBps: 750, discount: { kind: 'amount', value: 100, reason: 'Cliente' }, totalCents: 1, taxCents: 0 };
  const first = await f.cash(transaction); assert.equal(first.status, 200); assert.equal(first.value.receipt.totalCents, 968); assert.equal(first.value.receipt.taxCents, 68);
  setSettings(f, { enabled: true, rateBps: 825 });
  assert.deepEqual((await f.cash(transaction)).value.receipt, first.value.receipt);
  assert.equal((await f.cash({ ...transaction, id: randomUUID() })).value.error, 'TAX_CHANGED');
  assert.equal((await f.cash({ ...transaction, taxRateBps: 825 })).value.error, 'INVALID_RETRY');
  assert.equal(f.db.prepare('SELECT count(*) AS count FROM cash_entries').get().count, 1);
});

test('staff cannot bypass discount approval by changing a unit or catalog price', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); const clerk = await staff(f, 'cashier');
  f.db.prepare('INSERT INTO store_events(store_id, mutation, key, data, actor, created_at) VALUES(?, ?, ?, ?, ?, ?)').run('seabra-1', randomUUID(), 'menu', JSON.stringify([{ id: 'pizza', name: 'Pizza', category: 'Pizzas', price: 10 }]), 'admin', new Date().toISOString());
  const session = opening(); await f.cash(session, clerk);
  const transaction = sale(session);
  assert.equal((await f.cash(transaction, clerk)).status, 200);
  assert.equal((await f.cash({ ...transaction, id: randomUUID(), items: items(900) }, clerk)).value.error, 'PRICE_APPROVAL_REQUIRED');
  const approved = await f.cash({ ...transaction, id: randomUUID(), items: items(900) }); assert.equal(approved.status, 200);
  assert.equal(approved.value.receipt.authorizedBy, 'admin'); assert.equal(approved.value.receipt.priceAdjustments[0].catalogPriceCents, 1000);
  const result = await f.call('/change', { id: randomUUID(), base: 1, key: 'menu', value: [{ id: 'pizza', name: 'Pizza', category: 'Pizzas', price: 9 }] }, clerk.token);
  assert.equal(result.status, 403);
  const tablet = f.tablet(new Map(), clerk); await tablet.cloud.setSession(clerk); await tablet.cloud.sync();
  await assert.rejects(tablet.cloud.write({ menu: [{ id: 'pizza', name: 'Pizza', category: 'Pizzas', price: 9 }] }), error => error.code === 'MANAGER_REQUIRED');
  assert.equal((await tablet.cloud.get('menu'))[0].price, 10);
});

test('voids preserve sale history, require a reason, affect cash once and mark reprinted receipts', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); const session = opening(); await f.cash(session);
  const transaction = sale(session); await f.cash(transaction);
  const original = f.db.prepare('SELECT data FROM cash_entries WHERE id = ?').get(transaction.id).data;
  const cancellation = reverse(session, transaction, 'void');
  assert.equal((await f.cash({ ...cancellation, reason: '' })).value.error, 'INVALID_DATA');
  const result = await f.cash(cancellation); assert.equal(result.status, 200); assert.equal(result.value.sessions[0].summary.expectedCents, 10000);
  assert.equal(result.value.entries[0].receipt.reversal.kind, 'void'); assert.equal(result.value.adjustments[0].actor, 'admin');
  assert.equal((await f.cash(cancellation)).status, 200);
  assert.equal((await f.cash({ ...cancellation, reason: 'Different' })).value.error, 'INVALID_RETRY');
  assert.equal((await f.cash(reverse(session, transaction))).value.error, 'SALE_ALREADY_REVERSED');
  assert.equal(f.db.prepare('SELECT data FROM cash_entries WHERE id = ?').get(transaction.id).data, original);
  const { buildCustomerReceiptHtml } = loadTs('src/services/customerReceipt.ts');
  assert.match(buildCustomerReceiptHtml(result.value.entries[0].receipt, '80', 'en'), /SALE VOIDED/);
});

test('refunds after closing use a new register and leave the original counted closing unchanged', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); const first = opening(); await f.cash(first);
  const transaction = sale(first); await f.cash(transaction);
  await f.cash({ operation: 'close', deviceId: first.deviceId, sessionId: first.id, countedCents: 11000 });
  const next = { ...opening(2000), deviceId: first.deviceId }; await f.cash(next);
  assert.equal((await f.cash(reverse(next, transaction, 'void'))).value.error, 'VOID_REQUIRES_ORIGINAL_OPEN');
  const result = await f.cash(reverse(next, transaction)); assert.equal(result.status, 200);
  assert.equal(result.value.sessions.find(row => row.id === first.id).summary.expectedCents, 11000);
  assert.equal(result.value.sessions.find(row => row.id === first.id).countedCents, 11000);
  assert.equal(result.value.sessions.find(row => row.id === next.id).summary.expectedCents, 1000);
});

test('card and Zelle reversals do not withdraw physical cash and cannot access another company sale', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); f.modules('seabra-2', false, true);
  const session = opening(0); await f.cash(session);
  for (const method of ['card', 'zelle']) { const transaction = sale(session, method); await f.cash(transaction); const result = await f.cash(reverse(session, transaction)); assert.equal(result.status, 200); assert.equal(result.value.sessions[0].summary.expectedCents, 0); }
  const other = opening(); await f.cash(other, f.b);
  const original = sale(session, 'card'); await f.cash(original);
  assert.equal((await f.cash(reverse(other, original), f.b)).value.error, 'SALE_NOT_FOUND');
});

test('concurrent reversals and withdrawals cannot double return or overdraw the same cash', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); const session = opening(0); await f.cash(session);
  const transaction = sale(session); await f.cash(transaction);
  const refund = reverse(session, transaction);
  const responses = await Promise.all([f.cash(refund), f.cash(refund), f.cash({ ...refund, id: randomUUID() })]);
  assert.equal(responses.filter(row => row.status === 200).length, 2); assert.equal(f.db.prepare('SELECT count(*) AS count FROM cash_adjustments').get().count, 1);
  const next = sale(session); await f.cash(next);
  const [refundResult, outResult] = await Promise.all([f.cash(reverse(session, next)), f.cash({ operation: 'out', id: randomUUID(), deviceId: session.deviceId, sessionId: session.id, amountCents: 1000, note: 'Retirada' })]);
  assert.deepEqual([refundResult.status, outResult.status].sort(), [200, 409]);
  const state = await (await f.call('/cash?deviceId=' + session.deviceId, undefined, f.a.token)).json(); assert.equal(state.sessions[0].summary.expectedCents, 0);
});

test('reports reconcile sale/discount/tax, all tablets, products, payment methods and later refunds', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); setSettings(f, { enabled: true, rateBps: 750 });
  const first = opening(), second = opening(); await f.cash(first); await f.cash(second);
  const cashSale = { ...sale(first), taxRateBps: 750, discount: { kind: 'amount', value: 100, reason: 'Cliente' } };
  const cardSale = { ...sale(second, 'card', 500), taxRateBps: 750 }, zelleSale = { ...sale(first, 'zelle', 300), taxRateBps: 750 };
  for (const transaction of [cashSale, cardSale, zelleSale]) assert.equal((await f.cash(transaction)).status, 200);
  const cancelled = reverse(second, cardSale, 'void'); await f.cash(cancelled);
  await f.cash({ operation: 'close', deviceId: first.deviceId, sessionId: first.id, countedCents: 10968 });
  const next = { ...opening(1000), deviceId: first.deviceId }; await f.cash(next); const returned = reverse(next, cashSale); await f.cash(returned);
  f.db.prepare('UPDATE cash_entries SET created_at = ?').run('2026-10-02T18:00:00.000Z');
  f.db.prepare('UPDATE cash_adjustments SET created_at = ? WHERE id = ?').run('2026-10-02T19:00:00.000Z', cancelled.id);
  f.db.prepare('UPDATE cash_adjustments SET created_at = ? WHERE id = ?').run('2026-10-03T18:00:00.000Z', returned.id);
  f.db.prepare('UPDATE cash_sessions SET closed_at = ? WHERE id = ?').run('2026-10-02T20:00:00.000Z', first.id);
  const result = await report(f); assert.equal(result.status, 200); const data = result.value;
  assert.equal(data.totals.grossCents, 1800); assert.equal(data.totals.discountCents, 100); assert.equal(data.totals.taxCents, 129);
  assert.equal(data.totals.reversedCents, 1506); assert.equal(data.totals.netTaxCents, 23); assert.equal(data.totals.netSalesCents, 300); assert.equal(data.totals.netReceiptsCents, 323);
  assert.equal(data.days.find(day => day.day === '2026-10-03').netReceiptsCents, -968);
  assert.equal(data.products.reduce((sum, row) => sum + row.netSalesCents, 0), data.totals.netSalesCents);
  assert.equal(data.products[0].soldQuantity, 3); assert.equal(data.products[0].reversedQuantity, 2);
  assert.equal(data.methods.reduce((sum, row) => sum + row.netCents, 0), data.totals.netReceiptsCents);
  assert.equal(data.closings[0].differenceCents, 0); assert.equal(data.closings[0].expectedCents, 10968);
  assert.equal((await report(f, undefined, undefined, f.b)).value.error, 'MODULE_DISABLED');
});

test('report periods use inclusive start/exclusive end and group days in the requested time zone', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); const session = opening(); await f.cash(session);
  const transaction = sale(session); await f.cash(transaction);
  f.db.prepare('UPDATE cash_entries SET created_at = ?').run('2026-10-03T01:00:00.000Z');
  const included = await report(f, '2026-10-03T01:00:00.000Z', '2026-10-03T02:00:00.000Z', f.a, 'America/New_York');
  assert.equal(included.value.days[0].day, '2026-10-02');
  assert.equal((await report(f, '2026-10-03T00:00:00.000Z', '2026-10-03T01:00:00.000Z')).value.totals.salesCount, 0);
  assert.equal((await report(f, 'invalid')).value.error, 'INVALID_PERIOD');
  assert.equal((await report(f, undefined, undefined, f.a, 'invalid/timezone')).value.error, 'INVALID_PERIOD');
  assert.equal((await report(f, '2024-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')).value.error, 'INVALID_PERIOD');
  assert.equal((await report(f, '2025-11-02T04:00:00.000Z', '2026-11-03T05:00:00.000Z', f.a, 'America/New_York')).status, 200);
});

test('date filters include the full daylight-saving day and allow 366 calendar days', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const { reportPeriod } = loadTs('src/services/cashReportCsv.ts');
    const day = reportPeriod('2026-11-01', '2026-11-01'); assert.equal(Date.parse(day.end) - Date.parse(day.start), 25 * 3600000);
    const year = reportPeriod('2025-11-02', '2026-11-02'); assert.equal(Date.parse(year.end) - Date.parse(year.start), 366 * 86400000 + 3600000);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('reports include records beyond the tablet overview and refuse oversized periods without truncating totals', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); const session = opening(); await f.cash(session);
  const receipt = { id: randomUUID(), storeName: 'Bistro', currency: 'USD', createdAt: '2026-10-02T12:00:00.000Z', customer: '', items: items(1), totalCents: 1, method: 'card', tenderedCents: 1, changeCents: 0 };
  const insert = f.db.prepare("INSERT INTO cash_entries(store_id, id, session_id, kind, method, amount_cents, created_at, actor, note, data) VALUES('seabra-1', ?, ?, 'sale', 'card', 1, '2026-10-02T12:00:00.000Z', 'admin', '', ?)");
  for (let i = 0; i < 350; i++) insert.run(randomUUID(), session.id, JSON.stringify(receipt));
  const overview = await (await f.call('/cash?deviceId=' + session.deviceId, undefined, f.a.token)).json(); assert.equal(overview.entries.length, 300);
  const result = await report(f); assert.equal(result.value.totals.salesCount, 350); assert.equal(result.value.totals.netReceiptsCents, 350);
  f.db.prepare("WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 9651) INSERT INTO cash_entries(store_id, id, session_id, kind, method, amount_cents, created_at, actor, note, data) SELECT 'seabra-1', 'limit-' || i, ?, 'sale', 'card', 1, '2026-10-02T12:00:00.000Z', 'admin', '', ? FROM n").run(session.id, JSON.stringify(receipt));
  assert.equal((await report(f)).value.error, 'REPORT_TOO_LARGE');
});

test('lost refund acknowledgement survives app restart and does not create another return', async t => {
  const f = await fixture(t); f.modules('seabra-1', false, true); const tablet = f.tablet(); await tablet.cloud.setSession(f.a); await tablet.cloud.sync();
  const session = { ...opening(), deviceId: tablet.cloud.identity() }; await tablet.cloud.cashCommand(session);
  const transaction = sale(session); await tablet.cloud.cashCommand(transaction);
  const refund = reverse(session, transaction); tablet.loseCashAck = true;
  await assert.rejects(tablet.cloud.cashCommand(refund), error => error.code === 'UNAVAILABLE');
  const restarted = f.tablet(tablet.saved); await restarted.cloud.setSession(f.a); const result = await restarted.cloud.cashCommand(restarted.cloud.pendingCashCommand());
  assert.equal(result.adjustments.length, 1); assert.equal(result.sessions[0].summary.expectedCents, session.openingCents);
});

test('CSV exports financial sections, numeric negative values and safe text cells; calendar input validates', () => {
  const { cashReportCsv, reportPeriod } = loadTs('src/services/cashReportCsv.ts');
  const totals = { grossCents: 0, discountCents: 0, taxCents: 0, reversedCents: 100, taxReversedCents: 0, netSalesCents: -100, netTaxCents: 0, netReceiptsCents: -100, inCents: 0, outCents: 0 };
  const csv = cashReportCsv({ storeName: '=HYPERLINK("evil")', storeId: 'seabra-1', start: '2026-10-01', end: '2026-10-02', timeZone: 'UTC', generatedAt: '2026-10-02', totals, days: [], methods: [], products: [{ name: '+SUM(1,2)', category: 'A,"B"', soldQuantity: 1, reversedQuantity: 1, netQuantity: 0, grossCents: 100, discountCents: 0, reversedCents: 100, netSalesCents: 0 }], closings: [], movements: [] });
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes("'=HYPERLINK")); assert.ok(csv.includes("'+SUM")); assert.ok(csv.includes('A,""B""')); assert.ok(csv.includes('"-1"')); assert.ok(!csv.includes("'-1")); assert.match(csv, /AUDIT ID/);
  assert.ok(reportPeriod('2026-10-01', '2026-10-02').start.endsWith('Z'));
  for (const [from, through] of [['2026-02-30', '2026-03-01'], ['2026-10-02', '2026-10-01'], ['2024-01-01', '2026-01-01']]) assert.throws(() => reportPeriod(from, through));
});

test('customer receipts show frozen subtotal, discount and tax in HTML and network output', () => {
  const { buildCustomerReceiptHtml, buildCustomerReceiptEscpos } = loadTs('src/services/customerReceipt.ts');
  const receipt = { id: randomUUID(), storeName: 'Bistro', currency: 'USD', createdAt: '2026-10-05T12:00:00.000Z', customer: '', items: items(), subtotalCents: 1000, discountCents: 100, discountReason: '<script>Promoção</script>', taxRateBps: 750, taxCents: 68, totalCents: 968, method: 'cash', tenderedCents: 1000, changeCents: 32 };
  const html = buildCustomerReceiptHtml(receipt, '80', 'en');
  for (const value of ['Subtotal: $10.00', 'Discount: $1.00', 'Sales tax (7.5%): $0.68', 'Total: $9.68']) assert.ok(html.includes(value));
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  const bytes = Buffer.from(buildCustomerReceiptEscpos(receipt, '80', 'en')); assert.ok(bytes.includes(Buffer.from('Sales tax (7.5%): $0.68')));
});

test('CSV sharing writes a native file, preserves the file for the target app and cleans up failures', async () => {
  const files = [], calls = []; let available = true, failShare = false;
  class Directory { constructor(root, name) { this.uri = root + '/' + name; } create() {} }
  class File { constructor(directory, name) { this.uri = directory.uri + '/' + name; this.exists = false; files.push(this); } create() { this.exists = true; } write(value) { this.value = value; } delete() { this.exists = false; } }
  const { shareCashReport } = loadTs('src/services/shareCashReport.ts', { 'expo-file-system': { Directory, File, Paths: { cache: 'file:///cache' } }, 'expo-crypto': { randomUUID }, 'expo-sharing': { isAvailableAsync: async () => available, shareAsync: async (uri, options) => { if (failShare) throw Error('share failed'); calls.push({ uri, options }); } } });
  const zero = { grossCents: 0, discountCents: 0, taxCents: 0, reversedCents: 0, taxReversedCents: 0, netSalesCents: 0, netTaxCents: 0, netReceiptsCents: 0, inCents: 0, outCents: 0 };
  const empty = { storeName: 'Bistro', storeId: 'seabra-1', start: '2026-10-01', end: '2026-10-02', timeZone: 'UTC', generatedAt: '2026-10-02', totals: zero, days: [], methods: [], products: [], closings: [], movements: [] };
  await shareCashReport(empty); assert.equal(files[0].exists, true); assert.ok(files[0].value.startsWith('\uFEFF')); assert.equal(calls[0].options.mimeType, 'text/csv');
  failShare = true; await assert.rejects(shareCashReport(empty), /share failed/); assert.equal(files[1].exists, false);
  available = false; await assert.rejects(shareCashReport(empty), /indisponível/); assert.equal(files.length, 2);
});
