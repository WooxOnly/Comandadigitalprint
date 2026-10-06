import { DEFAULT_ACCESS, allowedAccess } from '../../shared/operations-validation.mjs';
export async function storeAccess(env, storeId) {
  const row = await env.DB.prepare('SELECT data FROM store_access_settings WHERE store_id = ?').bind(storeId).first();
  return row ? JSON.parse(row.data) : DEFAULT_ACCESS;
}
export const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
export async function requireAccess(env, actor, action) {
  if (!allowedAccess(await storeAccess(env, actor.storeId), action, actor.username)) fail(403, 'ACCESS_DENIED');
}
export async function validAccessUsers(env, storeId, access) {
  for (const name of new Set(Object.values(access).flatMap(names => names ?? []))) {
    const row = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(storeId, 'user:' + name).first();
    if (!row || !JSON.parse(row.data).active) return false;
  }
  return true;
}
export async function requireAvailable(env, storeId, items) {
  for (const id of new Set(items.flatMap(item => [item.productId, item.secondProductId]).filter(Boolean))) {
    const row = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(storeId, 'product-option:' + id).first();
    if (row && !JSON.parse(row.data).available) fail(409, 'PRODUCT_UNAVAILABLE');
  }
}
