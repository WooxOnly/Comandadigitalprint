import { normalizeEmail, validEmail, invitationConfiguration, sendManagerInvitation } from './manager-invitations.mjs';
import { translate } from './manager-i18n.mjs';
import { storeId } from './stores.mjs';
import { digest, hex, html, json, readBody } from './manager-auth.mjs';
import { managerAdminPage, clientRegistrationPage } from './manager-pages.mjs';
import { adminGroups, adminScope } from './admin-scope.mjs';
const userView = row => ({ id: row.id, clientId: row.client_id, email: validEmail(row.username) ? row.username : '', username: row.username, name: row.name, active: !!row.active, revision: row.revision, needsPassword: row.needs_password === 1, invitationStatus: row.delivery_status === 'sent' && (row.expires_at <= Date.now() || row.password_revision !== row.revision) ? 'expired' : row.delivery_status || 'none' });
const userColumns = 'u.*, i.needs_password, i.delivery_status, i.expires_at, i.password_revision, i.sent_at';
const readUser = (env, id) => env.DB.prepare(`SELECT ${userColumns} FROM manager_users u LEFT JOIN manager_user_invitations i ON i.user_id = u.id WHERE u.id = ?`).bind(id).first();
const bad = message => Object.assign(new Error(message), { status: 400 });
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);

