import { storeAccess, validAccessUsers } from './operations.mjs';
import { validAccess } from '../../shared/operations-validation.mjs';
import { loginPage, panelPage, recoveryPage } from './admin-panel.mjs';
import { recoveryReady, requestRecovery, recoveryTokenValid, resetPassword } from './password-recovery.mjs';
import { activeStore, DEFAULT_STORE_ID, storeId, storeModules, validModules } from './stores.mjs';
import { cashSettings, validateManagers } from './cash-settings.mjs';
import { validCashSettings } from '../../shared/cash-pricing.mjs';
import { managerAdminResponse } from './manager-admin.mjs';
import { requestLanguage, translate, validLanguage } from './manager-i18n.mjs';
import { cookie, readBody } from './manager-auth.mjs';
import { adminGroups, adminScope, adminScopeFilter } from './admin-scope.mjs';

// The secret stays on the server. Monday 00:00 UTC starts a new password week.
const WEEK = 7 * 24 * 60 * 60 * 1000;
const MONDAY = Date.UTC(1970, 0, 5);
const IDLE_MS = 60 * 60 * 1000;
const PANEL_ITERATIONS = 100000;
const COOKIE = '__Host-comanda_panel';
const CSRF_COOKIE = '__Host-comanda_csrf';
const LANGUAGE_COOKIE = '__Host-bistro_admin_language';
const LANGUAGE_CHOICE_COOKIE = '__Host-bistro_admin_language_choice';
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

async function issueSession(env, now) {
  const key = await sessionKey(env);
  if (!key) throw new Error('Panel secret missing');
  const state = await panelPasswordState(env);
  const payload = hex(encode(JSON.stringify({ user: env.ADMIN_PANEL_USER || 'admin', revision: state?.revision || 0, expires: now + IDLE_MS, nonce: crypto.randomUUID() })));
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
    return true;
  } catch { return null; }
}

