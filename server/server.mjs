import { createServer } from 'node:http';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { isValidMenu, MAX_BODY_BYTES } from '../shared/menu-validation.mjs';

const defaultMenuFile = fileURLToPath(new URL('./menu.json', import.meta.url));
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' };
function sendJson(response, status, body) {
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}
const httpError = (status, message) => Object.assign(new Error(message), { status });
async function readRequestBody(request) {
  if (Number(request.headers['content-length']) > MAX_BODY_BYTES) throw httpError(413, 'Cardápio muito grande');
  return new Promise((resolve, reject) => {
    let chunks = [], size = 0, oversized = false;
    request.on('data', (chunk) => {
      if (oversized) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        oversized = true; chunks = [];
        reject(httpError(413, 'Cardápio muito grande'));
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      if (oversized) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(httpError(400, 'JSON inválido')); }
    });
    request.on('error', reject);
    request.on('aborted', () => reject(httpError(400, 'Requisição interrompida')));
  });
}

export async function atomicWriteMenu(menuFile, menu) {
  const directory = path.dirname(menuFile);
  await mkdir(directory, { recursive: true });
  const temp = path.join(directory, `.menu-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temp, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(menu, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temp, menuFile);
  } finally {
    if (handle) await handle.close();
    await unlink(temp).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}

export function createMenuServer({ menuFile = defaultMenuFile, adminToken = process.env.MENU_ADMIN_TOKEN } = {}) {
  let writes = Promise.resolve();
  const digest = (value) => createHash('sha256').update(value).digest();
  const server = createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { ...headers, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS' });
      response.end(); return;
    }
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'GET' && (pathname === '/menu' || pathname === '/health')) {
        const menu = JSON.parse(await readFile(menuFile, 'utf8'));
        if (!isValidMenu(menu)) throw new Error('Stored menu is invalid');
        sendJson(response, 200, pathname === '/health' ? { ok: true } : menu); return;
      }
      if (request.method === 'PUT' && pathname === '/menu') {
        if (!adminToken || !timingSafeEqual(digest(request.headers.authorization || ''), digest(`Bearer ${adminToken}`))) {
          sendJson(response, 401, { error: 'Não autorizado' }); return;
        }
        if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
          sendJson(response, 415, { error: 'Use application/json' }); return;
        }
        const menu = await readRequestBody(request);
        if (!isValidMenu(menu)) { sendJson(response, 400, { error: 'Formato de cardápio inválido' }); return; }
        const write = writes.then(() => atomicWriteMenu(menuFile, menu));
        writes = write.catch(() => {});
        await write;
        sendJson(response, 200, { ok: true, updatedAt: new Date().toISOString(), count: menu.length }); return;
      }
      sendJson(response, pathname === '/menu' ? 405 : 404, { error: 'Recurso ou método indisponível' });
    } catch (error) {
      sendJson(response, error.status || 500, { error: error.status ? error.message : 'Não foi possível acessar o cardápio' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000);
  const menuFile = process.env.MENU_FILE ? path.resolve(process.env.MENU_FILE) : defaultMenuFile;
  createMenuServer({ menuFile }).listen(port, '0.0.0.0', () => console.log(`Menu server listening on port ${port}`));
}
