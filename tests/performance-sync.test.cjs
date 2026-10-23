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
