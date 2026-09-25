import defaultMenu from '../menu.json' with { type: 'json' };
import { isValidMenu, MAX_BODY_BYTES } from '../../shared/menu-validation.mjs';

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
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const pathname = new URL(request.url).pathname;
    try {
      if (request.method === 'GET' && (pathname === '/menu' || pathname === '/health')) {
        const record = await env.DB.prepare('SELECT data FROM menu WHERE id = 1').first();
        const menu = record ? JSON.parse(record.data) : defaultMenu;
        if (!isValidMenu(menu)) throw new Error('Invalid stored menu');
        return json(pathname === '/health' ? { ok: true } : menu);
      }
      if (request.method === 'PUT' && pathname === '/menu') {
        if (!env.MENU_ADMIN_TOKEN || request.headers.get('Authorization') !== `Bearer ${env.MENU_ADMIN_TOKEN}`) return json({ error: 'Não autorizado' }, 401);
        if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return json({ error: 'Use application/json' }, 415);
        const menu = await readBody(request);
        if (!isValidMenu(menu)) return json({ error: 'Formato de cardápio inválido' }, 400);
        const updatedAt = new Date().toISOString();
        await env.DB.prepare('INSERT INTO menu (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').bind(JSON.stringify(menu), updatedAt).run();
        return json({ ok: true, updatedAt, count: menu.length });
      }
      return json({ error: 'Recurso ou método indisponível' }, pathname === '/menu' ? 405 : 404);
    } catch (error) {
      return json({ error: error.status === 413 ? 'Cardápio muito grande' : error.status === 400 ? 'JSON inválido' : 'Não foi possível acessar o cardápio' }, error.status || 500);
    }
  },
};
