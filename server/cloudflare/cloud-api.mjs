import { storeAccess, requireAccess } from './operations.mjs';
import { PREPARATION_TIMES, PREPARATION_ACTORS } from '../../shared/preparation-times.mjs';
import { provisionableStores, weeklyAdmin } from './admin-auth.mjs';
import { activeStore, DEFAULT_STORE_ID, storeModules } from './stores.mjs';
import { customerHistoryResponse, requireCustomer } from './customer-api.mjs';
import { cashResponse } from './cash-api.mjs';
import { cashReportResponse } from './cash-reports.mjs';
import { cashSettings, canManageCash } from './cash-settings.mjs';
import { validCloudValue } from '../../shared/cloud-validation.mjs';
import defaultMenu from '../menu.json' with { type: 'json' };

const encode = (s) => new TextEncoder().encode(s);
const hex = (b) => Array.from(new Uint8Array(b), (v) => v.toString(16).padStart(2, '0')).join('');
const unhex = (s) => Uint8Array.from(s.match(/../g), (v) => parseInt(v, 16));
const reply = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail(415, 'INVALID_DATA');
  const reader = request.body?.getReader(); if (!reader) fail(400, 'INVALID_DATA');
  let size = 0; const chunks = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 1024 * 1024) { await reader.cancel(); fail(413, 'INVALID_DATA'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { fail(400, 'INVALID_DATA'); }
}
async function sign(env, payload) {
  if (!env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD_SECRET.length < 32) fail(503, 'UNAVAILABLE');
  const key = await crypto.subtle.importKey('raw', encode(env.ADMIN_PASSWORD_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return hex(await crypto.subtle.sign('HMAC', key, encode('cloud-session:' + payload)));
}
async function session(request, env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (token.length > 2000) fail(401, 'LOGIN_REQUIRED');
  const [payload, signature] = token.split('.');
  if (!payload || !/^[a-f0-9]{64}$/.test(signature || '')) fail(401, 'LOGIN_REQUIRED');
  const key = await crypto.subtle.importKey('raw', encode(env.ADMIN_PASSWORD_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('HMAC', key, unhex(signature), encode('cloud-session:' + payload))) fail(401, 'LOGIN_REQUIRED');
  let data; try { data = JSON.parse(atob(payload)); } catch { fail(401, 'LOGIN_REQUIRED'); }
  if (!data || !Number.isFinite(data.expires) || data.expires < Date.now() || !/^[a-z0-9._-]{3,24}$/.test(data.username)) fail(401, 'LOGIN_REQUIRED');
  // Tokens issued before the store migration belong only to Seabra 1.
  data.storeId = data.storeId ?? DEFAULT_STORE_ID;
  try { await activeStore(env, data.storeId); } catch { fail(401, 'LOGIN_REQUIRED'); }
  if (data.username !== 'admin') {
    const record = await env.DB.prepare('SELECT data, revision FROM store_records WHERE store_id = ? AND key = ?').bind(data.storeId, 'user:' + data.username).first();
    if (!record || !JSON.parse(record.data).active || record.revision !== data.revision) fail(401, 'LOGIN_REQUIRED');
  }
  return data;
}
async function login(request, env) {
  const input = await body(request);
  const store = await activeStore(env, input?.storeId ?? DEFAULT_STORE_ID);
  const username = typeof input?.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9._-]{3,24}$/.test(username) || typeof input.password !== 'string' || input.password.length > 128) fail(401, 'BAD_LOGIN');
  const now = Date.now();
  const rateKey = username + ':' + (request.headers.get('CF-Connecting-IP') || 'unknown');
  // Reserve attempts before computing a password, including concurrent requests.
  const rate = await env.DB.prepare('INSERT INTO store_login_limits(store_id, key, attempts, reset_at) VALUES(?, ?, 1, ?) ON CONFLICT(store_id, key) DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END, reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END RETURNING attempts').bind(store.id, rateKey, now + 60000, now, now, now + 60000).first();
  if (rate.attempts > 5) fail(429, 'RATE_LIMIT');
  let credential, revision = 0;
  if (username === 'admin') {
    const rotation = await env.DB.prepare('SELECT revision FROM store_admin_rotation WHERE store_id = ?').bind(store.id).first();
    const current = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, now, rotation?.revision || 0, store.id);
    const { password: ignored, ...publicCredential } = current;
    if (input.password !== current.password) fail(401, 'BAD_LOGIN');
    credential = publicCredential;
  } else {
    const record = await env.DB.prepare('SELECT data, revision FROM store_records WHERE store_id = ? AND key = ?').bind(store.id, 'user:' + username).first();
    if (!record) fail(401, 'BAD_LOGIN');
    const user = JSON.parse(record.data);
    if (!user.active) fail(401, 'BAD_LOGIN');
    const passwordKey = await crypto.subtle.importKey('raw', encode(input.password), 'PBKDF2', false, ['deriveBits']);
    const hash = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(user.login.salt), iterations: user.login.iterations ?? 600000 }, passwordKey, 256));
    if (hash !== user.login.hash) fail(401, 'BAD_LOGIN');
    revision = record.revision; credential = user;
  }
  await env.DB.prepare('DELETE FROM store_login_limits WHERE store_id = ? AND (key = ? OR reset_at < ?)').bind(store.id, rateKey, now).run();
  const payload = btoa(JSON.stringify({ storeId: store.id, username, revision, expires: now + 7 * 86400000, nonce: crypto.randomUUID() }));
  return reply({ token: payload + '.' + await sign(env, payload), storeId: store.id, username, credential, revision });
}
export async function cloudResponse(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/cloud/')) return null;
  try {
    if (url.pathname === '/cloud/store' && request.method === 'GET') {
      const store = await activeStore(env, url.searchParams.get('storeId'));
      const modules = await storeModules(env, store.id);
      // Older tablets validate exactly two module flags. New tablets opt in.
      return reply({ storeId: store.id, name: store.name, modules: url.searchParams.get('moduleVersion') === '3' ? modules : url.searchParams.get('moduleVersion') === '2' ? { preorders: modules.preorders, cash: modules.cash, customers: modules.customers } : { preorders: modules.preorders, cash: modules.cash } });
    }
    if (url.pathname === '/cloud/login' && request.method === 'POST') return await login(request, env);
    if (url.pathname === '/cloud/provision' && request.method === 'POST') {
      const input = await body(request);
      if (typeof input?.username !== 'string' || typeof input?.password !== 'string' || input.username.length > 120 || input.password.length > 256) fail(400, 'INVALID_DATA');
      const result = await provisionableStores(input.username.trim(), input.password, env);
      return reply(result.stores ? { stores: result.stores } : { error: result.error }, result.status);
    }
    const actor = await session(request, env);
    if (url.pathname === '/cloud/access' && request.method === 'GET') return reply(await storeAccess(env, actor.storeId));
    if (url.pathname === '/cloud/customers/history') return await customerHistoryResponse(request, env, actor);
    if (url.pathname === '/cloud/cash/report') return await cashReportResponse(request, env, actor);
    if (url.pathname === '/cloud/cash') return await cashResponse(request, env, actor, request.method === 'POST' ? await body(request) : undefined);
    if (url.pathname === '/cloud/tablet-number' && request.method === 'POST') {
      const input = await body(request);
      if (!/^[a-f0-9-]{36}$/.test(input?.deviceId || '')) fail(400, 'INVALID_DATA');
      for (let attempt = 0; attempt < 3; attempt++) {
        await env.DB.prepare('INSERT OR IGNORE INTO store_tablet_numbers(store_id, device_id, number) VALUES(?, ?, (SELECT COALESCE(MAX(number), 0) + 1 FROM store_tablet_numbers WHERE store_id = ?))').bind(actor.storeId, input.deviceId, actor.storeId).run();
        const assigned = await env.DB.prepare('SELECT number FROM store_tablet_numbers WHERE store_id = ? AND device_id = ?').bind(actor.storeId, input.deviceId).first();
        if (assigned) return reply({ number: assigned.number });
      }
      fail(503, 'UNAVAILABLE');
    }
    if (url.pathname === '/cloud/diagnostics' && request.method === 'POST') {
      const entry = await body(request);
      if (entry?.storeId && entry.storeId !== actor.storeId) fail(403, 'STORE_FORBIDDEN');
      if (!entry || !/^[a-f0-9-]{36}$/.test(entry.id || '') || !/^[a-f0-9-]{36}$/.test(entry.deviceId || '') || typeof entry.createdAt !== 'string' || entry.createdAt.length > 40 || !Number.isFinite(Date.parse(entry.createdAt)) || !/^[a-zA-Z0-9_.-]{1,60}$/.test(entry.event || '') || !/^[a-zA-Z0-9_.-]{1,80}$/.test(entry.code || '') || (entry.orderId !== undefined && (typeof entry.orderId !== 'string' || !/^[a-zA-Z0-9-]{1,160}$/.test(entry.orderId)))) fail(400, 'INVALID_DATA');
      if (!entry.event.endsWith('.failed') && entry.event !== 'runtime.error' && entry.event !== 'runtime.fatal') return reply({ ok: true });
      await env.DB.prepare('INSERT INTO store_diagnostics(store_id, id, device_id, created_at, received_at, actor, event, code, order_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(store_id, id) DO NOTHING').bind(actor.storeId, entry.id, entry.deviceId, entry.createdAt, new Date().toISOString(), actor.username, entry.event, entry.code, entry.orderId || null).run();
      await env.DB.prepare('DELETE FROM store_diagnostics WHERE store_id = ? AND received_at < ?').bind(actor.storeId, new Date(Date.now() - 30 * 86400000).toISOString()).run();
      return reply({ ok: true });
    }
    const initialMenu = actor.storeId === DEFAULT_STORE_ID
      ? (await env.DB.prepare('SELECT data FROM menu WHERE id = 1').first())?.data ?? JSON.stringify(defaultMenu)
      : '[]';
    await env.DB.prepare("INSERT INTO store_events(store_id, mutation, key, data, actor, created_at) SELECT ?, 'initial-menu', 'menu', ?, 'server', ? WHERE NOT EXISTS(SELECT 1 FROM store_records WHERE store_id = ? AND key = 'menu') ON CONFLICT(store_id, mutation) DO NOTHING").bind(actor.storeId, initialMenu, new Date().toISOString(), actor.storeId).run();
    if (request.method === 'GET' && url.pathname === '/cloud/changes') {
      if (url.searchParams.has('storeId') && url.searchParams.get('storeId') !== actor.storeId) fail(403, 'STORE_FORBIDDEN');
      const cursor = Number(url.searchParams.get('after') || 0);
      if (!Number.isSafeInteger(cursor) || cursor < 0) fail(400, 'INVALID_DATA');
      const { results } = await env.DB.prepare('SELECT seq, key, data FROM store_events WHERE store_id = ? AND seq > ? ORDER BY seq LIMIT 50').bind(actor.storeId, cursor).all();
      const changes = results.filter(row => (url.searchParams.get('features') === 'operations-v1' || !/^(product-option:|preparation:|activity:)/.test(row.key)) && (!row.key.startsWith('user:') || actor.username === 'admin' || row.key === 'user:' + actor.username)).map((row) => ({ key: row.key, value: JSON.parse(row.data), revision: row.seq }));
      return reply({ changes, cursor: results.at(-1)?.seq ?? cursor, more: results.length === 50 });
    }
    if (request.method === 'POST' && url.pathname === '/cloud/change') {
      const input = await body(request);
      if (input?.storeId && input.storeId !== actor.storeId) fail(403, 'STORE_FORBIDDEN');
      if (!input || !validCloudValue(input.key, input.value) || !/^[a-zA-Z0-9-]{16,80}$/.test(input.id || '') || !Number.isSafeInteger(input.base) || input.base < 0) fail(400, 'INVALID_DATA');
      if (input.key.startsWith('customer:') && !(await storeModules(env, actor.storeId)).customers) fail(403, 'MODULE_DISABLED');
      if (input.key.startsWith('preorder:') && !(await storeModules(env, actor.storeId)).preorders) fail(403, 'MODULE_DISABLED');
      if (input.key === 'menu' && (await storeModules(env, actor.storeId)).cash && !canManageCash(actor, await cashSettings(env, actor.storeId))) {
        const current = await env.DB.prepare("SELECT data FROM store_records WHERE store_id = ? AND key = 'menu'").bind(actor.storeId).first();
        const menu = current ? JSON.parse(current.data) : [];
        if (input.value.some(product => !menu.some(previous => previous.id === product.id && previous.price === product.price))) fail(403, 'MANAGER_REQUIRED');
      }
      if (input.key.startsWith('user:') && actor.username !== 'admin') {
        if (input.key !== 'user:' + actor.username) fail(403, 'ADMIN_REQUIRED');
        const existing = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, input.key).first();
        const previous = existing && JSON.parse(existing.data);
        if (!previous?.active || input.value.username !== actor.username || input.value.active !== previous.active) fail(403, 'ADMIN_REQUIRED');
      }
      const data = JSON.stringify(input.value);
      const prior = await env.DB.prepare('SELECT key, data, seq FROM store_events WHERE store_id = ? AND mutation = ?').bind(actor.storeId, input.id).first();
      if (prior) {
        if (prior.key !== input.key || prior.data !== data) fail(409, 'INVALID_RETRY');
        return reply({ revision: prior.seq });
      }
      if (input.key.startsWith('preorder:')) {
        if (input.value.delivery && input.value.status === 'completed' && input.value.delivery.status !== 'delivered') fail(400, 'DELIVERY_NOT_COMPLETED');
        const existing = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, input.key).first();
        const previous = existing ? JSON.parse(existing.data) : null;
        if (previous?.delivery?.status === 'delivered' && JSON.stringify(previous.delivery) !== JSON.stringify(input.value.delivery)) fail(409, 'DELIVERY_ALREADY_COMPLETED');
        if (previous?.delivery?.status === 'out' && (!input.value.delivery || input.value.delivery.status === 'pending' || input.value.delivery.dispatchedAt !== previous.delivery.dispatchedAt)) fail(409, 'INVALID_DELIVERY_TRANSITION');
      }
      if (input.key.startsWith('preorder:') && input.value.customerId) {
        const record = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, input.key).first();
        if (!record || JSON.parse(record.data).customerId !== input.value.customerId) await requireCustomer(env, actor.storeId, input.value.customerId);
      }
      if (input.key === 'menu' || input.key.startsWith('product-option:')) await requireAccess(env, actor, 'menu');
      if (['printer', 'order-settings', 'logo'].includes(input.key) || input.key.startsWith('printer:')) await requireAccess(env, actor, 'settings');
      if (input.key.startsWith('activity:') && ['reprint', 'restore'].includes(input.value.kind)) await requireAccess(env, actor, input.value.kind);
      if (input.key.startsWith('preparation:')) {
        if (!(await storeModules(env, actor.storeId)).preparation) fail(403, 'MODULE_DISABLED');
        const source = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, 'order:' + input.value.orderId).first();
        if (!source) fail(400, 'ORDER_NOT_SYNCED');
        if (Date.parse(input.value.updatedAt) < Date.parse(JSON.parse(source.data).createdAt) || PREPARATION_TIMES.some(field => input.value[field] && Date.parse(input.value[field]) < Date.parse(JSON.parse(source.data).createdAt))) fail(400, 'INVALID_PREPARATION_TIME');
        const before = await env.DB.prepare('SELECT data, revision FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, input.key).first();
        const current = before ? JSON.parse(before.data).status : 'received';
        const stages = ['received', 'preparing', 'ready', 'completed'];
        if ((!before || before.revision === input.base) && stages.indexOf(input.value.status) <= stages.indexOf(current)) fail(409, 'INVALID_PREPARATION_TRANSITION');
        if (before && before.revision === input.base && Date.parse(input.value.updatedAt) < Date.parse(JSON.parse(before.data).updatedAt)) fail(409, 'INVALID_PREPARATION_TIME');
        if (before && before.revision === input.base && PREPARATION_TIMES.some(field => JSON.parse(before.data)[field] && JSON.parse(before.data)[field] !== input.value[field])) fail(409, 'PREPARATION_TIME_CHANGED');
        if (before && before.revision === input.base && PREPARATION_ACTORS.some(field => JSON.parse(before.data)[field] && JSON.parse(before.data)[field] !== input.value[field])) fail(409, 'PREPARATION_ACTOR_CHANGED');
        if (before && before.revision === input.base && PREPARATION_ACTORS.some((field, index) => !JSON.parse(before.data)[field] && JSON.parse(before.data)[PREPARATION_TIMES[index]] && input.value[field])) fail(409, 'PREPARATION_ACTOR_CHANGED');
        for (const username of new Set(PREPARATION_ACTORS.map(field => input.value[field]).filter(Boolean))) {
          if (username === 'admin') continue;
          const user = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, 'user:' + username).first();
          if (!user) fail(400, 'INVALID_PREPARATION_ACTOR');
        }
      }
      // CAS insertion plus the trigger is a single atomic SQLite statement.
      await env.DB.prepare(`INSERT INTO store_events(store_id, mutation, key, data, actor, created_at)
        SELECT ?, ?, ?, ?, ?, ? WHERE COALESCE((SELECT revision FROM store_records WHERE store_id = ? AND key = ?), 0) = ?
        AND (? NOT LIKE 'order:%' OR NOT EXISTS(SELECT 1 FROM store_records WHERE store_id = ? AND key = ?))
        ON CONFLICT(store_id, mutation) DO NOTHING`).bind(actor.storeId, input.id, input.key, data, actor.username, new Date().toISOString(), actor.storeId, input.key, input.base, input.key, actor.storeId, input.key).run();
      const written = await env.DB.prepare('SELECT key, data, seq FROM store_events WHERE store_id = ? AND mutation = ?').bind(actor.storeId, input.id).first();
      if (written) {
        if (written.key !== input.key || written.data !== data) fail(409, 'INVALID_RETRY');
        return reply({ revision: written.seq });
      }
      const current = await env.DB.prepare('SELECT data, revision FROM store_records WHERE store_id = ? AND key = ?').bind(actor.storeId, input.key).first();
      if (current && current.data === data) return reply({ revision: current.revision });
      return reply({ error: 'CONFLICT', current: current ? { key: input.key, value: JSON.parse(current.data), revision: current.revision } : null }, 409);
    }
    return reply({ error: 'NOT_FOUND' }, 404);
  } catch (error) { return reply({ error: error.status ? error.message : 'UNAVAILABLE' }, error.status || 503); }
}
