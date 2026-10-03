export const DEFAULT_STORE_ID = 'seabra-1';

export function storeId(value = DEFAULT_STORE_ID) {
  if (typeof value !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(value)) {
    throw Object.assign(new Error('INVALID_STORE'), { status: 400 });
  }
  return value;
}

export async function activeStore(env, id) {
  if (!env.DB) throw Object.assign(new Error('UNAVAILABLE'), { status: 503 });
  const store = await env.DB.prepare('SELECT id, name FROM stores WHERE id = ? AND active = 1').bind(storeId(id)).first();
  if (!store) throw Object.assign(new Error('STORE_NOT_FOUND'), { status: 404 });
  return store;
}