async function credentialsMatch(username, password, env) {
  if (!env.ADMIN_VIEW_TOKEN || username.length > 120 || password.length > 256) return false;
  const owner = env.ADMIN_PANEL_USER || 'admin';
  const recoveryEmail = env.ADMIN_RECOVERY_EMAIL;
  if (username !== owner && !(typeof recoveryEmail === 'string' && recoveryEmail.includes('@') && username.trim().toLowerCase() === recoveryEmail.toLowerCase())) return false;
  const state = await panelPasswordState(env);
  if (state) {
    if (!/^[0-9a-f]{32}$/.test(state.salt) || !/^[0-9a-f]{64}$/.test(state.hash) || !Number.isSafeInteger(state.iterations) || state.iterations < 100000 || state.iterations > 1000000) throw new Error('Invalid panel password state');
    return equalHex(await passwordDigest(password, state.salt, state.iterations), state.hash);
  }
  const expected = encode(owner + '\0' + env.ADMIN_VIEW_TOKEN);
  const provided = encode(owner + '\0' + password);
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

function loginResponse(nonce, message = '', status = 200, language = 'pt', retryAfterSeconds = 0) {
  const csrf = crypto.randomUUID();
  return htmlResponse(loginPage(nonce, translate(language, message, { count: retryAfterSeconds }), csrf, language, retryAfterSeconds), nonce, status, { 'Set-Cookie': csrfCookieHeader(csrf), 'Content-Language': language, ...(retryAfterSeconds ? { 'Retry-After': String(retryAfterSeconds) } : {}) });
}

function recoveryResponse(nonce, language, options = {}, status = 200) {
  const csrf = crypto.randomUUID();
  return htmlResponse(recoveryPage(nonce, csrf, language, { ...options, message: translate(language, options.message || '') }), nonce, status, {
    'Set-Cookie': csrfCookieHeader(csrf), 'Content-Language': language,
    // Preserve same-origin form Origin while keeping reset URLs out of external
    // referrers. CSP permits no third-party scripts, assets or connections.
    'Referrer-Policy': 'same-origin',
  });
}

const blockedMessage = 'Muitas tentativas. Tente novamente em {count} segundos.';
const retrySeconds = (blockedUntil, now) => Math.max(1, Math.ceil((blockedUntil - now) / 1000));

async function panelLanguage(env) {
  const preference = env.DB ? await env.DB.prepare('SELECT language FROM panel_preferences WHERE id = 1').first() : null;
  return validLanguage(preference?.language) ? preference.language : null;
}
async function savePanelLanguage(env, language) {
  await env.DB.prepare('INSERT INTO panel_preferences(id, language) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET language = excluded.language').bind(language).run();
}

async function loginLimit(env, now) {
  if (!env.DB) return null;
  const state = await env.DB.prepare('SELECT blocked_until FROM panel_login WHERE id = 1').first();
  return state?.blocked_until > now ? state.blocked_until : null;
}

async function recordLogin(env, valid, now) {
  if (!env.DB) return null;
  if (valid) {
    await env.DB.prepare('UPDATE panel_login SET attempts = 0, blocked_until = 0 WHERE id = 1').run();
    return null;
  }
  // The first five failures have no wait. Failure six waits thirty seconds;
  // each subsequent group of three adds thirty seconds. Increment and set
  // the deadline atomically; blocked requests do not advance or extend it.
  const state = await env.DB.prepare('UPDATE panel_login SET attempts = attempts + 1, blocked_until = CASE WHEN (attempts + 1) >= 6 AND (attempts + 1) % 3 = 0 THEN ? + (((attempts + 1) / 3) - 1) * 30000 ELSE 0 END WHERE id = 1 AND blocked_until <= ? RETURNING blocked_until').bind(now, now).first();
  return state ? state.blocked_until > now ? state.blocked_until : null : loginLimit(env, now);
}

export async function provisionableStores(username, password, env, now = Date.now()) {
  if (!env.DB) return { error: 'UNAVAILABLE', status: 503 };
  const blockedUntil = await loginLimit(env, now);
  if (blockedUntil) return { error: 'RATE_LIMIT', status: 429, retryAfterSeconds: retrySeconds(blockedUntil, now) };
  const valid = await credentialsMatch(username, password, env);
  const nextBlock = await recordLogin(env, valid, now);
  if (nextBlock) return { error: 'RATE_LIMIT', status: 429, retryAfterSeconds: retrySeconds(nextBlock, now) };
  if (!valid) return { error: 'BAD_LOGIN', status: 401 };
  const { results: stores } = await env.DB.prepare('SELECT stores.id, stores.name, store_codes.code FROM stores JOIN store_codes ON store_codes.store_id = stores.id WHERE stores.active = 1 ORDER BY store_codes.code').all();
  return { stores, status: 200 };
}

export async function adminResponse(request, env, now = Date.now(), context) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const panelRoute = ['/admin/gestores', '/admin/manager-clients', '/admin/manager-users', '/admin/language', '/admin/recover', '/admin/reset-password'].includes(pathname) || pathname === '/admin' || pathname === '/admin/login' || pathname === '/admin/logout' || pathname === '/admin/session' || pathname === '/admin/logs' || pathname === '/admin/activity' || pathname === '/admin/stores' || pathname === '/admin/change-password';
  if (!panelRoute && pathname !== '/auth/admin' && pathname !== '/auth/admin/password') return null;
  const browserLogin = await validSession(request, env, now);
  const tokenLogin = !!env.ADMIN_VIEW_TOKEN && request.headers.get('Authorization') === 'Bearer ' + env.ADMIN_VIEW_TOKEN;
  const origin = request.headers.get('Origin');
  const sameOrigin = origin === url.origin;
  const nonce = crypto.randomUUID();
  let language = requestLanguage(request, readCookie, LANGUAGE_COOKIE, 'pt');
  if (browserLogin) language = await panelLanguage(env) || language;
  const reply = (value, status = 200, extra = {}) => json(value.error ? { ...value, error: translate(language, value.error) } : value, status, extra);
  if (pathname === '/admin/recover' || pathname === '/admin/reset-password') {
    const reset = pathname === '/admin/reset-password';
    const unavailable = !recoveryReady(env);
    const render = (options = {}, status = 200) => recoveryResponse(nonce, language, { unavailable, ...options }, status);
    if (request.method === 'GET') {
      if (!reset) return render(unavailable ? { message: 'A recuperação por e-mail ainda não está disponível. Tente novamente mais tarde.' } : {});
      try {
        const token = url.searchParams.get('token');
        return await recoveryTokenValid(env, token, now) ? render({ mode: 'reset', token })
          : render({ message: 'Link de recuperação inválido ou expirado. Solicite um novo link.' }, 400);
      } catch { return render({ message: 'Não foi possível processar a recuperação agora. Tente novamente mais tarde.' }, 503); }
    }
    if (request.method !== 'POST') return render({ message: 'Formulário inválido.' }, 405);
    if (!sameOrigin) return render({ message: 'Origem inválida.' }, 403);
    try {
      if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return render({ message: 'Formulário inválido.' }, 400);
      const form = new URLSearchParams(await readBody(request, 4096));
      const csrf = readCookie(request, CSRF_COOKIE);
      if (!csrf || !/^[a-f0-9-]{36}$/.test(csrf) || form.get('csrf') !== csrf) return render({ message: 'A sessão de login expirou. Tente novamente.' }, 403);
      const keys = reset ? ['csrf', 'token', 'newPassword', 'confirmPassword'] : ['csrf', 'username'];
      if ([...form.keys()].length !== keys.length || keys.some(key => form.getAll(key).length !== 1)) return render({ message: 'Formulário inválido.' }, 400);
      if (!reset) {
        const username = form.get('username').trim();
        if (!username || username.length > 120 || /[\u0000-\u001f\u007f]/.test(username)) return render({ message: 'Formulário inválido.' }, 400);
        const result = await requestRecovery(request, env, username, language, now, context);
        return render(result, result.status);
      }
      const token = form.get('token'), password = form.get('newPassword'), confirmation = form.get('confirmPassword');
      const options = { mode: 'reset', token: /^[a-f0-9]{64}$/.test(token) ? token : '' };
      if (password.length > 256 || confirmation.length > 256) return render({ ...options, message: 'Formulário inválido.' }, 400);
      if (password.length < 8) return render({ ...options, message: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400);
      if (password !== confirmation) return render({ ...options, message: 'A confirmação não corresponde à nova senha.' }, 400);
      const result = await resetPassword(request, env, token, password, now);
      if (result.status !== 303) return render({ ...options, message: result.message }, result.status);
      return new Response(null, { status: 303, headers: { Location: '/admin?changed=1', 'Cache-Control': 'no-store', 'Set-Cookie': cookieHeader('', 0) } });
    } catch (error) { return render({ message: error.status ? error.message : 'Não foi possível processar a recuperação agora. Tente novamente mais tarde.' }, error.status || 503); }
  }
  if (pathname === '/admin/language' && request.method === 'POST') {
    if (!sameOrigin || !request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ error: 'Acesso não permitido.' }, 403);
    try {
      let input; try { input = JSON.parse(await readBody(request, 512)); } catch (error) { if (error.status) throw error; return reply({ error: 'Idioma inválido.' }, 400); }
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !validLanguage(input.language)) return reply({ error: 'Idioma inválido.' }, 400);
      if (browserLogin) await savePanelLanguage(env, input.language);
      const response = reply({ language: input.language, savedToAccount: !!browserLogin });
      response.headers.append('Set-Cookie', cookie(LANGUAGE_COOKIE, input.language, 31536000));
      response.headers.append('Set-Cookie', cookie(LANGUAGE_CHOICE_COOKIE, browserLogin ? '' : input.language, browserLogin ? 0 : 3600));
      return response;
    } catch (error) { return reply({ error: error.status ? error.message : 'Serviço temporariamente indisponível.' }, error.status || 503); }
  }
  const managerAdmin = await managerAdminResponse(request, env, { browserLogin, sameOrigin, nonce, language });
  if (managerAdmin) return managerAdmin;

  if (pathname === '/admin/login' && request.method === 'POST') {
    try {
      if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded') || Number(request.headers.get('Content-Length')) > 4096) return loginResponse(nonce, 'Formulário inválido. Tente novamente.', 400, language);
      const form = await request.formData();
      const csrf = readCookie(request, CSRF_COOKIE);
      if (!csrf || !/^[a-f0-9-]{36}$/.test(csrf) || form.get('csrf') !== csrf) return loginResponse(nonce, 'A sessão de login expirou. Tente novamente.', 403, language);
      const blockedUntil = await loginLimit(env, now);
      if (blockedUntil) return loginResponse(nonce, blockedMessage, 429, language, retrySeconds(blockedUntil, now));
      const username = String(form.get('username') || '');
      const password = String(form.get('password') || '');
      const valid = await credentialsMatch(username, password, env);
      const nextBlock = await recordLogin(env, valid, now);
      if (nextBlock) return loginResponse(nonce, blockedMessage, 429, language, retrySeconds(nextBlock, now));
      if (!valid) return loginResponse(nonce, 'Usuário ou senha incorretos.', 401, language);
      const choice = readCookie(request, LANGUAGE_CHOICE_COOKIE);
      language = validLanguage(choice) ? choice : await panelLanguage(env) || language;
      await savePanelLanguage(env, language);
      const headers = new Headers({ Location: '/admin', 'Cache-Control': 'no-store' });
      headers.append('Set-Cookie', await issueSession(env, now));
      headers.append('Set-Cookie', cookie(LANGUAGE_COOKIE, language, 31536000));
      headers.append('Set-Cookie', cookie(LANGUAGE_CHOICE_COOKIE, '', 0));
      return new Response(null, { status: 303, headers });
    } catch { return loginResponse(nonce, 'Login temporariamente indisponível.', 503, language); }
  }

  if (pathname === '/admin/login' && request.method === 'GET') return new Response(null, { status: 303, headers: { Location: '/admin', 'Cache-Control': 'no-store' } });

  if (pathname === '/admin/logout' && request.method === 'POST') {
    if (!sameOrigin) return reply({ error: 'Acesso não permitido.' }, 403);
    return new Response(null, { status: 204, headers: { 'Set-Cookie': cookieHeader('', 0), 'Cache-Control': 'no-store' } });
  }

  if (pathname === '/admin' && request.method === 'GET') {
    if (!browserLogin) {
      const blockedUntil = await loginLimit(env, now);
      if (blockedUntil) return loginResponse(nonce, blockedMessage, 200, language, retrySeconds(blockedUntil, now));
      const message = url.searchParams.has('changed') ? 'Senha do painel alterada. Entre novamente.' : url.searchParams.has('expired') ? 'Sessão encerrada após uma hora sem atividade. Entre novamente.' : url.searchParams.has('loggedout') ? 'Você saiu do painel.' : '';
      return loginResponse(nonce, message, 200, language);
    }
    const { results: stores } = await env.DB.prepare('SELECT stores.id, stores.name, stores.active, store_codes.code FROM stores JOIN store_codes ON store_codes.store_id = stores.id ORDER BY store_codes.code').all();
    const groups = await adminGroups(env);
    let scope;
    try { scope = await adminScope(env, url); } catch (error) { return reply({ error: error.message }, error.status || 503); }
    const selectedGroupId = scope.groupId || (scope.store ? groups.find(group => group.storeIds.includes(scope.store.id))?.id || 'unassigned' : '');
    for (const store of stores.filter(store => store.id === scope.storeId)) {
      store.modules = await storeModules(env, store.id); store.access = await storeAccess(env, store.id);
      store.cashSettings = await cashSettings(env, store.id);
      const { results } = await env.DB.prepare("SELECT SUBSTR(key, 6) AS username FROM store_records WHERE store_id = ? AND key LIKE 'user:%' AND json_extract(data, '$.active') = 1 ORDER BY key").bind(store.id).all();
      store.cashUsers = results.map(row => row.username);
    }
    return htmlResponse(panelPage(nonce, stores, scope.storeId, language, groups, selectedGroupId), nonce, 200, { 'Set-Cookie': await issueSession(env, now), 'Content-Language': language });
  }

  if (pathname === '/admin/session' && request.method === 'GET') {
    if (!browserLogin) return reply({ error: 'Acesso não autorizado.' }, 401);
    return new Response(null, { status: 204, headers: { 'Set-Cookie': await issueSession(env, now), 'Cache-Control': 'no-store' } });
  }

  if (pathname === '/admin/change-password' && request.method === 'POST') {
    if (!browserLogin) return reply({ error: 'Sessão expirada. Entre novamente.' }, 401);
    if (!sameOrigin) return reply({ error: 'Origem inválida.' }, 403);
    if (!env.DB) return reply({ error: 'Serviço temporariamente indisponível.' }, 503);
    if (!request.headers.get('Content-Type')?.startsWith('application/json') || Number(request.headers.get('Content-Length')) > 4096) return reply({ error: 'Formulário inválido.' }, 400);
    try {
      const raw = await request.text();
      if (encode(raw).length > 4096) return reply({ error: 'Formulário muito grande.' }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Formulário inválido.' }, 400); }
      const current = body?.currentPassword;
      const next = body?.newPassword;
      if (typeof current !== 'string' || typeof next !== 'string' || typeof body?.confirmPassword !== 'string' || current.length > 256 || next.length > 256) return reply({ error: 'Formulário inválido.' }, 400);
      if (next !== body.confirmPassword) return reply({ error: 'A confirmação não corresponde à nova senha.' }, 400);
      if (next.length < 8) return reply({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, 400);
      if (next === current) return reply({ error: 'Escolha uma senha diferente da atual.' }, 400);
      if (!await credentialsMatch(env.ADMIN_PANEL_USER || 'admin', current, env)) return reply({ error: 'Senha atual incorreta.' }, 403);
      const previous = await panelPasswordState(env);
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await passwordDigest(next, salt, PANEL_ITERATIONS);
      const result = previous
        ? await env.DB.prepare('UPDATE panel_password SET salt = ?, hash = ?, iterations = ?, revision = revision + 1 WHERE id = 1 AND revision = ?').bind(salt, hash, PANEL_ITERATIONS, previous.revision).run()
        : await env.DB.prepare('INSERT OR IGNORE INTO panel_password (id, salt, hash, iterations, revision) VALUES (1, ?, ?, ?, 1)').bind(salt, hash, PANEL_ITERATIONS).run();
      if (result.meta?.changes !== 1) return reply({ error: 'A senha mudou em outra sessão. Entre novamente.' }, 409);
      return reply({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
    } catch { return reply({ error: 'Não foi possível alterar a senha agora.' }, 503); }
  }

  if (pathname === '/admin/stores' && (request.method === 'GET' || request.method === 'POST' || request.method === 'PATCH')) {
    if (!browserLogin) return reply({ error: 'Sessão expirada. Entre novamente.' }, 401);
    if (!env.DB) return reply({ error: 'Serviço temporariamente indisponível.' }, 503);
    if (request.method === 'GET') {
      try {
        const scope = await adminScope(env, url), filter = adminScopeFilter(scope, 'stores.id');
        const { results } = await env.DB.prepare(`SELECT stores.id, stores.name, stores.active, store_codes.code FROM stores JOIN store_codes ON store_codes.store_id = stores.id WHERE ${filter.sql} ORDER BY store_codes.code`).bind(...filter.values).all();
        for (const store of results) { store.modules = await storeModules(env, store.id); store.access = await storeAccess(env, store.id); store.cashSettings = await cashSettings(env, store.id); }
        return reply(results, 200, { 'Set-Cookie': await issueSession(env, now) });
      } catch (error) { return reply({ error: error.status ? error.message : 'Não foi possível consultar as lojas.' }, error.status || 503); }
    }
    if (!sameOrigin) return reply({ error: 'Origem inválida.' }, 403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json') || Number(request.headers.get('Content-Length')) > 4096) return reply({ error: 'Formulário inválido.' }, 400);
    try {
      const raw = await request.text();
      if (encode(raw).length > 4096) return reply({ error: 'Formulário muito grande.' }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return reply({ error: 'Formulário inválido.' }, 400); }
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return reply({ error: 'Informe um nome de loja com até 80 caracteres.' }, 400);
      if (body.modules !== undefined && !validModules(body.modules)) return reply({ error: 'Módulos inválidos.' }, 400);
      if (body.access !== undefined && !validAccess(body.access)) return reply({ error: 'Permissões inválidas.' }, 400);
      if (body.cashSettings !== undefined && !validCashSettings(body.cashSettings)) return reply({ error: 'Configuração de caixa inválida.' }, 400);
      let destinationGroup = null;
      if (request.method === 'POST' && body.groupId !== undefined) {
        if (typeof body.groupId !== 'string' || !body.groupId || body.groupId === 'unassigned') return reply({ error: 'Escolha um grupo.' }, 400);
        destinationGroup = await env.DB.prepare('SELECT id, store_ids FROM manager_clients WHERE id = ?').bind(body.groupId).first();
        if (!destinationGroup) return reply({ error: 'Grupo não encontrado.' }, 404);
        if (JSON.parse(destinationGroup.store_ids).length >= 100) return reply({ error: 'O grupo já tem 100 lojas.' }, 400);
      }
      if (request.method === 'POST' && body.cashSettings?.managers.length) return reply({ error: 'Cadastre os usuários da empresa antes de escolher gerentes.' }, 400);
      if (request.method === 'POST' && body.access && Object.values(body.access).some(names => names?.length)) return reply({ error: 'Cadastre usuários antes de conceder permissões.' }, 400);
      const saveModules = async id => {
        if (body.modules !== undefined) await env.DB.prepare('INSERT INTO store_modules(store_id, preorders, cash) VALUES(?, ?, ?) ON CONFLICT(store_id) DO UPDATE SET preorders = excluded.preorders, cash = excluded.cash').bind(id, Number(body.modules.preorders), Number(body.modules.cash)).run();
        if (body.modules?.preparation !== undefined) await env.DB.prepare('INSERT INTO store_preparation_modules(store_id, enabled) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET enabled = excluded.enabled').bind(id, Number(body.modules.preparation)).run();
        if (body.access !== undefined) await env.DB.prepare('INSERT INTO store_access_settings(store_id, data) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET data = excluded.data').bind(id, JSON.stringify(body.access)).run();
        await env.DB.prepare('INSERT INTO store_admin_activity(store_id, created_at, actor, action) VALUES(?, ?, ?, ?)').bind(id, new Date().toISOString(), 'owner', 'Empresa, módulos e permissões atualizados pelo portal').run();
        if (body.modules?.customers !== undefined) await env.DB.prepare('INSERT INTO store_customer_modules(store_id, enabled) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET enabled = excluded.enabled').bind(id, Number(body.modules.customers)).run();
        if (body.cashSettings !== undefined) await env.DB.prepare('INSERT INTO store_cash_settings(store_id, data) VALUES(?, ?) ON CONFLICT(store_id) DO UPDATE SET data = excluded.data').bind(id, JSON.stringify(body.cashSettings)).run();
      };
      if (request.method === 'PATCH') {
        if (typeof body?.id !== 'string') return reply({ error: 'Identificador inválido.' }, 400);
        try { storeId(body.id); } catch { return reply({ error: 'Identificador inválido.' }, 400); }
        if (body.cashSettings !== undefined && !await validateManagers(env, body.id, body.cashSettings)) return reply({ error: 'Escolha gerentes entre os usuários ativos desta empresa.' }, 400);
        if (body.access && !await validAccessUsers(env, body.id, body.access)) return reply({ error: 'Escolha usuários ativos desta empresa.' }, 400);
        const result = await env.DB.prepare('UPDATE stores SET name = ? WHERE id = ?').bind(name, body.id).run();
        if (result.meta?.changes !== 1) return reply({ error: 'Loja não encontrada.' }, 404);
        const updated = await env.DB.prepare('SELECT stores.id, stores.name, store_codes.code FROM stores JOIN store_codes ON store_codes.store_id = stores.id WHERE stores.id = ?').bind(body.id).first();
        await saveModules(body.id);
        if (body.modules !== undefined) updated.modules = await storeModules(env, body.id);
        if (body.cashSettings !== undefined) updated.cashSettings = await cashSettings(env, body.id);
        if (body.access !== undefined) updated.access = await storeAccess(env, body.id);
        return reply(updated);
      }
      const stem = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36).replace(/-+$/g, '') || 'loja';
      const base = stem.length < 3 ? `loja-${stem}` : stem;
      for (let attempt = 1; attempt <= 100; attempt++) {
        const suffix = attempt === 1 ? '' : `-${attempt}`;
        const id = storeId(base.slice(0, 40 - suffix.length).replace(/-+$/g, '') + suffix);
        let createdStore;
        if (destinationGroup) {
          const results = await env.DB.batch([
            env.DB.prepare('INSERT OR IGNORE INTO stores(id, name, active) SELECT ?, ?, 1 FROM manager_clients WHERE id = ? AND json_array_length(store_ids) < 100 RETURNING id').bind(id, name, destinationGroup.id),
            env.DB.prepare("UPDATE manager_clients SET store_ids = json_insert(store_ids, '$[#]', ?), revision = revision + 1 WHERE id = ? AND changes() = 1 RETURNING id").bind(id, destinationGroup.id),
          ]);
          createdStore = !!results[0].results?.length;
        } else createdStore = (await env.DB.prepare('INSERT OR IGNORE INTO stores(id, name, active) VALUES(?, ?, 1)').bind(id, name).run()).meta?.changes === 1;
        if (createdStore) {
          const created = await env.DB.prepare('SELECT stores.id, stores.name, store_codes.code FROM stores JOIN store_codes ON store_codes.store_id = stores.id WHERE stores.id = ?').bind(id).first();
          await saveModules(id);
          if (body.modules !== undefined) created.modules = await storeModules(env, id);
          if (body.cashSettings !== undefined) created.cashSettings = await cashSettings(env, id);
          if (body.access !== undefined) created.access = await storeAccess(env, id);
          return reply(created, 201, { 'Set-Cookie': await issueSession(env, now) });
        }
      }
      return reply({ error: 'Não foi possível gerar um identificador único.' }, 409);
    } catch { return reply({ error: request.method === 'PATCH' ? 'Não foi possível salvar o nome da loja.' : 'Não foi possível cadastrar a loja.' }, 503); }
  }

  if (pathname === '/admin/activity' && request.method === 'GET') {
    if (!browserLogin) return reply({ error: 'Acesso não autorizado.' }, 401);
    try {
    const filter = adminScopeFilter(await adminScope(env, url));
    const activityQuery = (operator, limit = '') => `SELECT activity.*, stores.name AS store_name FROM (
      SELECT store_id, seq, created_at, actor, CASE WHEN key LIKE 'activity:%' THEN json_extract(data, '$.kind') || ': ' || json_extract(data, '$.target') || ' · ' || json_extract(data, '$.details') WHEN key LIKE 'product-option:%' THEN key || ' · disponível=' || json_extract(data, '$.available') || ' · favorito=' || json_extract(data, '$.favorite') WHEN key LIKE 'preparation:%' THEN key || ': ' || json_extract(data, '$.status') ELSE key END AS action FROM store_events WHERE ${filter.sql} AND created_at ${operator} ? AND (key = 'menu' OR key = 'logo' OR key = 'order-settings' OR key LIKE 'printer:%' OR key LIKE 'product-option:%' OR key LIKE 'preparation:%' OR key LIKE 'activity:%')
      UNION ALL SELECT store_id, seq, created_at, actor, action FROM store_admin_activity WHERE ${filter.sql} AND created_at ${operator} ?
      ) AS activity JOIN stores ON stores.id = activity.store_id ORDER BY activity.created_at DESC, activity.seq DESC ${limit}`;
    const limit = 100, before = url.searchParams.get('before') || '9999';
    const { results } = await env.DB.prepare(activityQuery('<', 'LIMIT 101')).bind(...filter.values, before, ...filter.values, before).all();
    // Include every event sharing the page boundary timestamp: pagination does
    // not silently lose operations that occur in the same millisecond.
    const boundary = results[limit - 1]?.created_at;
    if (results.length > limit && boundary) {
      const { results: ties } = await env.DB.prepare(activityQuery('=')).bind(...filter.values, boundary, ...filter.values, boundary).all();
      return reply({ events: [...results.filter(row => row.created_at > boundary), ...ties], before: boundary });
    }
    return reply({ events: results, before: null });
    } catch (error) { return reply({ error: 'Não foi possível consultar o histórico.' }, error.status || 503); }
  }

  if (pathname === '/admin/logs' && request.method === 'GET') {
    if (request.headers.get('Accept')?.includes('text/html')) return new Response(null, { status: 303, headers: { Location: '/admin#errors', 'Cache-Control': 'no-store' } });
    if (!browserLogin) return reply({ error: 'Acesso não autorizado.' }, 401);
    try {
      const kind = url.searchParams.get('kind');
      if (kind !== 'errors' && kind !== 'printing') return reply({ error: 'Categoria de registro inválida.' }, 400);
      const condition = kind === 'printing' ? "event IN ('print.failed', 'print_test.failed')" : "event NOT LIKE 'print.%' AND event NOT LIKE 'print_test.%' AND (event LIKE '%.failed' OR event IN ('runtime.error', 'runtime.fatal'))";
      const filter = adminScopeFilter(await adminScope(env, url), 'store_diagnostics.store_id');
      const { results } = await env.DB.prepare(`SELECT store_diagnostics.store_id, stores.name AS store_name, device_id, created_at, event, code, order_id FROM store_diagnostics JOIN stores ON stores.id = store_diagnostics.store_id WHERE ${filter.sql} AND ${condition} ORDER BY received_at DESC LIMIT 100`).bind(...filter.values).all();
      return reply(results, 200, { 'Set-Cookie': await issueSession(env, now) });
    } catch (error) { return reply({ error: 'Registros temporariamente indisponíveis.' }, error.status || 503); }
  }

  if (panelRoute) return reply({ error: 'Método não permitido.' }, 405);
  const privateRoute = pathname === '/auth/admin/password';
  if (request.method !== 'GET' && !(privateRoute && request.method === 'POST')) return reply({ error: 'Método não permitido.' }, 405);
  if (privateRoute && !browserLogin && !tokenLogin) return reply({ error: 'Acesso não autorizado.' }, 401);
  if (privateRoute && request.method === 'POST' && browserLogin && !tokenLogin && !sameOrigin) return reply({ error: 'Acesso não permitido.' }, 403);
  if (privateRoute && browserLogin && !url.searchParams.get('storeId')) return reply({ error: 'Escolha uma loja para consultar ou alterar a senha do tablet.' }, 400);
  if (privateRoute && browserLogin) {
    try { await adminScope(env, url); } catch (error) { return reply({ error: error.message }, error.status || 503); }
  }
  try {
    const selectedStoreId = storeId(url.searchParams.get('storeId') || DEFAULT_STORE_ID);
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
    const extra = privateRoute && browserLogin ? { 'Set-Cookie': await issueSession(env, now) } : {};
    return reply(privateRoute ? { storeId: selectedStoreId, username: credential.username, password, nextRotation: credential.nextRotation } : credential, 200, extra);
  } catch (error) { return reply({ error: 'Serviço temporariamente indisponível.' }, error.status || 503); }
}
