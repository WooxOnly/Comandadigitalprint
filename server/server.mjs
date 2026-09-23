import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const port = Number(process.env.PORT || 3000);
const adminToken = process.env.MENU_ADMIN_TOKEN;
const menuFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'menu.json');

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

async function readMenu() {
  return JSON.parse(await readFile(menuFile, 'utf8'));
}

async function readRequestBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return JSON.parse(body || 'null');
}

function isValidMenu(menu) {
  return Array.isArray(menu) && menu.every((item) => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.category === 'string' && typeof item.price === 'number' && (!item.kind || item.kind === 'pizza'));
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS' });
    response.end();
    return;
  }

  try {
    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === 'GET' && request.url === '/menu') {
      sendJson(response, 200, await readMenu());
      return;
    }

    if (request.method === 'PUT' && request.url === '/menu') {
      if (!adminToken || request.headers.authorization !== `Bearer ${adminToken}`) {
        sendJson(response, 401, { error: 'Unauthorized' });
        return;
      }
      const menu = await readRequestBody(request);
      if (!isValidMenu(menu)) {
        sendJson(response, 400, { error: 'Invalid menu format' });
        return;
      }
      await writeFile(menuFile, `${JSON.stringify(menu, null, 2)}\n`, 'utf8');
      sendJson(response, 200, { ok: true, updatedAt: new Date().toISOString(), count: menu.length });
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Menu server listening on port ${port}`);
});
