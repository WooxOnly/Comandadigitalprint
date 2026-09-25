import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createMenuServer } from '../server/server.mjs';
import worker from '../server/cloudflare/worker.mjs';
import { isValidMenu, MAX_BODY_BYTES } from '../shared/menu-validation.mjs';

const sample = [{ id: 'a', name: 'Pizza', category: 'Pizzas', price: 0, kind: 'pizza', allowsExtras: false }];
const authorization = 'Bearer test-only-secret';
const headers = { Authorization: authorization, 'Content-Type': 'application/json' };

test('menu validation rejects duplicates, blanks, invalid amounts and malformed metadata', () => {
  assert.ok(isValidMenu(sample));
  for (const menu of [null, {}, [null], [sample[0], sample[0]], [{ ...sample[0], name: ' ' }], [{ ...sample[0], price: -1 }], [{ ...sample[0], price: Infinity }], [{ ...sample[0], description: {} }], [{ ...sample[0], allowsExtras: 'false' }]]) assert.equal(isValidMenu(menu), false);
});

test('Node server authenticates, rejects bad input, and preserves complete files during concurrent writes', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'comanda-server-test-'));
  const menuFile = path.join(directory, 'menu.json');
  await writeFile(menuFile, JSON.stringify(sample));
  const server = createMenuServer({ menuFile, adminToken: 'test-only-secret' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + '/health')).status, 200);
    assert.equal((await fetch(base + '/menu', { method: 'PUT', body: '[]' })).status, 401);
    assert.equal((await fetch(base + '/menu', { method: 'PUT', headers, body: '{bad' })).status, 400);
    assert.equal((await fetch(base + '/menu', { method: 'PUT', headers, body: JSON.stringify([sample[0], sample[0]]) })).status, 400);
    assert.equal((await fetch(base + '/menu', { method: 'PUT', headers: { Authorization: authorization }, body: '[]' })).status, 415);
    assert.equal((await fetch(base + '/menu', { method: 'PUT', headers, body: ' '.repeat(MAX_BODY_BYTES + 1) })).status, 413);
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(' '.repeat(MAX_BODY_BYTES + 1))); controller.close(); } });
    assert.equal((await fetch(base + '/menu', { method: 'PUT', headers, body: stream, duplex: 'half' })).status, 413);
    assert.deepEqual(JSON.parse(await readFile(menuFile, 'utf8')), sample);
    const writes = Array.from({ length: 8 }, (_, i) => fetch(base + '/menu', { method: 'PUT', headers, body: JSON.stringify([{ ...sample[0], name: `Pizza ${i}` }]) }));
    const reads = Array.from({ length: 8 }, () => fetch(base + '/menu').then((res) => res.json()));
    for (const response of await Promise.all(writes)) assert.equal(response.status, 200);
    for (const menu of await Promise.all(reads)) assert.ok(isValidMenu(menu));
    assert.ok(isValidMenu(JSON.parse(await readFile(menuFile, 'utf8'))));
    assert.deepEqual(await readdir(directory), ['menu.json']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    // Only the isolated temporary folder created by this test may be removed.
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('comanda-server-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});

test('Cloudflare handler executes real SQLite reads and durable updates, with the same validation', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(await readFile(new URL('../server/cloudflare/schema.sql', import.meta.url), 'utf8'));
  const env = { MENU_ADMIN_TOKEN: 'test-only-secret', DB: { prepare(sql) {
    return { async first() { return db.prepare(sql).get(); }, bind(...values) { return { async run() { return db.prepare(sql).run(...values); } }; } };
  } } };
  const request = (options = {}) => new Request('https://example.com/menu', options);
  try {
    assert.equal((await (await worker.fetch(request(), env)).json()).length, 41);
    assert.equal((await worker.fetch(request({ method: 'PUT', body: '[]' }), env)).status, 401);
    assert.equal((await worker.fetch(request({ method: 'PUT', headers, body: '{bad' }), env)).status, 400);
    assert.equal((await worker.fetch(request({ method: 'PUT', headers, body: JSON.stringify([{ ...sample[0], price: -1 }]) }), env)).status, 400);
    assert.equal((await worker.fetch(request({ method: 'PUT', headers, body: ' '.repeat(MAX_BODY_BYTES + 1) }), env)).status, 413);
    assert.equal((await worker.fetch(request({ method: 'PUT', headers, body: JSON.stringify(sample) }), env)).status, 200);
    assert.deepEqual(await (await worker.fetch(request(), env)).json(), sample);
    assert.equal((await worker.fetch(request({ method: 'OPTIONS' }), env)).status, 204);
  } finally { db.close(); }
});
