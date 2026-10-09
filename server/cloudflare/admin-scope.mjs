import { storeId } from './stores.mjs';

const fail = (message, status = 404) => { throw Object.assign(new Error(message), { status }); };

export async function adminGroups(env) {
  const { results } = await env.DB.prepare('SELECT id, name, store_ids, active, revision FROM manager_clients ORDER BY name, id').all();
  return results.map(row => ({ id: row.id, name: row.name, storeIds: JSON.parse(row.store_ids), active: !!row.active, revision: row.revision }));
}

export async function adminScope(env, url) {
  const groupId = url.searchParams.get('groupId') || '';
  const requestedStore = url.searchParams.get('storeId') || '';
  let group = null, store = null;
  if (groupId === 'unassigned') {
    const { results } = await env.DB.prepare('SELECT stores.id FROM stores WHERE NOT EXISTS (SELECT 1 FROM manager_clients, json_each(manager_clients.store_ids) AS membership WHERE membership.value = stores.id) ORDER BY stores.id').all();
    group = { id: groupId, name: 'Lojas sem grupo', storeIds: results.map(row => row.id), active: true };
  } else if (groupId) {
    const row = await env.DB.prepare('SELECT id, name, store_ids, active, revision FROM manager_clients WHERE id = ?').bind(groupId).first();
    if (!row) fail('Grupo não encontrado.');
    group = { id: row.id, name: row.name, storeIds: JSON.parse(row.store_ids), active: !!row.active, revision: row.revision };
  }
  if (requestedStore) {
    let id; try { id = storeId(requestedStore); } catch { fail('Identificador de loja inválido.', 400); }
    store = await env.DB.prepare('SELECT id, name, active FROM stores WHERE id = ?').bind(id).first();
    if (!store) fail('Loja não encontrada.');
    if (group && !group.storeIds.includes(store.id)) fail('Esta loja não pertence ao grupo selecionado.', 400);
  }
  return { group, store, groupId, storeId: store?.id || '', storeIds: store ? [store.id] : group?.storeIds ?? null };
}

export function adminScopeFilter(scope, column = 'store_id') {
  return scope.storeIds === null ? { sql: '1 = 1', values: [] } : {
    sql: `${column} IN (SELECT value FROM json_each(?))`, values: [JSON.stringify(scope.storeIds)],
  };
}
