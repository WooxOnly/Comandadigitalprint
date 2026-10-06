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

export const DEFAULT_MODULES = Object.freeze({ preorders: false, cash: false, customers: false, preparation: false });
export function validModules(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && [2, 3, 4].includes(Object.keys(value).length) && Object.keys(value).every(key => ['preorders', 'cash', 'customers', 'preparation'].includes(key))
    && typeof value.preorders === 'boolean' && typeof value.cash === 'boolean' && (value.customers === undefined || typeof value.customers === 'boolean') && (value.preparation === undefined || typeof value.preparation === 'boolean');
}
export async function storeModules(env, id) {
  const row = await env.DB.prepare('SELECT preorders, cash FROM store_modules WHERE store_id = ?').bind(storeId(id)).first();
  const customer = await env.DB.prepare('SELECT enabled FROM store_customer_modules WHERE store_id = ?').bind(storeId(id)).first();
  const prep = await env.DB.prepare('SELECT enabled FROM store_preparation_modules WHERE store_id = ?').bind(storeId(id)).first();
  return { preparation: prep?.enabled === 1, preorders: row?.preorders === 1, cash: row?.cash === 1, customers: customer?.enabled === 1 };
}
