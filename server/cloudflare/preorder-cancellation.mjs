import { appRole, canCancelPreorders } from '../../shared/app-roles.mjs';
import { storeModules } from './stores.mjs';
const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
export async function cancellationUsers(env, actor) {
  if (!(await storeModules(env, actor.storeId)).preorders) fail(403, 'MODULE_DISABLED');
  const { results } = await env.DB.prepare("SELECT data FROM store_records WHERE store_id = ? AND key LIKE 'user:%' ORDER BY key").bind(actor.storeId).all();
  return { users: [{ username: 'admin', role: 'admin' }, ...results.map(row => JSON.parse(row.data)).filter(user => user.active && canCancelPreorders(appRole(user.username, user.role), user.cancelPreorders)).map(user => ({ username: user.username, role: appRole(user.username, user.role) }))] };
}
export async function cancelPreorder(env, actor, input, authenticate) {
  if (!(await storeModules(env, actor.storeId)).preorders) fail(403, 'MODULE_DISABLED');
  if (!input || !/^[a-zA-Z0-9-]{16,80}$/.test(input.id || '') || typeof input.orderId !== 'string' || !input.orderId || input.orderId.length > 160 || !Number.isSafeInteger(input.base) || input.base < 1 || typeof input.username !== 'string' || !/^[a-z0-9._-]{3,24}$/.test(input.username) || typeof input.password !== 'string' || !input.password || input.password.length > 128) fail(400, 'INVALID_DATA');
  const authorization = await authenticate(input.username, input.password);
  const role = appRole(input.username, authorization.credential?.role);
  if (!canCancelPreorders(role, authorization.credential?.cancelPreorders)) fail(403, 'CANCELLATION_NOT_ALLOWED');
  const key = 'preorder:' + input.orderId;
  const prior = await env.DB.prepare('SELECT key, data, seq FROM store_events WHERE store_id = ? AND mutation = ?').bind(actor.storeId, input.id).first();
  if (prior) {
    const value = JSON.parse(prior.data);
    if (prior.key !== key || value.cancellation?.requestedBy !== actor.username || value.cancellation?.authorizedBy !== input.username) fail(409, 'INVALID_RETRY');
    return { record: { key, value, revision: prior.seq } };
  }
  const previous = await env.DB.prepare('SELECT data, revision FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, key).first();
  if (!previous) fail(404, 'PREORDER_NOT_FOUND');
  if (previous.revision !== input.base) fail(409, 'PREORDER_CHANGED');
  const value = JSON.parse(previous.data);
  if (['completed', 'cancelled'].includes(value.status)) fail(409, 'PREORDER_FINISHED');
  const now = new Date().toISOString();
  const cancelled = { ...value, status: 'cancelled', cancellation: { authorizedBy: input.username, requestedBy: actor.username, at: now } };
  const result = await env.DB.prepare(`INSERT INTO store_events(store_id, mutation, key, data, actor, created_at)
    SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT revision FROM store_records WHERE store_id = ? AND key = ?) = ?
    AND (? = 'admin' OR (SELECT revision FROM store_records WHERE store_id = ? AND key = ?) = ?)`).bind(actor.storeId, input.id, key, JSON.stringify(cancelled), input.username, now, actor.storeId, key, input.base, input.username, actor.storeId, 'user:' + input.username, authorization.revision).run();
  if (!result.meta.changes) fail(409, 'PREORDER_CHANGED');
  const saved = await env.DB.prepare('SELECT seq FROM store_events WHERE store_id = ? AND mutation = ?').bind(actor.storeId, input.id).first();
  return { record: { key, value: cancelled, revision: saved.seq } };
}
