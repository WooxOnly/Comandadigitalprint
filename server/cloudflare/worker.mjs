import defaultMenu from '../menu.json' with { type: 'json' };
import { adminResponse } from './admin-auth.mjs';
import { cloudResponse } from './cloud-api.mjs';
import { isValidMenu, MAX_BODY_BYTES } from '../../shared/menu-validation.mjs';
import { activeStore, DEFAULT_STORE_ID } from './stores.mjs';
import { managerResponse } from './manager-api.mjs';

const headers = {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw Object.assign(new Error(), { status: 413 });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error(), { status: 400 });
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw Object.assign(new Error(), { status: 413 }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw Object.assign(new Error(), { status: 400 }); }
}

export default {
  async fetch(request, env) {
    const manager = await managerResponse(request, env);
    if (manager) return manager;
    const cloud = await cloudResponse(request, env);
    if (cloud) return cloud;
    const authentication = await adminResponse(request, env);
    if (authentication) return authentication;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const pathname = new URL(request.url).pathname;
    try {
      if (request.method === 'GET' && pathname === '/health') {
        await activeStore(env, DEFAULT_STORE_ID);
        return json({ ok: true });
      }
      if (request.method === 'GET' && pathname === '/menu') {
        const selectedStore = await activeStore(env, new URL(request.url).searchParams.get('storeId') ?? DEFAULT_STORE_ID);
        const record = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(selectedStore.id, 'menu').first();
        const legacy = selectedStore.id === DEFAULT_STORE_ID && !record ? await env.DB.prepare('SELECT data FROM menu WHERE id = 1').first() : null;
        const menu = record ? JSON.parse(record.data) : legacy ? JSON.parse(legacy.data) : selectedStore.id === DEFAULT_STORE_ID ? defaultMenu : [];
        if (!isValidMenu(menu)) throw new Error('Invalid stored menu');
        return json(menu);
      }
      if (request.method === 'PUT' && pathname === '/menu') {
        if ((new URL(request.url).searchParams.get('storeId') ?? DEFAULT_STORE_ID) !== DEFAULT_STORE_ID) return json({ error: 'Use o acesso da loja para editar o cardápio' }, 403);
        if (!env.MENU_ADMIN_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.MENU_ADMIN_TOKEN}`) return json({ error: 'Não autorizado' }, 401);
        if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Use application/json' }, 415);
        const menu = await readBody(request);
        if (!isValidMenu(menu)) return json({ error: 'Formato de cardápio inválido' }, 400);
        const updatedAt = new Date().toISOString();
        await env.DB.prepare('INSERT INTO store_events(store_id, mutation, key, data, actor, created_at) VALUES(?, ?, ?, ?, ?, ?)').bind(DEFAULT_STORE_ID, crypto.randomUUID(), 'menu', JSON.stringify(menu), 'owner', updatedAt).run();
        return json({ ok: true, updatedAt, count: menu.length });
      }
      return json({ error: 'Recurso ou método indisponível' }, pathname === '/menu' ? 405 : 404);
    } catch (error) {
      return json({ error: error.message === 'STORE_NOT_FOUND' ? 'Loja indisponível' : error.message === 'INVALID_STORE' ? 'Identificador de loja inválido' : error.status === 413 ? 'Cardápio muito grande' : error.status === 400 ? 'JSON inválido' : 'Não foi possível acessar o cardápio' }, error.status || 500);
    }
  },
};
