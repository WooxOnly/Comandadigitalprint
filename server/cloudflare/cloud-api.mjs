import { weeklyAdmin } from './admin-auth.mjs';
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
  if (data.username !== 'admin') {
    const record = await env.DB.prepare('SELECT data, revision FROM cloud_records WHERE key = ?').bind('user:' + data.username).first();
    if (!record || !JSON.parse(record.data).active || record.revision !== data.revision) fail(401, 'LOGIN_REQUIRED');
  }
  return data;
}
async function login(request, env) {
  const input = await body(request);
  const username = typeof input?.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9._-]{3,24}$/.test(username) || typeof input.password !== 'string' || input.password.length > 128) fail(401, 'BAD_LOGIN');
  const now = Date.now();
  const rateKey = username + ':' + (request.headers.get('CF-Connecting-IP') || 'unknown');
  // Reserve attempts before computing a password, including concurrent requests.
  const rate = await env.DB.prepare('INSERT INTO cloud_login_limits(key, attempts, reset_at) VALUES(?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END, reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END RETURNING attempts').bind(rateKey, now + 60000, now, now, now + 60000).first();
  if (rate.attempts > 5) fail(429, 'RATE_LIMIT');
  let credential, revision = 0;
  if (username === 'admin') {
    const rotation = await env.DB.prepare('SELECT revision FROM admin_rotation WHERE id = 1').first();
    const current = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, now, rotation?.revision || 0);
    const { password: ignored, ...publicCredential } = current;
    if (input.password !== current.password) fail(401, 'BAD_LOGIN');
    credential = publicCredential;
  } else {
    const record = await env.DB.prepare('SELECT data, revision FROM cloud_records WHERE key = ?').bind('user:' + username).first();
    if (!record) fail(401, 'BAD_LOGIN');
    const user = JSON.parse(record.data);
    if (!user.active) fail(401, 'BAD_LOGIN');
    const passwordKey = await crypto.subtle.importKey('raw', encode(input.password), 'PBKDF2', false, ['deriveBits']);
    const hash = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(user.login.salt), iterations: user.login.iterations ?? 600000 }, passwordKey, 256));
    if (hash !== user.login.hash) fail(401, 'BAD_LOGIN');
    revision = record.revision; credential = user;
  }
  await env.DB.prepare('DELETE FROM cloud_login_limits WHERE key = ? OR reset_at < ?').bind(rateKey, now).run();
  const payload = btoa(JSON.stringify({ username, revision, expires: now + 7 * 86400000, nonce: crypto.randomUUID() }));
  return reply({ token: payload + '.' + await sign(env, payload), username, credential, revision });
}
export async function cloudResponse(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/cloud/')) return null;
  try {
    if (url.pathname === '/cloud/login' && request.method === 'POST') return await login(request, env);
    const actor = await session(request, env);
    if (url.pathname === '/cloud/diagnostics' && request.method === 'POST') {
      const entry = await body(request);
      if (!entry || !/^[a-f0-9-]{36}$/.test(entry.id || '') || !/^[a-f0-9-]{36}$/.test(entry.deviceId || '') || typeof entry.createdAt !== 'string' || entry.createdAt.length > 40 || !Number.isFinite(Date.parse(entry.createdAt)) || !/^[a-zA-Z0-9_.-]{1,60}$/.test(entry.event || '') || !/^[a-zA-Z0-9_.-]{1,80}$/.test(entry.code || '') || (entry.orderId !== undefined && (typeof entry.orderId !== 'string' || !/^[a-zA-Z0-9-]{1,160}$/.test(entry.orderId)))) fail(400, 'INVALID_DATA');
      if (!entry.event.endsWith('.failed') && entry.event !== 'runtime.error' && entry.event !== 'runtime.fatal') return reply({ ok: true });
      await env.DB.prepare('INSERT INTO diagnostics(id, device_id, created_at, received_at, actor, event, code, order_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(entry.id, entry.deviceId, entry.createdAt, new Date().toISOString(), actor.username, entry.event, entry.code, entry.orderId || null).run();
      await env.DB.prepare('DELETE FROM diagnostics WHERE received_at < ?').bind(new Date(Date.now() - 30 * 86400000).toISOString()).run();
      return reply({ ok: true });
    }
    await env.DB.prepare("INSERT INTO cloud_events(mutation, key, data, actor, created_at) SELECT 'initial-menu', 'menu', COALESCE((SELECT data FROM menu WHERE id = 1), ?), 'server', ? WHERE NOT EXISTS(SELECT 1 FROM cloud_records WHERE key = 'menu') ON CONFLICT(mutation) DO NOTHING").bind(JSON.stringify(defaultMenu), new Date().toISOString()).run();
    if (request.method === 'GET' && url.pathname === '/cloud/changes') {
      const cursor = Number(url.searchParams.get('after') || 0);
      if (!Number.isSafeInteger(cursor) || cursor < 0) fail(400, 'INVALID_DATA');
      const { results } = await env.DB.prepare('SELECT seq, key, data FROM cloud_events WHERE seq > ? ORDER BY seq LIMIT 50').bind(cursor).all();
      const changes = results.filter((row) => !row.key.startsWith('user:') || actor.username === 'admin' || row.key === 'user:' + actor.username).map((row) => ({ key: row.key, value: JSON.parse(row.data), revision: row.seq }));
      return reply({ changes, cursor: results.at(-1)?.seq ?? cursor, more: results.length === 50 });
    }
    if (request.method === 'POST' && url.pathname === '/cloud/change') {
      const input = await body(request);
      if (!input || !validCloudValue(input.key, input.value) || !/^[a-zA-Z0-9-]{16,80}$/.test(input.id || '') || !Number.isSafeInteger(input.base) || input.base < 0) fail(400, 'INVALID_DATA');
      if (input.key.startsWith('user:') && actor.username !== 'admin') {
        if (input.key !== 'user:' + actor.username) fail(403, 'ADMIN_REQUIRED');
        const existing = await env.DB.prepare('SELECT data FROM cloud_records WHERE key = ?').bind(input.key).first();
        const previous = existing && JSON.parse(existing.data);
        if (!previous?.active || input.value.username !== actor.username || input.value.active !== previous.active) fail(403, 'ADMIN_REQUIRED');
      }
      const data = JSON.stringify(input.value);
      const prior = await env.DB.prepare('SELECT key, data, seq FROM cloud_events WHERE mutation = ?').bind(input.id).first();
      if (prior) {
        if (prior.key !== input.key || prior.data !== data) fail(409, 'INVALID_RETRY');
        return reply({ revision: prior.seq });
      }
      // CAS insertion plus the trigger is a single atomic SQLite statement.
      await env.DB.prepare(`INSERT INTO cloud_events(mutation, key, data, actor, created_at)
        SELECT ?, ?, ?, ?, ? WHERE COALESCE((SELECT revision FROM cloud_records WHERE key = ?), 0) = ?
        AND (? NOT LIKE 'order:%' OR NOT EXISTS(SELECT 1 FROM cloud_records WHERE key = ?))
        ON CONFLICT(mutation) DO NOTHING`).bind(input.id, input.key, data, actor.username, new Date().toISOString(), input.key, input.base, input.key, input.key).run();
      const written = await env.DB.prepare('SELECT key, data, seq FROM cloud_events WHERE mutation = ?').bind(input.id).first();
      if (written) {
        if (written.key !== input.key || written.data !== data) fail(409, 'INVALID_RETRY');
        return reply({ revision: written.seq });
      }
      const current = await env.DB.prepare('SELECT data, revision FROM cloud_records WHERE key = ?').bind(input.key).first();
      if (current && current.data === data) return reply({ revision: current.revision });
      return reply({ error: 'CONFLICT', current: current ? { key: input.key, value: JSON.parse(current.data), revision: current.revision } : null }, 409);
    }
    return reply({ error: 'NOT_FOUND' }, 404);
  } catch (error) { return reply({ error: error.status ? error.message : 'UNAVAILABLE' }, error.status || 503); }
}