export async function managerAdminResponse(request, env, context) {
  const path = new URL(request.url).pathname;
  if (!['/admin/gestores', '/admin/cliente', '/admin/clients', '/admin/manager-clients', '/admin/manager-users', '/admin/manager-invitations'].includes(path)) return null;
  const { browserLogin, sameOrigin, nonce, language = 'pt' } = context;
  const reply = (value, status = 200) => json(value.error ? { ...value, error: translate(language, value.error) } : value, status);
  if (!browserLogin) return ['/admin/gestores', '/admin/cliente'].includes(path) && request.method === 'GET' ? new Response(null, { status: 303, headers: { Location: '/admin', 'Cache-Control': 'no-store' } }) : reply({ error: 'Acesso não autorizado.' }, 401);
  if ((path === '/admin/manager-invitations' && request.method !== 'POST') || !['GET', 'POST', 'PATCH'].includes(request.method) || (['/admin/gestores', '/admin/cliente'].includes(path) && request.method !== 'GET') || (['/admin/manager-users', '/admin/manager-invitations'].includes(path) && request.method === 'PATCH')) return reply({ error: 'Método indisponível.' }, 405);
  if (request.method !== 'GET' && !sameOrigin) return reply({ error: 'Acesso não permitido.' }, 403);
  try {
    if (request.method === 'GET') {
      const scope = await adminScope(env, new URL(request.url));
      if (path === '/admin/cliente') return html(clientRegistrationPage(nonce, language, { groupId: scope.groupId, groupName: scope.group?.name || '' }), nonce, 200, { 'Content-Language': language });
      if (path === '/admin/gestores') return html(managerAdminPage(nonce, language, { groupId: scope.groupId, groupName: scope.group?.name || '', kind: scope.group?.kind || 'group' }), nonce, 200, { 'Content-Language': language });
      const clients = (await adminGroups(env)).filter(group => !scope.group || group.id === scope.group.id);
      if (path === '/admin/clients') return reply({ clients });
      if (path === '/admin/manager-clients') {
        // Existing memberships and unassigned locations are available explicitly;
        // choosing a location never silently transfers an existing membership.
        const selected = JSON.stringify(clients.flatMap(client => client.storeIds));
        const { results: stores } = await env.DB.prepare(`SELECT id, name, active FROM stores WHERE ? = 0 OR id IN (SELECT value FROM json_each(?)) OR NOT EXISTS (SELECT 1 FROM manager_clients, json_each(manager_clients.store_ids) AS membership WHERE membership.value = stores.id) ORDER BY name, id`).bind(Number(!!scope.group), selected).all();
        return reply({ clients, stores });
      }
      const { results } = await env.DB.prepare(`SELECT ${userColumns} FROM manager_users u LEFT JOIN manager_user_invitations i ON i.user_id = u.id WHERE ? = '' OR u.client_id = ? ORDER BY u.name, u.id`).bind(scope.group?.id || '', scope.group?.id || '').all();
      return reply({ users: results.map(userView) });
    }
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw bad('Use o formato application/json.');
    let body; try { body = JSON.parse(await readBody(request)); } catch (error) { if (error.status) throw error; throw bad('Formulário inválido.'); }
    if (path === '/admin/manager-invitations') {
      if (!body || !uuid(body.id) || !Number.isSafeInteger(body.revision) || body.revision < 1) throw bad('Cadastro inválido.');
      const invitation = await sendManagerInvitation(env, body.id, body.revision, language);
      return reply({ user: userView(await readUser(env, body.id)), invitation });
    }
    if (path === '/admin/clients' && body && typeof body === 'object' && !Array.isArray(body)) {
      if (body.id && (body.storeIds === undefined || body.active === undefined)) { const previous = await env.DB.prepare('SELECT store_ids, active FROM manager_clients WHERE id = ?').bind(body.id).first(); if(body.storeIds === undefined) body.storeIds = previous ? JSON.parse(previous.store_ids) : []; if(body.active === undefined) body.active = previous ? !!previous.active : true; }
      if(body.active === undefined) body.active = true;
      if(body.storeIds === undefined) body.storeIds = [];
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(body.name) || typeof body.active !== 'boolean') throw bad('Confira o nome e a situação do cadastro.');
    const editing = body.id !== undefined;
    if (request.method === 'PATCH' && !editing) throw bad('Cadastro inválido.');
    if (editing && (!uuid(body.id) || !Number.isSafeInteger(body.revision) || body.revision < 1)) throw bad('Cadastro inválido.');
    const id = editing ? body.id : crypto.randomUUID();
    if (path === '/admin/manager-clients' || path === '/admin/clients') {
      if (!Array.isArray(body.storeIds) || body.storeIds.length > 100 || new Set(body.storeIds).size !== body.storeIds.length) throw bad('Vincule até 100 lojas distintas.');
      for (const store of body.storeIds) {
        storeId(store);
        if (!await env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(store).first()) throw bad('Loja indisponível.');
      }
      const previous = editing ? (await adminGroups(env)).find(group => group.id === id) : null;
      if (editing && (!previous || previous.revision !== body.revision)) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
      const kind = body.kind ?? previous?.kind ?? 'group';
      if (!['single', 'group'].includes(kind)) throw bad('Escolha loja única ou grupo de lojas.');
      if (kind === 'single' && body.storeIds.length > 1) throw bad('Um cliente de loja única pode ter apenas uma loja.');
      const stores = JSON.stringify(body.storeIds);
      if (editing) {
        const update = env.DB.prepare('UPDATE manager_clients SET name = ?, store_ids = ?, active = ?, revision = revision + 1 WHERE id = ? AND revision = ? RETURNING id').bind(body.name.trim(), stores, Number(body.active), id, body.revision);
        const profile = kind === 'group'
          ? env.DB.prepare('INSERT INTO manager_client_profiles(group_id, kind) SELECT id, ? FROM manager_clients WHERE id = ? AND revision = ? ON CONFLICT(group_id) DO UPDATE SET kind = excluded.kind RETURNING group_id').bind(kind, id, body.revision)
          : env.DB.prepare('INSERT INTO manager_client_profiles(group_id, kind) SELECT ?, ? WHERE changes() = 1 ON CONFLICT(group_id) DO UPDATE SET kind = excluded.kind RETURNING group_id').bind(id, kind);
        const results = await env.DB.batch(kind === 'group' ? [profile, update] : [update, profile]);
        if (!results[kind === 'group' ? 1 : 0].results?.length) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
      } else await env.DB.batch([
        env.DB.prepare('INSERT INTO manager_clients(id, name, store_ids, active) VALUES(?, ?, ?, ?)').bind(id, body.name.trim(), stores, Number(body.active)),
        env.DB.prepare('INSERT INTO manager_client_profiles(group_id, kind) VALUES(?, ?)').bind(id, kind),
      ]);
      return reply({ client: (await adminGroups(env)).find(group => group.id === id) }, editing ? 200 : 201);
    }
    const email = normalizeEmail(body.email ?? body.username), mode = body.accessMode ?? 'password';
    if (!validEmail(email) || !['password','invite'].includes(mode) || !uuid(body.clientId) || typeof body.password !== 'string' || body.password.length > 256 || (mode === 'password' && ((!editing || body.password) && body.password.length < 8)) || (mode === 'invite' && body.password)) throw bad('Confira o e-mail, o cliente e a senha (mínimo de 8 caracteres).');
    if (mode === 'invite' && !invitationConfiguration(env)) return reply({ error: 'Envio de convites indisponível. Configure o serviço de e-mail.' }, 503);
    const client = await env.DB.prepare('SELECT id, active FROM manager_clients WHERE id = ?').bind(body.clientId).first();
    if (!client) throw bad('Cliente não encontrado.');
    if (mode === 'invite' && (!body.active || !client.active)) throw bad('Ative o cliente e o acesso antes de enviar um convite.');
    const previous = editing ? await readUser(env, id) : null;
    if (editing && (!previous || previous.revision !== body.revision)) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
    if (mode === 'invite' && previous?.sent_at && Date.now() - previous.sent_at < 60000) return reply({ error: 'Aguarde um minuto antes de reenviar o convite.' }, 429);
    if (mode === 'password' && body.active && previous?.needs_password && !body.password) throw bad('Defina uma senha ou envie um convite para este acesso.');
    const duplicate = await env.DB.prepare('SELECT id FROM manager_users WHERE lower(username) = ? AND id != ?').bind(email, id).first();
    if (duplicate) return reply({ error: 'Este e-mail já possui acesso ao portal.' }, 409);
    const newPassword = body.password || (!editing ? hex(crypto.getRandomValues(new Uint8Array(32))) : '');
    const salt = newPassword ? hex(crypto.getRandomValues(new Uint8Array(16))) : previous.salt;
    const hash = newPassword ? await digest(newPassword, salt) : previous.hash;
    if (editing) {
      const result = await env.DB.prepare('UPDATE manager_users SET client_id = ?, username = ?, name = ?, active = ?, salt = ?, hash = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(body.clientId, email, body.name.trim(), Number(body.active), salt, hash, id, body.revision).run();
      if (!result.meta.changes) return reply({ error: 'Cadastro alterado em outra sessão. Atualize a página.' }, 409);
      if (body.password) await env.DB.prepare('DELETE FROM manager_user_invitations WHERE user_id = ?').bind(id).run();
    } else {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO manager_users(id, client_id, username, name, active, salt, hash) VALUES(?, ?, ?, ?, ?, ?, ?)').bind(id, body.clientId, email, body.name.trim(), Number(body.active), salt, hash),
        ...(mode === 'invite' ? [env.DB.prepare("INSERT INTO manager_user_invitations(user_id,password_revision,expires_at,needs_password,delivery_status) VALUES(?,1,0,1,'pending')").bind(id)] : []),
      ]);
    }
    const saved = await readUser(env, id);
    const invitation = mode === 'invite' ? await sendManagerInvitation(env, id, saved.revision, language) : undefined;
    return reply({ user: userView(await readUser(env, id)), ...(invitation ? { invitation } : {}) }, editing ? 200 : 201);
  } catch (error) {
    if (error.message?.includes('INDIVIDUAL_STORE_LIMIT')) return reply({ error: 'Um cliente de loja única pode ter apenas uma loja.' }, 400);
    if (error.message?.includes('UNIQUE constraint failed: manager_users.username')) return reply({ error: 'Este e-mail já possui acesso ao portal.' }, 409);
    return reply({ error: error.status ? (error.message === 'STORE_NOT_FOUND' ? 'Loja indisponível.' : error.message === 'INVALID_STORE' ? 'Identificador de loja inválido.' : error.message) : 'Cadastro temporariamente indisponível.' }, error.status || 503);
  }
}
