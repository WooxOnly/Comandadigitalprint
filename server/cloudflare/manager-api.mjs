import { CSRF_COOKIE, MANAGER_COOKIE, cookie, digest, equal, html, issueSession, json, loginLimitKey, managerSession, readBody, readCookie } from './manager-auth.mjs';
import { managerLoginPage, managerPortalPage } from './manager-pages.mjs';
import { TMA_BASES } from '../../shared/production-metrics.mjs';
import { reportPeriod } from '../../shared/report-period.mjs';
import { productionReport } from './production-report.mjs';
import { managerSalesReport } from './manager-sales.mjs';
import { LANGUAGE_COOKIE, LANGUAGE_CHOICE_COOKIE, validLanguage, requestLanguage, translate } from './manager-i18n.mjs';

function loginPage(nonce, language, message = '', status = 200) {
  const csrf = crypto.randomUUID();
  return html(managerLoginPage(nonce, csrf, translate(language, message), language), nonce, status, { 'Set-Cookie': cookie(CSRF_COOKIE, csrf, 3600), 'Content-Language': language });
}
async function savedLanguage(env, userId) {
  const preference = await env.DB.prepare('SELECT language FROM manager_user_preferences WHERE user_id = ?').bind(userId).first();
  return validLanguage(preference?.language) ? preference.language : null;
}
async function saveLanguage(env, userId, language) {
  await env.DB.prepare('INSERT INTO manager_user_preferences(user_id, language) VALUES(?, ?) ON CONFLICT(user_id) DO UPDATE SET language = excluded.language').bind(userId, language).run();
}
async function storesFor(env, client) {
  const ids = JSON.parse(client.store_ids);
  if (!ids.length) return [];
  const { results } = await env.DB.prepare(`SELECT s.id, s.name, m.preorders, m.cash, c.enabled AS customers, p.enabled AS preparation FROM stores s LEFT JOIN store_modules m ON m.store_id = s.id LEFT JOIN store_customer_modules c ON c.store_id = s.id LEFT JOIN store_preparation_modules p ON p.store_id = s.id WHERE s.active = 1 AND s.id IN (SELECT value FROM json_each(?)) ORDER BY s.name, s.id`).bind(JSON.stringify(ids)).all();
  return results.map(store => ({ id: store.id, name: store.name, modules: { preparation: store.preparation === 1, preorders: store.preorders === 1, cash: store.cash === 1, customers: store.customers === 1 } }));
}
export async function managerResponse(request, env, now = Date.now()) {
  const url = new URL(request.url), path = url.pathname;
  if (path !== '/gestor' && !path.startsWith('/gestor/')) return null;
  const nonce = crypto.randomUUID(), sameOrigin = request.headers.get('Origin') === url.origin;
  let language = requestLanguage(request, readCookie);
  const reply = (value, status = 200) => json(value.error ? { ...value, error: translate(language, value.error) } : value, status);
  try {
    if (!env.DB) return reply({ error: 'Portal indisponível.' }, 503);
    if (path === '/gestor/login' && request.method === 'POST') {
      if (!sameOrigin || !request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return loginPage(nonce, language, 'Formulário inválido. Entre novamente.', 403);
      const form = new URLSearchParams(await readBody(request, 4096)), csrf = readCookie(request, CSRF_COOKIE);
      if (!csrf || !/^[a-f0-9-]{36}$/.test(csrf) || form.get('csrf') !== csrf) return loginPage(nonce, language, 'Sessão de login expirada. Entre novamente.', 403);
      const username = (form.get('username') || '').toLowerCase(), password = form.get('password') || '';
      if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username) || password.length > 256) return loginPage(nonce, language, 'Usuário ou senha incorretos.', 401);
      const limitKey = await loginLimitKey(request, username);
      const limit = await env.DB.prepare('SELECT attempts, reset_at FROM manager_login_limits WHERE key = ?').bind(limitKey).first();
      if (limit?.reset_at > now && limit.attempts >= 5) return loginPage(nonce, language, 'Muitas tentativas. Aguarde 15 minutos.', 429);
      // Reserve an attempt before expensive password verification, including
      // simultaneous requests. Successful logins clear this account/IP limit.
      await env.DB.prepare('INSERT INTO manager_login_limits(key, attempts, reset_at) VALUES(?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN reset_at <= ? THEN 1 ELSE attempts + 1 END, reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END').bind(limitKey, now + 900000, now, now).run();
      const reserved = await env.DB.prepare('SELECT attempts FROM manager_login_limits WHERE key = ?').bind(limitKey).first();
      if (reserved.attempts > 5) return loginPage(nonce, language, 'Muitas tentativas. Aguarde 15 minutos.', 429);
      const user = await env.DB.prepare('SELECT * FROM manager_users WHERE username = ? AND active = 1').bind(username).first();
      const client = user ? await env.DB.prepare('SELECT id, name, revision FROM manager_clients WHERE id = ? AND active = 1').bind(user.client_id).first() : null;
      // A dummy digest keeps nonexistent or disabled accounts on the same slow path.
      const hash = await digest(password, user?.salt || '00000000000000000000000000000000');
      if (!user || !client || !equal(hash, user.hash)) return loginPage(nonce, language, 'Usuário ou senha incorretos.', 401);
      await env.DB.prepare('DELETE FROM manager_login_limits WHERE key = ? OR reset_at <= ?').bind(limitKey, now).run();
      const choice = readCookie(request, LANGUAGE_CHOICE_COOKIE), preference = await savedLanguage(env, user.id);
      language = validLanguage(choice) ? choice : preference || language;
      await saveLanguage(env, user.id, language);
      const headers = new Headers({ Location: '/gestor', 'Cache-Control': 'no-store' });
      headers.append('Set-Cookie', await issueSession(env, user, client, now));
      headers.append('Set-Cookie', cookie(LANGUAGE_COOKIE, language, 31536000));
      headers.append('Set-Cookie', cookie(LANGUAGE_CHOICE_COOKIE, '', 0));
      return new Response(null, { status: 303, headers });
    }
    if (path === '/gestor/logout' && request.method === 'POST') {
      if (!sameOrigin) return reply({ error: 'Acesso não permitido.' }, 403);
      return new Response(null, { status: 204, headers: { 'Set-Cookie': cookie(MANAGER_COOKIE, '', 0), 'Cache-Control': 'no-store' } });
    }
    const session = await managerSession(request, env, now);
    if (session) language = await savedLanguage(env, session.user.id) || language;
    if (path === '/gestor/language' && request.method === 'POST') {
      if (!sameOrigin || !request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ error: 'Acesso não permitido.' }, 403);
      let input; try { input = JSON.parse(await readBody(request, 512)); } catch (error) { if (error.status) throw error; return reply({ error: 'Idioma inválido.' }, 400); }
      if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !validLanguage(input.language)) return reply({ error: 'Idioma inválido.' }, 400);
      if (session) await saveLanguage(env, session.user.id, input.language);
      const response = reply({ language: input.language, savedToAccount: !!session });
      response.headers.append('Set-Cookie', cookie(LANGUAGE_COOKIE, input.language, 31536000));
      response.headers.append('Set-Cookie', cookie(LANGUAGE_CHOICE_COOKIE, session ? '' : input.language, session ? 0 : 3600));
      return response;
    }
    if (path === '/gestor/api/preferences' && request.method === 'GET') return session ? reply({ language }) : reply({ error: 'Acesso não autorizado.' }, 401);
    if (path === '/gestor' && request.method === 'GET') return session ? html(managerPortalPage(nonce, session, language), nonce, 200, { 'Content-Language': language }) : loginPage(nonce, language);
    if (!session) return reply({ error: 'Acesso não autorizado.' }, 401);
    if (request.method !== 'GET') return reply({ error: 'Método indisponível.' }, 405);
    const stores = await storesFor(env, session.client);
    if (path === '/gestor/api/stores') return reply({ stores });
    if (!['/gestor/api/production', '/gestor/api/sales'].includes(path)) return reply({ error: 'Recurso indisponível.' }, 404);
    const selectedId = url.searchParams.get('storeId');
    if (selectedId && !stores.some(store => store.id === selectedId)) return reply({ error: 'Loja não autorizada.' }, 403);
    const period = reportPeriod(url.searchParams);
    if (path === '/gestor/api/sales') {
      const selected = stores.filter(store => !selectedId || store.id === selectedId);
      const report = await managerSalesReport(env, selected.filter(store => store.modules.cash), period);
      return reply({ updatedAt: new Date(now).toISOString(), ...report, disabledStores: selected.filter(store => !store.modules.cash).map(({ id, name }) => ({ id, name })) });
    }
    const basis = url.searchParams.get('tmaBasis') || 'completed';
    if (!Object.hasOwn(TMA_BASES, basis)) return reply({ error: 'Intervalo do TMA inválido.' }, 400);
    const selected = stores.filter(store => !selectedId || store.id === selectedId), enabled = selected.filter(store => store.modules.preparation);
    const report = await productionReport(env, enabled, period, basis);
    return reply({ updatedAt: new Date(now).toISOString(), ...report, disabledStores: selected.filter(store => !store.modules.preparation).map(({ id, name }) => ({ id, name })) });
  } catch (error) { return reply({ error: error.status ? error.message : 'Portal temporariamente indisponível.' }, error.status || 503); }
}
