import { storeModules } from './stores.mjs';
import { cashSettings, canManageCash } from './cash-settings.mjs';
const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
export async function requireCustomer(env, storeId, customerId) {
  if (typeof customerId !== 'string' || !customerId || customerId.length > 160) fail(400, 'INVALID_CUSTOMER');
  if (!(await storeModules(env, storeId)).customers) fail(403, 'MODULE_DISABLED');
  const record = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(storeId, 'customer:' + customerId).first();
  if (!record || !JSON.parse(record.data).active) fail(400, 'INVALID_CUSTOMER');
}
export async function customerHistoryResponse(request, env, actor) {
  const modules = await storeModules(env, actor.storeId);
  if (!modules.customers) fail(403, 'MODULE_DISABLED');
  if (request.method !== 'GET') fail(405, 'INVALID_DATA');
  const customerId = new URL(request.url).searchParams.get('customerId');
  if (!customerId || customerId.length > 160) fail(400, 'INVALID_DATA');
  const customer = await env.DB.prepare('SELECT key FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, 'customer:' + customerId).first();
  if (!customer) fail(404, 'CUSTOMER_NOT_FOUND');
  const { results: preorders } = modules.preorders ? await env.DB.prepare("SELECT data FROM store_records WHERE store_id = ? AND key LIKE 'preorder:%' AND json_extract(data, '$.customerId') = ? ORDER BY json_extract(data, '$.dueAt') DESC LIMIT 101").bind(actor.storeId, customerId).all() : { results: [] };
  const { results: sales } = modules.cash ? await env.DB.prepare("SELECT e.id, e.created_at, e.data, COALESCE((SELECT SUM(a.amount_cents) FROM cash_reversals a WHERE a.store_id = e.store_id AND a.sale_id = e.id), 0) AS refunded FROM cash_entries e WHERE e.store_id = ? AND e.kind = 'sale' AND json_extract(e.data, '$.customerId') = ? ORDER BY e.created_at DESC LIMIT 101").bind(actor.storeId, customerId).all() : { results: [] };
  const financial = modules.cash && canManageCash(actor, await cashSettings(env, actor.storeId));
  return Response.json({ customerId, more: preorders.length > 100 || sales.length > 100, preorders: preorders.slice(0, 100).map(row => {
    const record = JSON.parse(row.data);
    if (modules.cash) return record;
    return { ...record, items: record.items.map(({ unitPriceCents, ...item }) => item) };
  }), sales: sales.slice(0, 100).map(row => {
    const receipt = JSON.parse(row.data);
    return { id: row.id, createdAt: row.created_at, items: receipt.items.map(item => ({ name: item.name, quantity: item.quantity })), ...(financial ? { totalCents: receipt.totalCents, refundedCents: row.refunded } : {}) };
  }) }, { headers: { 'Cache-Control': 'no-store' } });
}
