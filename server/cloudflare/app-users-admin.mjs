import { appRole, validRole } from '../../shared/app-roles.mjs';
import { adminScope } from './admin-scope.mjs';
import { digest, hex, json, readBody } from './manager-auth.mjs';
import { translate } from './manager-i18n.mjs';
import { validCloudValue } from '../../shared/cloud-validation.mjs';

// Owner-only access to the same user records synchronized to the tablet.
// Never return password hashes or allow replacing the global admin account.
export async function appUsersResponse(request, env, { browserLogin, sameOrigin, language }) {
  const reply = (value, status = 200) => json(value.error ? { error: translate(language, value.error) } : value, status);
  if (!browserLogin) return reply({ error: 'Acesso não autorizado.' }, 401);
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Método não permitido.' }, 405);
  if (request.method === 'POST' && (!sameOrigin || !request.headers.get('Content-Type')?.startsWith('application/json'))) return reply({ error: 'Acesso não permitido.' }, 403);
  try {
    const scope = await adminScope(env, new URL(request.url));
    if (!scope.store) return reply({ error: 'Escolha uma loja para gerenciar o acesso ao aplicativo.' }, 400);
    const selectedStoreId = scope.store.id;
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare("SELECT data, revision FROM store_records WHERE store_id = ? AND key LIKE 'user:%' ORDER BY key").bind(selectedStoreId).all();
      return reply({ users: results.map(row => { const user = JSON.parse(row.data); return { username: user.username, active: user.active, role: appRole(user.username,user.role), revision: row.revision }; }).filter(user => user.username !== 'admin') });
    }
    const input = JSON.parse(await readBody(request, 4096));
    if (!input || typeof input.username !== 'string' || !/^[a-z0-9._-]{3,24}$/.test(input.username) || input.username === 'admin' || (input.role !== undefined && !validRole(input.role)) || typeof input.active !== 'boolean' || typeof input.password !== 'string' || input.password.length > 128 || !Number.isSafeInteger(input.revision) || input.revision < 0) return reply({ error: 'Dados de acesso inválidos.' }, 400);
    const key = 'user:' + input.username;
    const previous = await env.DB.prepare('SELECT data, revision FROM store_records WHERE store_id = ? AND key = ?').bind(selectedStoreId, key).first();
    if ((previous?.revision || 0) !== input.revision) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
    if (!previous && !input.password) return reply({ error: 'Informe uma senha para o novo usuário.' }, 400);
    const user = previous ? JSON.parse(previous.data) : { username: input.username };
    user.active = input.active;
    user.role = input.role ?? appRole(input.username,user.role);
    if (input.password) {
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      user.login = { salt, hash: await digest(input.password, salt), iterations: 100000 };
    }
    if (!validCloudValue(key, user)) return reply({ error: 'Dados de acesso inválidos.' }, 400);
    const mutation = crypto.randomUUID();
    const result = await env.DB.prepare(`INSERT INTO store_events(store_id, mutation, key, data, actor, created_at)
      SELECT ?, ?, ?, ?, 'owner', ? WHERE COALESCE((SELECT revision FROM store_records WHERE store_id = ? AND key = ?), 0) = ?`).bind(selectedStoreId, mutation, key, JSON.stringify(user), new Date().toISOString(), selectedStoreId, key, input.revision).run();
    if (!result.meta.changes) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
    return reply({ ok: true });
  } catch (error) { return reply({ error: error.status ? error.message : error instanceof SyntaxError ? 'Formulário inválido.' : 'Cadastro temporariamente indisponível.' }, error.status || (error instanceof SyntaxError ? 400 : 503)); }
}
