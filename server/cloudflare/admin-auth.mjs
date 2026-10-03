import { loginPage, panelPage } from './admin-panel.mjs';
import { activeStore, DEFAULT_STORE_ID, storeId } from './stores.mjs';

// The secret stays on the server. Monday 00:00 UTC starts a new password week.
const WEEK = 7 * 24 * 60 * 60 * 1000;
const MONDAY = Date.UTC(1970, 0, 5);
const IDLE_MS = 60 * 60 * 1000;
const PANEL_ITERATIONS = 210000;
const COOKIE = '__Host-comanda_panel';
const CSRF_COOKIE = '__Host-comanda_csrf';
const encode = (value) => new TextEncoder().encode(value);
const hex = (value) => Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
const unhex = (value) => Uint8Array.from(value.match(/../g) || [], (part) => parseInt(part, 16));
const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
const cookieHeader = (value, age) => `${COOKIE}=${value}; Max-Age=${age}; Path=/; HttpOnly; Secure; SameSite=Strict`;
const csrfCookieHeader = (value) => `${CSRF_COOKIE}=${value}; Max-Age=3600; Path=/; HttpOnly; Secure; SameSite=Strict`;
const readCookie = (request, name) => request.headers.get('Cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(name + '='))?.slice(name.length + 1);

export async function weeklyAdmin(secret, timestamp = Date.now(), revision = 0, selectedStoreId = DEFAULT_STORE_ID) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Admin secret not configured');
  const selectedStore = storeId(selectedStoreId);
  const week = Math.floor((timestamp - MONDAY) / WEEK);
  const key = await crypto.subtle.importKey('raw', encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  // Keep the original Seabra 1 derivation so its current weekly password survives migration.
  const derive = async (purpose) => hex(await crypto.subtle.sign('HMAC', key, encode(selectedStore === DEFAULT_STORE_ID ? `${purpose}:${week}:${revision}` : `${purpose}:${selectedStore}:${week}:${revision}`)));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const password = (await derive('admin-password')).slice(0, 12).match(/../g).map((value) => alphabet[parseInt(value, 16) % alphabet.length]).join('');
  const salt = (await derive('admin-salt')).slice(0, 32);
  const saltBytes = unhex(salt);
  const passwordKey = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100000 }, passwordKey, 256));
  return { storeId: selectedStore, username: 'admin', week, revision, salt, hash, iterations: 100000, password, nextRotation: new Date(MONDAY + (week + 1) * WEEK).toISOString() };
}

async function sessionKey(env) {
  if (!env.ADMIN_VIEW_TOKEN || !env.ADMIN_PASSWORD_SECRET) return null;
  return crypto.subtle.importKey('raw', encode('panel-session:' + env.ADMIN_PASSWORD_SECRET + ':' + env.ADMIN_VIEW_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function panelPasswordState(env) {
  return env.DB ? env.DB.prepare('SELECT salt, hash, iterations, revision FROM panel_password WHERE id = 1').first() : null;
}

async function passwordDigest(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations }, key, 256));
}

function equalHex(left, right) {
  if (!/^[0-9a-f]{64}$/.test(left || '') || !/^[0-9a-f]{64}$/.test(right || '')) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 2) difference |= parseInt(left.slice(index, index + 2), 16) ^ parseInt(right.slice(index, index + 2), 16);
  return difference === 0;
}

async function issueSession(env, now, selectedStoreId) {
  const key = await sessionKey(env);
  if (!key) throw new Error('Panel secret missing');
  const state = await panelPasswordState(env);
  const payload = hex(encode(JSON.stringify({ user: env.ADMIN_PANEL_USER || 'admin', storeId: selectedStoreId, revision: state?.revision || 0, expires: now + IDLE_MS, nonce: crypto.randomUUID() })));
  const signature = hex(await crypto.subtle.sign('HMAC', key, encode('panel-session:' + payload)));
  return cookieHeader(payload + '.' + signature, IDLE_MS / 1000);
}

