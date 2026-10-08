const encode = value => new TextEncoder().encode(value);
export const hex = value => Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g) || [], part => parseInt(part, 16));
export const MANAGER_COOKIE = '__Host-bistro_manager';
export const CSRF_COOKIE = '__Host-bistro_manager_csrf';
const TTL = 4 * 60 * 60 * 1000;
export const readCookie = (request, name) => request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
export const cookie = (name, value, seconds) => `${name}=${value}; Max-Age=${seconds}; Path=/; HttpOnly; Secure; SameSite=Strict`;
export const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function html(content, nonce, status = 200, extra = {}) {
  // Same-origin form POSTs retain Origin in browsers. Cross-origin navigations
  // still receive no referrer; login validates both Origin and the CSRF cookie.
  return new Response(content, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`, ...extra } });
}
export async function digest(password, salt) {
  const key = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: 100000 }, key, 256));
}
export function equal(left, right) {
  if (!/^[a-f0-9]{64}$/.test(left || '') || !/^[a-f0-9]{64}$/.test(right || '')) return false;
  let difference = 0;
  for (let i = 0; i < 64; i += 2) difference |= parseInt(left.slice(i, i + 2), 16) ^ parseInt(right.slice(i, i + 2), 16);
  return difference === 0;
}
async function key(env) {
  if (typeof env.ADMIN_PASSWORD_SECRET !== 'string' || env.ADMIN_PASSWORD_SECRET.length < 32) throw new Error('Manager secret unavailable');
  return crypto.subtle.importKey('raw', encode('bistro-manager-session:' + env.ADMIN_PASSWORD_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function issueSession(env, user, client, now) {
  const payload = hex(encode(JSON.stringify({ user: user.id, revision: user.revision, client: client.id, clientRevision: client.revision, expires: now + TTL })));
  const signature = hex(await crypto.subtle.sign('HMAC', await key(env), encode(payload)));
  return cookie(MANAGER_COOKIE, payload + '.' + signature, TTL / 1000);
}
export async function managerSession(request, env, now) {
  const value = readCookie(request, MANAGER_COOKIE);
  if (!value || value.length > 2000) return null;
  const [payload, signature, extra] = value.split('.');
  if (extra || !/^(?:[a-f0-9]{2})+$/.test(payload || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
  try {
    if (!await crypto.subtle.verify('HMAC', await key(env), unhex(signature), encode(payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(unhex(payload)));
    if (!Number.isFinite(data.expires) || data.expires <= now || data.expires > now + TTL) return null;
    const user = await env.DB.prepare('SELECT id, client_id, name, revision FROM manager_users WHERE id = ? AND active = 1').bind(data.user).first();
    if (!user || user.revision !== data.revision || user.client_id !== data.client) return null;
    const client = await env.DB.prepare('SELECT id, name, store_ids, revision FROM manager_clients WHERE id = ? AND active = 1').bind(user.client_id).first();
    if (!client || client.revision !== data.clientRevision) return null;
    return { user, client };
  } catch { return null; }
}
// Bound actual bytes, including chunked requests without Content-Length.
export async function readBody(request, max = 16384) {
  if (Number(request.headers.get('Content-Length')) > max) throw Object.assign(new Error('Formulário muito grande.'), { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error('Formulário inválido.'), { status: 400 });
  const chunks = []; let size = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw Object.assign(new Error('Formulário muito grande.'), { status: 413 }); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
export async function loginLimitKey(request, username) {
  return hex(await crypto.subtle.digest('SHA-256', encode((request.headers.get('CF-Connecting-IP') || 'unknown') + ':' + username)));
}
