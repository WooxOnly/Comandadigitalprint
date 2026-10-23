import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../server/cloudflare/web-worker.mjs';
test('web assets and deep links stay separate from the existing authenticated backend', async () => {
  const seen = [], assets = [];
  const env = {
    BACKEND: { fetch: async request => { seen.push({ url: request.url, token: request.headers.get('Authorization'), body: await request.text() }); return Response.json({ ok: true }); } },
    WEB_ASSETS: { fetch: async request => { const path = new URL(request.url).pathname; assets.push(path); return ['/index.html', '/'].includes(path) ? new Response('<html>App</html>', { headers: { 'Content-Type': 'text/html' } }) : new Response(null, { status: 404 }); } },
  };
  const root = await worker.fetch(new Request('https://web.example/'), env); assert.equal(root.status, 302); assert.equal(root.headers.get('Location'), 'https://web.example/app/');
  const api = new Request('https://web.example/cloud/change', { method: 'POST', headers: { Authorization: 'Bearer synthetic' }, body: '{"example":true}' });
  assert.equal((await worker.fetch(api, env)).status, 200);
  assert.deepEqual(seen, [{ url: 'https://web.example/cloud/change', token: 'Bearer synthetic', body: '{"example":true}' }]);
  const app = await worker.fetch(new Request('https://web.example/app/history/abc'), env);
  assert.equal(app.status, 200); assert.equal(app.headers.get('Cache-Control'), 'no-store'); assert.ok(app.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.deepEqual(assets, ['/history/abc', '/index.html']);
  assert.equal((await worker.fetch(new Request('https://web.example/app/missing.js'), env)).status, 404);
  assert.equal((await worker.fetch(new Request('https://web.example/app/', { method: 'POST' }), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://web.example/admin'), env)).status, 404);
  assert.equal((await worker.fetch(new Request('https://web.example/menu'), {})).status, 503);
});
