const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { loadTs } = require('./helpers/load-ts.cjs');
const { createCloudSync } = loadTs('src/services/cloudSync.ts');
const { sameRecordValues } = loadTs('src/services/recordSelection.ts');

test('idle sync with 8,000 orders persists once and keeps unchanged record identities', async () => {
  const { DEFAULT_ACCESS } = await import('../shared/operations-validation.mjs');
  const modules = { preparation: false, preorders: false, customers: false, cash: false };
  const values = {};
  for (let index = 0; index < 8000; index++) {
    const id = `order-${index}`, key = 'order:' + id;
    values[key] = { key, revision: 1, value: { id, createdAt: '2026-10-22T14:00:00.000Z', plate: '1', customer: 'Synthetic', items: [{ id: 'item', name: 'Item', category: 'Group', quantity: 1, note: '' }] } };
  }
  let snapshot = JSON.stringify({ version: 1, operationsVersion: 1, deviceId: 'device-perf', tabletNumber: 1, reader: 'admin', storeId: 'seabra-1', storeName: 'Synthetic', modules, access: DEFAULT_ACCESS, preparationSettings: { allowReprint: false, useFinishButton: true }, values, pending: {}, cursor: 8000, lastSync: null });
  let writes = 0, changes = [];
  const fetcher = async url => {
    const path = new URL(url).pathname;
    const data = path.endsWith('/store') ? { storeId: 'seabra-1', name: 'Synthetic', modules }
      : path.endsWith('/access') ? DEFAULT_ACCESS
      : path.endsWith('/changes') ? { changes, cursor: changes.length ? 8001 : 8000, more: false }
      : null;
    assert.notEqual(data, null, 'Unexpected network request: ' + path);
    return Response.json(data);
  };
  const cloud = createCloudSync({ getItem: async () => snapshot, setItem: async (_, value) => { writes++; snapshot = value; } }, 'https://example.com/cloud', randomUUID, async () => ({}), fetcher);
  await cloud.setSession({ storeId: 'seabra-1', username: 'admin', token: 'synthetic-only' });
  const before = await cloud.list('order:');
  await cloud.sync();
  assert.equal(cloud.status().status, 'SYNCED');
  assert.equal(writes, 1, 'Only lastSync must be persisted when records and settings are unchanged');
  assert.equal(sameRecordValues(before, await cloud.list('order:')), true);
  assert.equal(JSON.parse(snapshot).cursor, 8000);
  assert.ok(JSON.parse(snapshot).lastSync);
  // Consumers may sort/remove their array without corrupting later selections.
  const local = await cloud.list('order:'); local.reverse(); local.pop();
  assert.equal(sameRecordValues(before, await cloud.list('order:')), true);
  changes = [{ key: 'order:new-order', revision: 8001, value: { ...before[0], id: 'new-order' } }];
  await cloud.sync();
  assert.equal(cloud.status().status, 'SYNCED');
  assert.equal((await cloud.list('order:')).length, 8001);
  assert.equal(sameRecordValues(before, await cloud.list('order:')), false);
  assert.equal(JSON.parse(snapshot).cursor, 8001);
  // Sending a new order only writes that immutable record, retaining the full
  // history and an offline retry entry without re-submitting historical orders.
  await cloud.setSession(null); cloud.setOfflineActor('admin');
  const priorWrites = writes;
  await cloud.write({ 'order:offline-order': { ...before[0], id: 'offline-order' } });
  const committed = JSON.parse(snapshot);
  assert.equal(writes - priorWrites, 1);
  assert.deepEqual(Object.keys(committed.pending), ['order:offline-order']);
  assert.equal((await cloud.list('order:')).length, 8002);
  assert.deepEqual(await cloud.get('order:' + before[0].id), before[0]);
});

test('record selection detects edits, additions, removals and ordering without JSON serialization', () => {
  const a = { id: 'a' }, b = { id: 'b' };
  assert.equal(sameRecordValues(undefined, []), false);
  assert.equal(sameRecordValues([], []), true);
  assert.equal(sameRecordValues([a, b], [a, b]), true);
  for (const next of [[a], [a, b, {}], [b, a], [a, { ...b }]]) assert.equal(sameRecordValues([a, b], next), false);
});