async function validSession(request, env, now) {
  const cookie = readCookie(request, COOKIE);
  if (!cookie || cookie.length > 2000) return null;
  const [payload, signature, extra] = cookie.split('.');
  if (extra || !/^(?:[0-9a-f]{2})+$/.test(payload || '') || !/^[0-9a-f]{64}$/.test(signature || '')) return null;
  const key = await sessionKey(env);
  if (!key || !await crypto.subtle.verify('HMAC', key, unhex(signature), encode('panel-session:' + payload))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(unhex(payload)));
    const state = await panelPasswordState(env);
    if (data.user !== (env.ADMIN_PANEL_USER || 'admin') || data.revision !== (state?.revision || 0) || !Number.isFinite(data.expires) || data.expires <= now || data.expires > now + IDLE_MS) return null;
    const selectedStoreId = data.storeId ?? DEFAULT_STORE_ID;
    await activeStore(env, selectedStoreId);
    return selectedStoreId;
  } catch { return null; }
}

async function credentialsMatch(username, password, env) {
  if (!env.ADMIN_VIEW_TOKEN || username.length > 120 || password.length > 256) return false;
  if (username !== (env.ADMIN_PANEL_USER || 'admin')) return false;
  const state = await panelPasswordState(env);
  if (state) {
    if (!/^[0-9a-f]{32}$/.test(state.salt) || !/^[0-9a-f]{64}$/.test(state.hash) || !Number.isSafeInteger(state.iterations) || state.iterations < 100000 || state.iterations > 1000000) throw new Error('Invalid panel password state');
    return equalHex(await passwordDigest(password, state.salt, state.iterations), state.hash);
  }
  const expected = encode((env.ADMIN_PANEL_USER || 'admin') + '\0' + env.ADMIN_VIEW_TOKEN);
  const provided = encode(username + '\0' + password);
  const [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', expected), crypto.subtle.digest('SHA-256', provided)]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

function htmlResponse(content, nonce, status = 200, extra = {}) {
  return new Response(content, { status, headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`, ...extra,
  } });
}

function loginResponse(nonce, message = '', status = 200) {
  const csrf = crypto.randomUUID();
  return htmlResponse(loginPage(nonce, message, csrf), nonce, status, { 'Set-Cookie': csrfCookieHeader(csrf) });
}

async function loginLimit(env, now) {
  if (!env.DB) return null;
  const state = await env.DB.prepare('SELECT blocked_until FROM panel_login WHERE id = 1').first();
  return state?.blocked_until > now ? state.blocked_until : null;
}

async function recordLogin(env, valid, now) {
  if (!env.DB) return;
  if (valid) await env.DB.prepare('UPDATE panel_login SET attempts = 0, blocked_until = 0 WHERE id = 1').run();
  else await env.DB.prepare('UPDATE panel_login SET attempts = CASE WHEN blocked_until > 0 THEN 1 ELSE attempts + 1 END, blocked_until = CASE WHEN blocked_until = 0 AND attempts >= 4 THEN ? ELSE 0 END WHERE id = 1').bind(now + 900000).run();
}

export async function adminResponse(request, env, now = Date.now()) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const panelRoute = pathname === '/admin' || pathname === '/admin/login' || pathname === '/admin/logout' || pathname === '/admin/session' || pathname === '/admin/logs' || pathname === '/admin/change-password';
  if (!panelRoute && pathname !== '/auth/admin' && pathname !== '/auth/admin/password') return null;
  const browserStoreId = await validSession(request, env, now);
  const browserLogin = !!browserStoreId;
  const tokenLogin = !!env.ADMIN_VIEW_TOKEN && request.headers.get('Authorization') === 'Bearer ' + env.ADMIN_VIEW_TOKEN;
  const origin = request.headers.get('Origin');
  const sameOrigin = origin === url.origin;
  const nonce = crypto.randomUUID();

  if (pathname === '/admin/login' && request.method === 'POST') {
    try {
      if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || Number(request.headers.get('Content-Length')) > 4096) return loginResponse(nonce, 'Formulário inválido. Tente novamente.', 400);
      const form = await request.formData();
      const csrf = readCookie(request, CSRF_COOKIE);
      if (!csrf || !/^[a-f0-9-]{36}$/.test(csrf) || form.get('csrf') !== csrf) return loginResponse(nonce, 'A sessão de login expirou. Tente novamente.', 403);
      const blockedUntil = await loginLimit(env, now);
      if (blockedUntil) return loginResponse(nonce, 'Muitas tentativas. Aguarde 15 minutos.', 429);
      const username = String(form.get('username') || '');
      const password = String(form.get('password') || '');
      let selectedStore;
      try { selectedStore = await activeStore(env, form.get('storeId') || DEFAULT_STORE_ID); }
      catch { return loginResponse(nonce, 'Loja indisponível ou inválida.', 400); }
      const valid = await credentialsMatch(username, password, env);
      await recordLogin(env, valid, now);
      if (!valid) return loginResponse(nonce, 'Usuário ou senha incorretos.', 401);
      return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': await issueSession(env, now, selectedStore.id), 'Cache-Control': 'no-store' } });
    } catch { return loginResponse(nonce, 'Login temporariamente indisponível.', 503); }
  }

  if (pathname === '/admin/login' && request.method === 'GET') return new Response(null, { status: 303, headers: { Location: '/admin', 'Cache-Control': 'no-store' } });

  if (pathname === '/admin/logout' && request.method === 'POST') {
    if (!sameOrigin) return json({ error: 'Forbidden' }, 403);
    return new Response(null, { status: 204, headers: { 'Set-Cookie': cookieHeader('', 0), 'Cache-Control': 'no-store' } });
  }

  if (pathname === '/admin' && request.method === 'GET') {
    if (!browserLogin) {
      const message = url.searchParams.has('changed') ? 'Senha do painel alterada. Entre novamente.' : url.searchParams.has('expired') ? 'Sessão encerrada após uma hora sem atividade. Entre novamente.' : url.searchParams.has('loggedout') ? 'Você saiu do painel.' : '';
      return loginResponse(nonce, message);
    }
    const store = await activeStore(env, browserStoreId);
    return htmlResponse(panelPage(nonce, store), nonce, 200, { 'Set-Cookie': await issueSession(env, now, browserStoreId) });
  }

  if (pathname === '/admin/session' && request.method === 'GET') {
    if (!browserLogin) return json({ error: 'Unauthorized' }, 401);
    return new Response(null, { status: 204, headers: { 'Set-Cookie': await issueSession(env, now, browserStoreId), 'Cache-Control': 'no-store' } });
  }

  if (pathname === '/admin/change-password' && request.method === 'POST') {
    if (!browserLogin) return json({ error: 'Sessão expirada. Entre novamente.' }, 401);
    if (!sameOrigin) return json({ error: 'Origem inválida.' }, 403);
    if (!env.DB) return json({ error: 'Serviço temporariamente indisponível.' }, 503);
    if (!request.headers.get('Content-Type')?.startsWith('application/json') || Number(request.headers.get('Content-Length')) > 4096) return json({ error: 'Formulário inválido.' }, 400);
    try {
      const raw = await request.text();
      if (encode(raw).length > 4096) return json({ error: 'Formulário muito grande.' }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({ error: 'Formulário inválido.' }, 400); }
      const current = body?.currentPassword;
      const next = body?.newPassword;
      if (typeof current !== 'string' || typeof next !== 'string' || typeof body?.confirmPassword !== 'string' || current.length > 256 || next.length > 256) return json({ error: 'Formulário inválido.' }, 400);
      if (next !== body.confirmPassword) return json({ error: 'A confirmação não corresponde à nova senha.' }, 400);
      if (next.length < 12) return json({ error: 'A nova senha deve ter pelo menos 12 caracteres.' }, 400);
      if (next === current) return json({ error: 'Escolha uma senha diferente da atual.' }, 400);
      if (!await credentialsMatch(env.ADMIN_PANEL_USER || 'admin', current, env)) return json({ error: 'Senha atual incorreta.' }, 403);
      const previous = await panelPasswordState(env);
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordDigest(next, salt, PANEL_ITERATIONS);
      const result = previous
        ? await env.DB.prepare('UPDATE panel_password SET salt = ?, hash = ?, iterations = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(salt, hash, PANEL_ITERATIONS, previous.revision).run()
        : await env.DB.prepare('INSERT OR IGNORE INTO panel_password (id, salt, hash, iterations, revision) VALUES (1, ?, ?, ?, 1)').bind(salt, hash, PANEL_ITERATIONS).run();
      if (result.meta?.changes !== 1) return json({ error: 'A senha mudou em outra sessão. Entre novamente.' }, 409);
      return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
    } catch { return json({ error: 'Não foi possível alterar a senha agora.' }, 503); }
  }

  if (pathname === '/admin/logs' && request.method === 'GET') {
    if (request.headers.get('Accept')?.includes('text/html')) return new Response(null, { status: 303, headers: { Location: '/admin#errors', 'Cache-Control': 'no-store' } });
    if (!browserLogin) return json({ error: 'Unauthorized' }, 401);
    try {
      const kind = url.searchParams.get('kind');
      if (kind !== 'errors' && kind !== 'printing') return json({ error: 'Invalid log category' }, 400);
      const condition = kind === 'printing' ? "event IN ('print.failed', 'print_test.failed')" : "event NOT LIKE 'print.%' AND event NOT LIKE 'print_test.%' AND (event LIKE '%.failed' OR event IN ('runtime.error', 'runtime.fatal'))";
      const { results } = await env.DB.prepare(`SELECT device_id, created_at, event, code, order_id FROM store_diagnostics WHERE store_id = ? AND ${condition} ORDER BY received_at DESC LIMIT 100`).bind(browserStoreId).all();
      return json(results, 200, { 'Set-Cookie': await issueSession(env, now, browserStoreId) });
    } catch { return json({ error: 'Logs unavailable' }, 503); }
  }

  if (panelRoute) return json({ error: 'Method not allowed' }, 405);
  const privateRoute = pathname === '/auth/admin/password';
  if (request.method !== 'GET' && !(privateRoute && request.method === 'POST')) return json({ error: 'Method not allowed' }, 405);
  if (privateRoute && !browserLogin && !tokenLogin) return json({ error: 'Unauthorized' }, 401);
  if (privateRoute && request.method === 'POST' && browserLogin && !tokenLogin && !sameOrigin) return json({ error: 'Forbidden' }, 403);
  try {
    const selectedStoreId = storeId(url.searchParams.get('storeId') || browserStoreId || DEFAULT_STORE_ID);
    if (browserLogin && !tokenLogin && selectedStoreId !== browserStoreId) return json({ error: 'Forbidden' }, 403);
    if (env.DB) await activeStore(env, selectedStoreId);
    else if (selectedStoreId !== DEFAULT_STORE_ID) throw new Error('Database unavailable');
    if (request.method === 'POST') {
      if (!env.DB) throw new Error('Database unavailable');
      await env.DB.prepare('INSERT INTO store_admin_rotation(store_id, revision) VALUES(?, 1) ON CONFLICT(store_id) DO UPDATE SET revision = revision + 1').bind(selectedStoreId).run();
    }
    const state = env.DB ? await env.DB.prepare('SELECT revision FROM store_admin_rotation WHERE store_id = ?').bind(selectedStoreId).first() : { revision: 0 };
    const revision = state?.revision ?? 0;
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid rotation state');
    const { password, ...credential } = await weeklyAdmin(env.ADMIN_PASSWORD_SECRET, now, revision, selectedStoreId);
    const extra = privateRoute && browserLogin ? { 'Set-Cookie': await issueSession(env, now, browserStoreId) } : {};
    return json(privateRoute ? { storeId: selectedStoreId, username: credential.username, password, nextRotation: credential.nextRotation } : credential, 200, extra);
  } catch { return json({ error: 'Admin service unavailable' }, 503); }
}
