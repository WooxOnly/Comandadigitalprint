import { applyOfflinePreparationCorrection } from './offline-preparation-correction.mjs';
import { validPreparation } from '../../shared/operations-validation.mjs';
import { appRole, canCorrectPreparation } from '../../shared/app-roles.mjs';
import { PREPARATION_STAGES, PREPARATION_TIMES, PREPARATION_ACTORS } from '../../shared/preparation-times.mjs';
import { storeModules } from './stores.mjs';
const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
export async function preparationCorrectionUsers(env, actor) {
  if (!(await storeModules(env, actor.storeId)).preparation) fail(403, 'MODULE_DISABLED');
  const { results } = await env.DB.prepare("SELECT data FROM store_records WHERE store_id = ? AND key LIKE 'user:%' ORDER BY key").bind(actor.storeId).all();
  return { users: [{ username: 'admin', role: 'admin' }, ...results.map(row => JSON.parse(row.data)).filter(user => user.active && canCorrectPreparation(appRole(user.username, user.role), user.correctPreparation)).map(user => ({ username: user.username, role: appRole(user.username, user.role) }))] };
}
export async function correctPreparation(env, actor, input, authenticate, clock = Date.now) {
  if (!(await storeModules(env, actor.storeId)).preparation) fail(403, 'MODULE_DISABLED');
  if (input?.offline) return applyOfflinePreparationCorrection(env,actor,input);
  if (!input || !/^[a-zA-Z0-9-]{16,80}$/.test(input.id || '') || typeof input.orderId !== 'string' || !input.orderId || input.orderId.length > 160 || !Number.isSafeInteger(input.base) || input.base < 1 || (input.status !== undefined && !PREPARATION_STAGES.includes(input.status)) || (input.username !== undefined && (typeof input.username !== 'string' || !/^[a-z0-9._-]{3,24}$/.test(input.username)))) fail(400, 'INVALID_DATA');
  const key = 'preparation:' + input.orderId;
  // A retry recovers a committed correction without requiring a second password or extending its undo window.
  const prior = await env.DB.prepare('SELECT key, data, seq FROM store_events WHERE store_id = ? AND mutation = ?').bind(actor.storeId, input.id).first();
  if (prior) {
    const value = JSON.parse(prior.data), correction = value.correction;
    if (prior.key !== key || correction?.requestedBy !== actor.username || correction.base !== input.base || correction.requestedStatus !== (input.status ?? null) || correction.authorizedBy !== (input.username ?? null)) fail(409, 'INVALID_RETRY');
    return { record: { key, value, revision: prior.seq } };
  }
  const current = await env.DB.prepare('SELECT seq, data, actor, created_at FROM store_events WHERE store_id = ? AND key = ? ORDER BY seq DESC LIMIT 1').bind(actor.storeId, key).first();
  if (!current || current.seq !== input.base) fail(409, 'PREPARATION_CHANGED');
  const before = JSON.parse(current.data), currentStage = PREPARATION_STAGES.indexOf(before.status);
  const previous = await env.DB.prepare('SELECT data FROM store_events WHERE store_id = ? AND key = ? AND seq < ? ORDER BY seq DESC LIMIT 1').bind(actor.storeId, key, input.base).first();
  const snapshot = previous ? JSON.parse(previous.data) : { orderId: input.orderId, status: 'received' };
  const timestamp = clock(), now = new Date(timestamp).toISOString();
  const age = timestamp - Date.parse(current.created_at), actionAge = timestamp - Date.parse(before.updatedAt);
  const target = input.status ?? snapshot.status;
  if (PREPARATION_STAGES.indexOf(target) >= currentStage || PREPARATION_STAGES.indexOf(target) < 0) fail(409, 'INVALID_PREPARATION_TRANSITION');
  const quick = !input.username && current.actor === actor.username && age >= 0 && age <= 60000 && actionAge >= 0 && actionAge <= 60000 && before.correction?.at !== current.created_at && target === snapshot.status;
  let authorization;
  if (!quick) {
    if (typeof input.username !== 'string' || !/^[a-z0-9._-]{3,24}$/.test(input.username) || typeof input.password !== 'string' || !input.password || input.password.length > 128) fail(403, 'PREPARATION_AUTH_REQUIRED');
    authorization = await authenticate(input.username, input.password);
    if (!canCorrectPreparation(appRole(input.username, authorization.credential?.role), authorization.credential?.correctPreparation)) fail(403, 'PREPARATION_CORRECTION_NOT_ALLOWED');
  }
  const value = { ...before, status: target, updatedAt: now };
  // Keep earlier genuine stage times; remove the mistaken stage and everything after it.
  const stage = PREPARATION_STAGES.indexOf(target);
  for (let i = 0; i < PREPARATION_TIMES.length; i++) {
    if (i >= stage) { delete value[PREPARATION_TIMES[i]]; delete value[PREPARATION_ACTORS[i]]; }
    else if (quick && snapshot[PREPARATION_TIMES[i]]) {
      value[PREPARATION_TIMES[i]] = snapshot[PREPARATION_TIMES[i]];
      if (snapshot[PREPARATION_ACTORS[i]]) value[PREPARATION_ACTORS[i]] = snapshot[PREPARATION_ACTORS[i]];
      else delete value[PREPARATION_ACTORS[i]];
    }
  }
  if (!validPreparation(value)) fail(409, 'INVALID_PREPARATION_TIME');
  value.correction = { id: input.id, base: input.base, from: before.status, to: target, at: now, requestedBy: actor.username, authorizedBy: quick ? null : input.username, requestedStatus: input.status ?? null, kind: quick ? 'undo' : 'authorized' };
  const authorizedBy = quick ? 'admin' : input.username;
  const written = await env.DB.prepare(`INSERT INTO store_events(store_id, mutation, key, data, actor, created_at)
    SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT revision FROM store_records WHERE store_id = ? AND key = ?) = ?
    AND (? = 'admin' OR (SELECT revision FROM store_records WHERE store_id = ? AND key = ?) = ?)
    ON CONFLICT(store_id, mutation) DO NOTHING`).bind(actor.storeId, input.id, key, JSON.stringify(value), actor.username, now, actor.storeId, key, input.base, authorizedBy, actor.storeId, 'user:' + authorizedBy, authorization?.revision ?? 0).run();
  if (!written.meta.changes) fail(409, 'PREPARATION_CHANGED');
  const saved = await env.DB.prepare('SELECT seq FROM store_events WHERE store_id = ? AND mutation = ?').bind(actor.storeId, input.id).first();
  return { record: { key, value, revision: saved.seq } };
}