async function pullFixture(handler, save = () => {}) {
  const { DEFAULT_ACCESS } = await import('../shared/operations-validation.mjs');
  const modules = { preparation: false, preorders: false, customers: false, cash: false };
  let snapshot = JSON.stringify({ version: 1, operationsVersion: 1, deviceId: 'test-device', tabletNumber: 1, reader: 'admin', storeId: 'seabra-1', storeName: 'Synthetic', modules, access: DEFAULT_ACCESS, preparationSettings: { allowReprint: false, useFinishButton: true }, values: {}, pending: {}, cursor: 0, lastSync: null });
  const cloud = createCloudSync({ getItem: async () => snapshot, setItem: async (_, value) => { save(JSON.parse(value)); snapshot = value; } }, 'https://example.com/cloud', randomUUID, async () => ({}), async url => {
    const path = new URL(url).pathname;
    if (path.endsWith('/store')) return Response.json({ storeId: 'seabra-1', name: 'Synthetic', modules });
    if (path.endsWith('/access')) return Response.json(DEFAULT_ACCESS);
    return handler(new URL(url));
  });
  await cloud.setSession({ storeId: 'seabra-1', username: 'admin', token: 'synthetic-only' });
  return { cloud, saved: () => JSON.parse(snapshot) };
}

function syntheticRecord(index) {
  return { key: 'order:batch-' + index, revision: index + 1, value: { id: 'batch-' + index, createdAt: '2026-10-22T14:00:00.000Z', plate: '1', customer: 'Synthetic', items: [{ id: 'item', name: 'Item', category: 'Group', quantity: 1, note: '' }] } };
}

test('initial history batches ten pages per durable write and reports real progress', async () => {
  let pages = 0;
  const writes = [], progress = [];
  const f = await pullFixture(url => {
    const cursor = Number(url.searchParams.get('after')); pages++;
    return Response.json({ changes: [syntheticRecord(cursor)], cursor: cursor + 1, more: cursor < 24 });
  }, value => writes.push(value.cursor));
  f.cloud.subscribe(() => progress.push(f.cloud.status().received));
  await f.cloud.sync();
  assert.equal(pages, 25);
  assert.deepEqual(writes, [10, 20, 25, 25]);
  assert.equal((await f.cloud.list('order:')).length, 25);
  assert.equal(f.cloud.status().status, 'SYNCED');
  assert.equal(f.cloud.status().received, 25);
  assert.ok(progress.includes(10) && progress.includes(20));
});

test('a stalled pagination cursor fails and permits a later retry instead of looping forever', async () => {
  let stalled = true, requests = 0;
  const f = await pullFixture(() => { requests++; return Response.json({ changes: [], cursor: 0, more: stalled }); });
  await f.cloud.sync();
  assert.equal(requests, 1);
  assert.equal(f.cloud.status().status, 'UNAVAILABLE');
  assert.equal(f.saved().lastSync, null);
  stalled = false;
  await f.cloud.sync();
  assert.equal(f.cloud.status().status, 'SYNCED');
});

test('failed history batch keeps the durable cursor and retries without losing earlier pages', async () => {
  let fail = true;
  const f = await pullFixture(url => {
    const cursor = Number(url.searchParams.get('after'));
    if (fail && cursor === 12) throw Error('connection lost');
    return Response.json({ changes: [syntheticRecord(cursor)], cursor: cursor + 1, more: cursor < 14 });
  });
  await f.cloud.sync();
  assert.equal(f.cloud.status().status, 'UNAVAILABLE');
  assert.equal(f.saved().cursor, 10);
  assert.equal(f.saved().lastSync, null);
  assert.equal((await f.cloud.list('order:')).length, 10);
  fail = false; await f.cloud.sync();
  assert.equal(f.cloud.status().status, 'SYNCED');
  assert.equal((await f.cloud.list('order:')).length, 15);
  assert.equal(f.saved().cursor, 15);
});

test('a fetch ignoring abort cannot keep synchronization locked indefinitely', async () => {
  let hang = true;
  const f = await pullFixture(() => hang ? new Promise(() => {}) : Response.json({ changes: [], cursor: 0, more: false }));
  await f.cloud.sync();
  assert.equal(f.cloud.status().status, 'UNAVAILABLE');
  hang = false; await f.cloud.sync();
  assert.equal(f.cloud.status().status, 'SYNCED');
});
