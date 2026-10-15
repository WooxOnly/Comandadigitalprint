import { storeId } from './stores.mjs';
const fail = (message, status = 404) => { throw Object.assign(new Error(message), { status }); };
export async function adminGroups(env) {
  const { results } = await env.DB.prepare("SELECT g.id, g.name, g.store_ids, g.active, g.revision, COALESCE(profile.kind, 'group') AS kind FROM manager_clients AS g LEFT JOIN manager_client_profiles AS profile ON profile.group_id = g.id ORDER BY g.name, g.id").all();
  return results.map(row => ({ id: row.id, name: row.name, storeIds: JSON.parse(row.store_ids), active: !!row.active, revision: row.revision, kind: row.kind }));
}
export async function adminScope(env, url) {
  const clientId = url.searchParams.get('clientId') || '';
  const groupId = url.searchParams.get('groupId') || (clientId !== 'unassigned' ? clientId : '') || '';
  const requestedStore = url.searchParams.get('storeId') || '';
  if (requestedStore && !groupId) fail('Escolha um cliente antes de selecionar a loja.', 400);
  let group = null, store = null;
  if (clientId && clientId !== 'unassigned' && clientId !== groupId) fail('Este grupo não pertence ao cliente selecionado.', 400);
  if (groupId === 'unassigned') {
    const { results } = await env.DB.prepare('SELECT stores.id FROM stores WHERE NOT EXISTS (SELECT 1 FROM manager_clients, json_each(manager_clients.store_ids) AS membership WHERE membership.value = stores.id) ORDER BY stores.id').all();
    group = { id: groupId, name: 'Lojas sem grupo', storeIds: results.map(row => row.id), active: true, kind: 'group' };
  } else if (groupId) {
    group = (await adminGroups(env)).find(group => group.id === groupId);
    if (!group) fail('Grupo não encontrado.');
  }
  if (requestedStore) {
    let id; try { id = storeId(requestedStore); } catch { fail('Identificador de loja inválido.', 400); }
    store = await env.DB.prepare('SELECT id, name, active FROM stores WHERE id = ?').bind(id).first();
    if (!store) fail('Loja não encontrada.');
    if (!group.storeIds.includes(store.id)) fail('Esta loja não pertence ao grupo selecionado.', 400);
  }
  return { client: group, clientId: groupId, group, groupId, store, storeId: store?.id || '', storeIds: store ? [store.id] : group?.storeIds ?? null };
}
export function adminScopeFilter(scope, column = 'store_id') {
  return scope.storeIds === null ? { sql: '1 = 1', values: [] } : { sql: `${column} IN (SELECT value FROM json_each(?))`, values: [JSON.stringify(scope.storeIds)] };
}
