import { requireAvailable } from './operations.mjs';
import { activeStore, storeModules } from './stores.mjs';
import { validBusinessItems, validCents } from '../../shared/business-validation.mjs';
import { normalizePayments, receiptPayments } from '../../shared/cash-payments.mjs';
import { prepareRefund } from '../../shared/cash-refunds.mjs';
import { requireCustomer } from './customer-api.mjs';
import { calculateSale } from '../../shared/cash-pricing.mjs';
import { cashSettings, canManageCash } from './cash-settings.mjs';

const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
const reply = data => Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
const idOK = id => typeof id === 'string' && /^[a-zA-Z0-9-]{16,160}$/.test(id);
const balanceSQL = `(SELECT opening_cents FROM cash_sessions WHERE store_id = ? AND id = ?)
  + COALESCE((SELECT SUM(CASE WHEN kind = 'out' THEN -amount_cents WHEN method = 'cash' THEN amount_cents ELSE 0 END) FROM cash_movements WHERE store_id = ? AND session_id = ?), 0)`;
async function overview(env, actor, deviceId, receipt) {
  const { results: sessions } = await env.DB.prepare(`SELECT s.*,
    COALESCE(SUM(CASE WHEN e.kind IN ('sale', 'reversal') AND e.method = 'cash' THEN e.amount_cents ELSE 0 END), 0) AS cash_cents,
    COALESCE(SUM(CASE WHEN e.kind IN ('sale', 'reversal') AND e.method = 'card' THEN e.amount_cents ELSE 0 END), 0) AS card_cents,
    COALESCE(SUM(CASE WHEN e.kind IN ('sale', 'reversal') AND e.method = 'zelle' THEN e.amount_cents ELSE 0 END), 0) AS zelle_cents,
    COALESCE(SUM(CASE WHEN e.kind = 'in' THEN e.amount_cents ELSE 0 END), 0) AS in_cents,
    COALESCE(SUM(CASE WHEN e.kind = 'out' THEN e.amount_cents ELSE 0 END), 0) AS out_cents
    FROM cash_sessions s LEFT JOIN cash_movements e ON e.store_id = s.store_id AND e.session_id = s.id
    WHERE s.store_id = ? AND s.device_id = ? GROUP BY s.store_id, s.id ORDER BY s.opened_at DESC LIMIT 30`).bind(actor.storeId, deviceId).all();
  const { results: entries } = await env.DB.prepare(`SELECT e.* FROM cash_entries e JOIN cash_sessions s ON s.store_id = e.store_id AND s.id = e.session_id
    WHERE e.store_id = ? AND s.device_id = ? ORDER BY e.created_at DESC LIMIT 300`).bind(actor.storeId, deviceId).all();
  const { results: reversals } = await env.DB.prepare(`SELECT a.* FROM cash_reversals a WHERE a.store_id = ? AND a.sale_id IN
    (SELECT e.id FROM cash_entries e JOIN cash_sessions s ON s.store_id = e.store_id AND s.id = e.session_id WHERE e.store_id = ? AND s.device_id = ? ORDER BY e.created_at DESC LIMIT 300) ORDER BY a.created_at, a.id`).bind(actor.storeId, actor.storeId, deviceId).all();
  const { results: adjustments } = await env.DB.prepare('SELECT a.* FROM cash_reversals a JOIN cash_sessions s ON s.store_id = a.store_id AND s.id = a.session_id WHERE a.store_id = ? AND s.device_id = ? ORDER BY a.created_at DESC LIMIT 300').bind(actor.storeId, deviceId).all();
  return { settings: await cashSettings(env, actor.storeId), sessions: sessions.map(s => ({ id: s.id, deviceId: s.device_id, openedAt: s.opened_at, openedBy: s.opened_by, openingCents: s.opening_cents, closedAt: s.closed_at, countedCents: s.counted_cents,
    summary: { cashCents: s.cash_cents, cardCents: s.card_cents, zelleCents: s.zelle_cents, inCents: s.in_cents, outCents: s.out_cents, expectedCents: s.opening_cents + s.cash_cents + s.in_cents - s.out_cents } })),
    entries: entries.map(e => {
      const history = reversals.filter(row => row.sale_id === e.id).map(row => ({ ...row, data: row.data ? JSON.parse(row.data) : null }));
      const last = history.at(-1), returned = history.reduce((sum, row) => sum + row.amount_cents, 0);
      const reversal = last ? { id: last.id, kind: last.kind, createdAt: last.created_at, actor: last.actor, reason: last.reason, amountCents: returned, remainingCents: e.amount_cents - returned, partial: returned < e.amount_cents } : undefined;
      const original = e.kind === 'sale' ? JSON.parse(e.data) : null;
      return { id: e.id, sessionId: e.session_id, kind: e.kind, method: original?.method ?? e.method, amountCents: e.amount_cents, createdAt: e.created_at, actor: e.actor, note: e.note,
        receipt: original ? { ...original, ...(reversal ? { reversal } : {}) } : null, refundHistory: history.map(row => ({ data: row.data })), ...(reversal ? { reversal } : {}) };
    }), adjustments: adjustments.map(a => ({ id: a.id, saleId: a.sale_id, sessionId: a.session_id, kind: a.kind, method: a.method, amountCents: a.amount_cents, createdAt: a.created_at, actor: a.actor, reason: a.reason, data: a.data ? JSON.parse(a.data) : null })), ...(receipt ? { receipt } : {}) };
}
async function reverse(env, actor, input, deviceId, settings) {
  if (!idOK(input.id) || !idOK(input.saleId) || typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 1000) fail(400, 'INVALID_DATA');
  const requested = input.refund ?? { mode: 'full' };
  if (input.operation === 'void' && requested.mode !== 'full') fail(400, 'INVALID_REFUND');
  const check = row => { if (row.sale_id !== input.saleId || row.session_id !== input.sessionId || row.kind !== input.operation || row.reason !== input.reason
    || JSON.stringify(row.data ? JSON.parse(row.data).input : { mode: 'full' }) !== JSON.stringify(requested)) fail(409, 'INVALID_RETRY'); };
  const prior = await env.DB.prepare('SELECT * FROM cash_reversals WHERE store_id = ? AND id = ?').bind(actor.storeId, input.id).first();
  if (prior) { check(prior); return reply(await overview(env, actor, deviceId)); }
  if (!canManageCash(actor, settings)) fail(403, 'MANAGER_REQUIRED');
  const sale = await env.DB.prepare("SELECT * FROM cash_entries WHERE store_id = ? AND id = ? AND kind = 'sale'").bind(actor.storeId, input.saleId).first();
  if (!sale) fail(404, 'SALE_NOT_FOUND');
  if (input.operation === 'void' && sale.session_id !== input.sessionId) fail(409, 'VOID_REQUIRES_ORIGINAL_OPEN');
  const { results: rows } = await env.DB.prepare('SELECT * FROM cash_reversals WHERE store_id = ? AND sale_id = ? ORDER BY created_at, id').bind(actor.storeId, input.saleId).all();
  if (input.operation === 'void' && rows.length) fail(409, 'VOID_AFTER_REFUND');
  const history = rows.map(row => ({ data: row.data ? JSON.parse(row.data) : null })), original = JSON.parse(sale.data);
  let refund; try { refund = prepareRefund(original, history, requested); } catch (error) { fail(400, error.message); }
  const expected = rows.reduce((sum, row) => sum + row.amount_cents, 0), cashPart = refund.payments.find(row => row.method === 'cash')?.amountCents ?? 0;
  const method = refund.payments.length > 1 ? 'split' : refund.payments[0].method;
  const legacy = !rows.length && requested.mode === 'full' && receiptPayments(original).length === 1;
  const table = legacy ? 'cash_adjustments' : 'cash_refunds';
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO ${table}(store_id, id, sale_id, session_id, kind, method, amount_cents, created_at, actor, reason${legacy ? '' : ', data'})
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${legacy ? '' : ', ?'} WHERE EXISTS(SELECT 1 FROM cash_sessions WHERE store_id = ? AND id = ? AND device_id = ? AND closed_at IS NULL)
    AND NOT EXISTS(SELECT 1 FROM cash_reversals WHERE store_id = ? AND id = ?)
    AND COALESCE((SELECT SUM(amount_cents) FROM cash_reversals WHERE store_id = ? AND sale_id = ?), 0) = ?
    AND ${balanceSQL} >= ?`)
    .bind(actor.storeId, input.id, input.saleId, input.sessionId, input.operation, method, refund.amountCents, new Date().toISOString(), actor.username, input.reason,
      ...(legacy ? [] : [JSON.stringify(refund)]), actor.storeId, input.sessionId, deviceId, actor.storeId, input.id, actor.storeId, input.saleId, expected,
      actor.storeId, input.sessionId, actor.storeId, input.sessionId, cashPart).run();
  if (result.meta?.changes !== 1) {
    const retry = await env.DB.prepare('SELECT * FROM cash_reversals WHERE store_id = ? AND id = ?').bind(actor.storeId, input.id).first();
    if (retry) { check(retry); return reply(await overview(env, actor, deviceId)); }
    const latest = await env.DB.prepare('SELECT COALESCE(SUM(amount_cents), 0) AS amount FROM cash_reversals WHERE store_id = ? AND sale_id = ?').bind(actor.storeId, input.saleId).first();
    if (latest.amount !== expected) fail(409, latest.amount === sale.amount_cents ? 'SALE_ALREADY_REVERSED' : 'REFUND_CHANGED');
    const session = await env.DB.prepare('SELECT closed_at FROM cash_sessions WHERE store_id = ? AND id = ?').bind(actor.storeId, input.sessionId).first();
    fail(409, session?.closed_at ? 'CASH_CLOSED' : 'INSUFFICIENT_CASH');
  }
  return reply(await overview(env, actor, deviceId));
}

export async function cashResponse(request, env, actor, input) {
  if (!(await storeModules(env, actor.storeId)).cash) fail(403, 'MODULE_DISABLED');
  const deviceId = input?.deviceId ?? new URL(request.url).searchParams.get('deviceId');
  if (!/^[a-f0-9-]{36}$/.test(deviceId || '')) fail(400, 'INVALID_DATA');
  if (request.method === 'GET') return reply(await overview(env, actor, deviceId));
  if (request.method !== 'POST' || !input || !['open', 'sale', 'in', 'out', 'close', 'void', 'refund'].includes(input.operation)) fail(400, 'INVALID_DATA');
  const now = new Date().toISOString();
  if (input.operation === 'open') {
    if (!idOK(input.id) || !validCents(input.openingCents)) fail(400, 'INVALID_DATA');
    const prior = await env.DB.prepare('SELECT * FROM cash_sessions WHERE store_id = ? AND id = ?').bind(actor.storeId, input.id).first();
    if (prior) {
      if (prior.device_id !== deviceId || prior.opening_cents !== input.openingCents) fail(409, 'INVALID_RETRY');
      return reply(await overview(env, actor, deviceId));
    }
    await env.DB.prepare('INSERT OR IGNORE INTO cash_sessions(store_id, id, device_id, opened_by, opened_at, opening_cents) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS(SELECT 1 FROM cash_sessions WHERE store_id = ? AND device_id = ? AND closed_at IS NULL)').bind(actor.storeId, input.id, deviceId, actor.username, now, input.openingCents, actor.storeId, deviceId).run();
    const created = await env.DB.prepare('SELECT * FROM cash_sessions WHERE store_id = ? AND id = ?').bind(actor.storeId, input.id).first();
    if (!created) fail(409, 'CASH_ALREADY_OPEN');
    if (created.device_id !== deviceId || created.opening_cents !== input.openingCents) fail(409, 'INVALID_RETRY');
    return reply(await overview(env, actor, deviceId));
  }
  if (!idOK(input.sessionId)) fail(400, 'INVALID_DATA');
  const session = await env.DB.prepare('SELECT * FROM cash_sessions WHERE store_id = ? AND id = ? AND device_id = ?').bind(actor.storeId, input.sessionId, deviceId).first();
  if (!session) fail(409, 'CASH_CLOSED');
  if (input.operation === 'close') {
    if (!validCents(input.countedCents)) fail(400, 'INVALID_DATA');
    if (session.closed_at) {
      if (session.counted_cents !== input.countedCents) fail(409, 'INVALID_RETRY');
    } else {
      await env.DB.prepare('UPDATE cash_sessions SET closed_at = ?, closed_by = ?, counted_cents = ? WHERE store_id = ? AND id = ? AND closed_at IS NULL').bind(now, actor.username, input.countedCents, actor.storeId, input.sessionId).run();
      const closed = await env.DB.prepare('SELECT counted_cents FROM cash_sessions WHERE store_id = ? AND id = ?').bind(actor.storeId, input.sessionId).first();
      if (closed.counted_cents !== input.countedCents) fail(409, 'INVALID_RETRY');
    }
    return reply(await overview(env, actor, deviceId));
  }
  const settings = await cashSettings(env, actor.storeId);
  if (['void', 'refund'].includes(input.operation)) return reverse(env, actor, input, deviceId, settings);
  if (!idOK(input.id) || typeof input.note !== 'string' || input.note.length > 1000) fail(400, 'INVALID_DATA');
  const prior = await env.DB.prepare('SELECT * FROM cash_entries WHERE store_id = ? AND id = ?').bind(actor.storeId, input.id).first();
  let receipt = null, amount = input.amountCents, method = 'cash', orderId = null;
  if (input.operation === 'sale') {
    if ((!input.payments && !['cash', 'card', 'zelle'].includes(input.method)) || typeof input.customer !== 'string' || input.customer.length > 500 || !validBusinessItems(input.items, true)) fail(400, 'INVALID_DATA');
    const oldReceipt = prior?.kind === 'sale' ? JSON.parse(prior.data) : null;
    const discount = input.discount ?? { kind: 'amount', value: 0, reason: '' };
    const rate = oldReceipt ? oldReceipt.taxRateBps ?? 0 : settings.tax.enabled ? settings.tax.rateBps : 0;
    if (!prior && (input.taxRateBps ?? 0) !== rate) fail(409, 'TAX_CHANGED');
    let pricing; try { pricing = calculateSale(input.items, discount, rate, (input.tipCents !== undefined || input.deliveryFeeCents !== undefined) ? { tipCents: input.tipCents ?? 0, deliveryFeeCents: input.deliveryFeeCents ?? 0 } : undefined); } catch (error) { fail(400, error.message); }
    if (!prior && discount.value > 0 && !canManageCash(actor, settings)) fail(403, 'MANAGER_REQUIRED');
    let priceAdjustments = oldReceipt?.priceAdjustments ?? [];
    if (!prior) {
      const record = await env.DB.prepare("SELECT data FROM store_records WHERE store_id = ? AND key = 'menu'").bind(actor.storeId).first();
      const menu = record ? JSON.parse(record.data) : [];
      priceAdjustments = input.items.flatMap(item => {
        const matches = item.productId ? menu.filter(product => product.id === item.productId) : menu.filter(product => product.name === item.name && product.category === item.category);
        const product = matches.length === 1 ? matches[0] : null;
        const changed = !product || product.name !== item.name || product.category !== item.category || Math.round(product.price * 100) !== item.unitPriceCents;
        if (changed && !canManageCash(actor, settings)) fail(403, 'PRICE_APPROVAL_REQUIRED');
        return changed ? [{ productId: item.productId ?? null, name: item.name, catalogPriceCents: product ? Math.round(product.price * 100) : null, chargedPriceCents: item.unitPriceCents, quantity: item.quantity }] : [];
      });
    }
    if (!prior) await requireAvailable(env, actor.storeId, input.items);
    if (!prior && input.customerId !== undefined) await requireCustomer(env, actor.storeId, input.customerId);
    amount = pricing.totalCents;
    let payments; try { payments = normalizePayments(input.payments ?? [{ method: input.method, amountCents: amount, tenderedCents: input.tenderedCents }], amount); } catch (error) { fail(400, error.message); }
    method = payments[0].method;
    const tendered = payments.reduce((sum, payment) => sum + payment.tenderedCents, 0), change = payments.reduce((sum, payment) => sum + payment.changeCents, 0);
    if (input.orderId !== undefined) {
      if (!idOK(input.orderId)) fail(400, 'INVALID_DATA');
      const source = await env.DB.prepare('SELECT key FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, 'order:' + input.orderId).first();
      if (!source) fail(400, 'ORDER_NOT_SYNCED');
      orderId = input.orderId;
    }
    const store = await activeStore(env, actor.storeId);
    receipt = { id: input.id, storeName: store.name, currency: 'USD', createdAt: now, customer: input.customer, items: input.items, ...pricing,
      discountKind: discount.kind, discountValue: discount.value, discountReason: discount.reason, operator: actor.username, priceAdjustments, ...(discount.value > 0 || priceAdjustments.length ? { authorizedBy: actor.username } : {}),
      ...(input.customerId ? { customerId: input.customerId } : {}), ...(input.payments ? { payments } : {}), method: payments.length > 1 ? 'split' : method, tenderedCents: tendered, changeCents: change };
  } else if (!validCents(amount) || amount === 0 || !input.note.trim()) fail(400, 'INVALID_DATA');
  function checkedPrior(prior) {
    const oldReceipt = JSON.parse(prior.data);
    if (prior.session_id !== input.sessionId || prior.kind !== input.operation || prior.amount_cents !== amount || prior.method !== method || prior.order_id !== orderId || prior.note !== input.note
      || (receipt && (oldReceipt.customerId !== receipt.customerId || (oldReceipt.tipCents ?? 0) !== (receipt.tipCents ?? 0) || (oldReceipt.deliveryFeeCents ?? 0) !== (receipt.deliveryFeeCents ?? 0) || JSON.stringify(receiptPayments(oldReceipt)) !== JSON.stringify(receiptPayments(receipt)) || oldReceipt.customer !== receipt.customer || oldReceipt.tenderedCents !== receipt.tenderedCents || JSON.stringify(oldReceipt.items) !== JSON.stringify(receipt.items)
        || (oldReceipt.discountKind ?? 'amount') !== receipt.discountKind || (oldReceipt.discountValue ?? 0) !== receipt.discountValue || (oldReceipt.discountReason ?? '') !== receipt.discountReason
        || (input.taxRateBps ?? 0) !== (oldReceipt.taxRateBps ?? 0)))) fail(409, 'INVALID_RETRY');
    return prior.kind === 'sale' ? oldReceipt : null;
  }
  if (prior) return reply(await overview(env, actor, deviceId, checkedPrior(prior)));
  // The insertion checks the session and cash balance in the same SQLite
  // statement; concurrent close/withdrawal/payment cannot bypass these checks.
  const result = await env.DB.prepare(`INSERT OR IGNORE INTO cash_entries(store_id, id, session_id, kind, method, amount_cents, created_at, actor, note, order_id, data)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM cash_sessions WHERE store_id = ? AND id = ? AND device_id = ? AND closed_at IS NULL)
    AND (? != 'out' OR ${balanceSQL} >= ?)`)
    .bind(actor.storeId, input.id, input.sessionId, input.operation, method, amount, now, actor.username, input.note, orderId, JSON.stringify(receipt), actor.storeId, input.sessionId, deviceId, input.operation, actor.storeId, input.sessionId, actor.storeId, input.sessionId, amount).run();
  if (result.meta?.changes !== 1) {
    const concurrent = await env.DB.prepare('SELECT * FROM cash_entries WHERE store_id = ? AND id = ?').bind(actor.storeId, input.id).first();
    if (concurrent) return reply(await overview(env, actor, deviceId, checkedPrior(concurrent)));
    if (orderId && await env.DB.prepare('SELECT id FROM cash_entries WHERE store_id = ? AND order_id = ?').bind(actor.storeId, orderId).first()) fail(409, 'ORDER_ALREADY_PAID');
    const latest = await env.DB.prepare('SELECT closed_at FROM cash_sessions WHERE store_id = ? AND id = ?').bind(actor.storeId, input.sessionId).first();
    fail(409, latest?.closed_at ? 'CASH_CLOSED' : input.operation === 'out' ? 'INSUFFICIENT_CASH' : 'INVALID_RETRY');
  }
  return reply(await overview(env, actor, deviceId, receipt));
}
