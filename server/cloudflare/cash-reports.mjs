import { storeModules, activeStore } from './stores.mjs';
import { cashSettings, canManageCash } from './cash-settings.mjs';
import { originalRefundComponents } from '../../shared/cash-refunds.mjs';
import { receiptPayments } from '../../shared/cash-payments.mjs';
import { allocateCents } from '../../shared/cash-pricing.mjs';

const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
export const emptyCashTotals = () => ({ salesCount: 0, voidCount: 0, refundCount: 0, grossCents: 0, discountCents: 0, taxCents: 0, reversedCents: 0, taxReversedCents: 0, netSalesCents: 0, netTaxCents: 0, netReceiptsCents: 0, tipCents: 0, tipReversedCents: 0, netTipCents: 0, deliveryFeeCents: 0, deliveryFeeReversedCents: 0, netDeliveryFeeCents: 0, inCents: 0, outCents: 0 });
export async function cashReportResponse(request, env, actor) {
  if (!(await storeModules(env, actor.storeId)).cash) fail(403, 'MODULE_DISABLED');
  if (!canManageCash(actor, await cashSettings(env, actor.storeId))) fail(403, 'MANAGER_REQUIRED');
  if (request.method !== 'GET') fail(405, 'INVALID_DATA');
  const params = new URL(request.url).searchParams, start = params.get('start'), end = params.get('end'), timeZone = params.get('timeZone');
  const from = Date.parse(start), to = Date.parse(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || new Date(from).toISOString() !== start || new Date(to).toISOString() !== end || from >= to || to - from > 367 * 86400000 || !timeZone || timeZone.length > 100) fail(400, 'INVALID_PERIOD');
  let formatter; try { formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { fail(400, 'INVALID_PERIOD'); }
  const day = value => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  if ((Date.parse(day(end)) - Date.parse(day(start))) / 86400000 > 366) fail(400, 'INVALID_PERIOD');
  const store = await activeStore(env, actor.storeId);
  const queries = cashReportQueries(env, [actor.storeId], start, end);
  const [events, closings] = await env.DB.batch(queries);
  return Response.json(buildCashReport(store, { start, end, timeZone }, events.results, closings.results), { headers: { 'Cache-Control': 'no-store' } });
}

export function cashReportQueries(env, storeIds, start, end) {
  const ids = JSON.stringify(storeIds);
  const events = env.DB.prepare(`SELECT store_id, id, kind, method, amount_cents, created_at, actor, note AS reason, data, NULL AS refund_data FROM cash_entries WHERE store_id IN (SELECT value FROM json_each(?)) AND created_at >= ? AND created_at < ?
    UNION ALL SELECT a.store_id, a.id, a.kind, a.method, a.amount_cents, a.created_at, a.actor, a.reason, e.data, a.data AS refund_data FROM cash_reversals a
    JOIN cash_entries e ON e.store_id = a.store_id AND e.id = a.sale_id WHERE a.store_id IN (SELECT value FROM json_each(?)) AND a.created_at >= ? AND a.created_at < ?
    ORDER BY created_at, id LIMIT 10001`).bind(ids, start, end, ids, start, end);
  const closings = env.DB.prepare(`SELECT s.store_id, s.id, s.device_id, s.opened_by, s.closed_by, s.opening_cents, s.opened_at, s.closed_at, s.counted_cents,
    s.opening_cents + COALESCE(SUM(CASE WHEN e.kind = 'out' THEN -e.amount_cents WHEN e.method = 'cash' THEN e.amount_cents ELSE 0 END), 0) AS expected_cents
    FROM cash_sessions s LEFT JOIN cash_movements e ON e.store_id = s.store_id AND e.session_id = s.id
    WHERE s.store_id IN (SELECT value FROM json_each(?)) AND s.closed_at >= ? AND s.closed_at < ? GROUP BY s.store_id, s.id ORDER BY s.closed_at, s.id LIMIT 10001`).bind(ids, start, end);
  return [events, closings];
}

export function buildCashReport(store, { start, end, timeZone }, events, closings, onEvent = () => {}) {
  if (events.length > 10000 || closings.length > 10000) fail(400, 'REPORT_TOO_LARGE');
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const day = value => { const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map(part => [part.type, part.value])); return `${parts.year}-${parts.month}-${parts.day}`; };
  const totals = emptyCashTotals(), days = new Map(), products = new Map();
  const methods = ['cash', 'card', 'zelle'].map(method => ({ method, receivedCents: 0, reversedCents: 0, netCents: 0 }));
  const movements = [];
  for (const event of events) {
    const key = day(event.created_at); if (!days.has(key)) days.set(key, { day: key, ...emptyCashTotals() });
    const daily = days.get(key), delta = emptyCashTotals(), targets = [totals, daily, delta];
    const audit = { id: event.id, kind: event.kind, method: event.method, amountCents: event.amount_cents, createdAt: event.created_at, actor: event.actor, reason: event.reason, discountCents: 0, taxCents: 0, authorizedBy: '', priceAdjustments: [] };
    movements.push(audit);
    if (['in', 'out'].includes(event.kind)) { for (const row of targets) row[event.kind === 'in' ? 'inCents' : 'outCents'] += event.amount_cents; onEvent(event, delta); continue; }
    const receipt = JSON.parse(event.data), reversing = event.kind !== 'sale', sign = reversing ? -1 : 1;
    const gross = receipt.subtotalCents ?? receipt.items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0), discount = receipt.discountCents ?? 0;
    const original = originalRefundComponents(receipt);
    const refund = reversing ? (event.refund_data ? JSON.parse(event.refund_data) : { ...original, amountCents: event.amount_cents, lines: original.lines.map(line => ({ ...line, quantityReturned: line.quantity })) }) : null;
    const net = refund ? refund.lines.reduce((sum, line) => sum + line.netCents, 0) : gross - discount;
    const tax = refund ? refund.lines.reduce((sum, line) => sum + line.taxCents, 0) + refund.deliveryTaxCents : receipt.taxCents ?? 0;
    const tip = refund ? refund.tipCents : receipt.tipCents ?? 0, fee = refund ? refund.deliveryFeeCents : receipt.deliveryFeeCents ?? 0;
    const payments = refund ? refund.payments : receiptPayments(receipt);
    audit.method = payments.length > 1 ? 'split' : payments[0].method; audit.payments = payments;
    audit.discountCents = reversing ? (event.refund_data ? 0 : -discount) : discount; audit.taxCents = sign * tax;
    audit.tipCents = sign * tip; audit.deliveryFeeCents = sign * fee; if (refund) audit.refund = refund;
    audit.authorizedBy = reversing ? event.actor : receipt.authorizedBy ?? '';
    audit.reason ||= reversing ? '' : receipt.discountReason ?? '';
    audit.priceAdjustments = receipt.priceAdjustments ?? [];
    for (const row of targets) {
      row.netReceiptsCents += sign * event.amount_cents; row.netSalesCents += sign * net; row.netTaxCents += sign * tax;
      row.netTipCents += sign * tip; row.netDeliveryFeeCents += sign * fee;
      if (reversing) { row[event.kind === 'void' ? 'voidCount' : 'refundCount']++; row.reversedCents += event.amount_cents; row.taxReversedCents += tax; row.tipReversedCents += tip; row.deliveryFeeReversedCents += fee; }
      else { row.salesCount++; row.grossCents += gross; row.discountCents += discount; row.taxCents += tax; row.tipCents += tip; row.deliveryFeeCents += fee; }
    }
    for (const leg of payments) {
      const payment = methods.find(row => row.method === leg.method);
      payment[reversing ? 'reversedCents' : 'receivedCents'] += leg.amountCents; payment.netCents += sign * leg.amountCents;
    }
    const weights = receipt.items.map(item => item.quantity * item.unitPriceCents), discounts = allocateCents(discount, weights);
    receipt.items.forEach((item, index) => {
      const id = item.productId ?? `${item.category}\u0000${item.name}`;
      if (!products.has(id)) products.set(id, { id, name: item.name, category: item.category, soldQuantity: 0, reversedQuantity: 0, netQuantity: 0, grossCents: 0, discountCents: 0, reversedCents: 0, netSalesCents: 0 });
      const product = products.get(id), grossLine = weights[index], discountLine = discounts[index];
      const returned = refund?.lines.find(line => line.index === index), quantity = refund ? returned?.quantityReturned ?? 0 : item.quantity;
      const value = refund ? returned?.netCents ?? 0 : grossLine - discountLine;
      product.netQuantity += sign * quantity; product.netSalesCents += sign * value;
      if (reversing) { product.reversedQuantity += quantity; product.reversedCents += value; }
      else { product.soldQuantity += quantity; product.grossCents += grossLine; product.discountCents += discountLine; }
    });
    onEvent(event, delta);
  }
  return { storeId: store.id, storeName: store.name, currency: 'USD', start, end, timeZone, generatedAt: new Date().toISOString(), totals,
    days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)), methods, products: [...products.values()].sort((a, b) => b.netSalesCents - a.netSalesCents || a.name.localeCompare(b.name)), movements,
    closings: closings.map(s => ({ id: s.id, deviceId: s.device_id, openedBy: s.opened_by, closedBy: s.closed_by, openedAt: s.opened_at, closedAt: s.closed_at, openingCents: s.opening_cents, expectedCents: s.expected_cents, countedCents: s.counted_cents, differenceCents: s.counted_cents - s.expected_cents })) };
}
