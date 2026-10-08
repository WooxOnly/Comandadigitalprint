import { translate } from './manager-i18n.mjs';
import { activeStore } from './stores.mjs';
import { digest, hex, html, json, readBody } from './manager-auth.mjs';
import { managerAdminPage } from './manager-pages.mjs';
const clientView = row => ({ id: row.id, name: row.name, storeIds: JSON.parse(row.store_ids), active: !!row.active, revision: row.revision });
const userView = row => ({ id: row.id, clientId: row.client_id, username: row.username, name: row.name, active: !!row.active, revision: row.revision });
const bad = message => Object.assign(new Error(message), { status: 400 });
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);

export async function managerAdminResponse(request, env, context) {
  const path = new URL(request.url).pathname;
  if (!['/admin/gestores', '/admin/manager-clients', '/admin/manager-users'].includes(path)) return null;
  const { browserLogin, sameOrigin, nonce, language = 'pt' } = context;
  const reply = (value, status = 200) => json(value.error ? { ...value, error: translate(language, value.error) } : value, status);
  if (!browserLogin) return path === '/admin/gestores' && request.method === 'GET' ? new Response(null, { status: 303, headers: { Location: '/admin', 'Cache-Control': 'no-store' } }) : reply({ error: 'Acesso não autorizado.' }, 401);
  if (path === '/admin/gestores' && request.method === 'GET') return html(managerAdminPage(nonce, language), nonce, 200, { 'Content-Language': language });
  if (!['GET', 'POST'].includes(request.method) || path === '/admin/gestores') return reply({ error: 'Método indisponível.' }, 405);
  if (request.method === 'POST' && !sameOrigin) return reply({ error: 'Acesso não permitido.' }, 403);
  try {
    if (request.method === 'GET') {
      if (path === '/admin/manager-clients') {
        const { results } = await env.DB.prepare('SELECT id, name, store_ids, active, revision FROM manager_clients ORDER BY name, id').all();
        const { results: stores } = await env.DB.prepare('SELECT id, name FROM stores WHERE active = 1 ORDER BY name, id').all();
        return reply({ clients: results.map(clientView), stores });
      }
      const { results } = await env.DB.prepare('SELECT id, client_id, username, name, active, revision FROM manager_users ORDER BY name, id').all();
      return reply({ users: results.map(userView) });
    }
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw bad('Use o formato application/json.');
    let body; try { body = JSON.parse(await readBody(request)); } catch (error) { if (error.status) throw error; throw bad('Formulário inválido.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100 || typeof body.active !== 'boolean') throw bad('Confira o nome e a situação do cadastro.');
    const editing = body.id !== undefined;
    if (editing && (!uuid(body.id) || !Number.isSafeInteger(body.revision) || body.revision < 1)) throw bad('Cadastro inválido.');
    const id = editing ? body.id : crypto.randomUUID();
    if (path === '/admin/manager-clients') {
      if (!Array.isArray(body.storeIds) || !body.storeIds.length || body.storeIds.length > 100 || new Set(body.storeIds).size !== body.storeIds.length) throw bad('Vincule entre 1 e 100 lojas distintas.');
      for (const store of body.storeIds) await activeStore(env, store);
      const stores = JSON.stringify(body.storeIds);
      if (editing) {
        const result = await env.DB.prepare('UPDATE manager_clients SET name = ?, store_ids = ?, active = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(body.name.trim(), stores, Number(body.active), id, body.revision).run();
        if (!result.meta.changes) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
      } else await env.DB.prepare('INSERT INTO manager_clients(id, name, store_ids, active) VALUES(?, ?, ?, ?)').bind(id, body.name.trim(), stores, Number(body.active)).run();
      return reply({ client: clientView(await env.DB.prepare('SELECT * FROM manager_clients WHERE id = ?').bind(id).first()) }, editing ? 200 : 201);
    }
    if (typeof body.username !== 'string' || !/^[a-z0-9][a-z0-9._-]{2,23}$/.test(body.username) || body.username === 'admin' || !uuid(body.clientId) || typeof body.password !== 'string' || body.password.length > 256 || ((!editing || body.password) && body.password.length < 12)) throw bad('Confira usuário, cliente e senha (mínimo de 12 caracteres).');
    const client = await env.DB.prepare('SELECT id FROM manager_clients WHERE id = ?').bind(body.clientId).first();
    if (!client) throw bad('Cliente não encontrado.');
    const previous = editing ? await env.DB.prepare('SELECT * FROM manager_users WHERE id = ?').bind(id).first() : null;
    if (editing && (!previous || previous.revision !== body.revision)) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
    if (previous && previous.username !== body.username) throw bad('O nome de usuário não pode ser alterado.');
    const duplicate = await env.DB.prepare('SELECT id FROM manager_users WHERE username = ? AND id != ?').bind(body.username, id).first();
    if (duplicate) return reply({ error: 'Esse usuário já existe.' }, 409);
    const salt = body.password ? hex(crypto.getRandomValues(new Uint8Array(16))) : previous.salt;
    const hash = body.password ? await digest(body.password, salt) : previous.hash;
    if (editing) {
      const result = await env.DB.prepare('UPDATE manager_users SET client_id = ?, name = ?, active = ?, salt = ?, hash = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(body.clientId, body.name.trim(), Number(body.active), salt, hash, id, body.revision).run();
      if (!result.meta.changes) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
    } else await env.DB.prepare('INSERT INTO manager_users(id, client_id, username, name, active, salt, hash) VALUES(?, ?, ?, ?, ?, ?, ?)').bind(id, body.clientId, body.username, body.name.trim(), Number(body.active), salt, hash).run();
    return reply({ user: userView(await env.DB.prepare('SELECT id, client_id, username, name, active, revision FROM manager_users WHERE id = ?').bind(id).first()) }, editing ? 200 : 201);
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint failed: manager_users.username')) return reply({ error: 'Esse usuário já existe.' }, 409);
    return reply({ error: error.status ? (error.message === 'STORE_NOT_FOUND' ? 'Loja indisponível.' : error.message === 'INVALID_STORE' ? 'Identificador de loja inválido.' : error.message) : 'Cadastro temporariamente indisponível.' }, error.status || 503);
  }
}
