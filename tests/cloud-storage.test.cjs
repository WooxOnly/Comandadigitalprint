const assert = require('node:assert/strict');
const { test } = require('node:test');
const crypto = require('node:crypto');
const ts = require('typescript');
const fs = require('node:fs');
function compile(file, requireMock) {
  const output = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(output, requireMock);
  return output;
}
test('encrypted storage migrates local data, commits atomically and restores its queue after restart', async () => {
  const asyncValues = new Map(), secretValues = new Map(), files = new Map(); let failPointer = false;
  const original = [{ id: 'old-order', createdAt: new Date().toISOString(), plate: '1', customer: 'Private Customer', items: [{ id: 'a', name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] }];
  asyncValues.set('@comandadigitalprint/orders', JSON.stringify(original));
  asyncValues.set('@comandadigitalprint/language', 'es');
  asyncValues.set('@comandadigitalprint/printer-settings', JSON.stringify({ connection: 'system', name: 'A', address: '', port: '9100', paperWidth: '58' }));
  class File {
    constructor(...parts) { this.uri = parts.map((p) => typeof p === 'string' ? p : p.uri).join(''); }
    create() { files.set(this.uri, ''); }
    write(data) { files.set(this.uri, data); }
    async text() { if (!files.has(this.uri)) throw Error('missing'); return files.get(this.uri); }
    delete() { files.delete(this.uri); }
  }
  const asyncStorage = { getItem: async (k) => asyncValues.get(k) ?? null, setItem: async (k, v) => { if (failPointer && k.includes('cloud-v1')) throw Error('disk full'); asyncValues.set(k, v); } };
  const secure = { getItemAsync: async (k) => secretValues.get(k) ?? null, setItemAsync: async (k, v) => { secretValues.set(k, v); } };
  const syncModule = compile('src/services/cloudSync.ts', (name) => name === '../../shared/cloud-validation.mjs' ? require('../shared/cloud-validation.mjs') : require(name));
  const load = () => compile('src/services/cloudStorage.ts', (name) => ({
    '@react-native-async-storage/async-storage': asyncStorage,
    'expo-secure-store': secure,
    'expo-crypto': { randomUUID: crypto.randomUUID },
    'expo-file-system': { File, Paths: { document: { uri: 'file:///documents/' } } },
    'react-native-quick-crypto': { ...crypto, Buffer },
    './cloudSync': syncModule,
    '../config/auth': { ADMIN_CREDENTIAL_ENDPOINT: 'https://example.com/auth/admin' },
  }[name] || require(name)));
  const first = load();
  assert.deepEqual(JSON.parse(await first.appStorage.getItem('@comandadigitalprint/orders')), original);
  const tabletId = first.cloud.identity();
  assert.equal(await first.cloud.get('language:' + tabletId), 'es');
  assert.equal((await first.cloud.get('printer:' + tabletId)).paperWidth, '58');
  assert.equal(await first.cloud.get('printer'), undefined);
  const fresh = { ...original[0], id: tabletId + '-' + crypto.randomUUID(), tabletId };
  await first.appStorage.setItem('@comandadigitalprint/orders', JSON.stringify([fresh, ...original])); await first.cloud.sync();
  assert.equal(first.cloud.pending('order:' + fresh.id), true);
  assert.ok([...files.values()].every((data) => !data.includes('Private Customer')));
  const reference = asyncValues.get('@comandadigitalprint/cloud-v1');
  failPointer = true;
  const failed = { ...fresh, id: 'failed' };
  await assert.rejects(first.appStorage.setItem('@comandadigitalprint/orders', JSON.stringify([failed, fresh, ...original])));
  assert.equal(asyncValues.get('@comandadigitalprint/cloud-v1'), reference);
  assert.equal(files.size, 1);
  failPointer = false;
  const reopened = load();
  const restored = JSON.parse(await reopened.appStorage.getItem('@comandadigitalprint/orders'));
  assert.equal(restored.length, 2); assert.ok(!restored.some((o) => o.id === 'failed'));
  assert.equal(reopened.cloud.identity(), tabletId);
  assert.equal(reopened.cloud.pending('order:' + fresh.id), true);
  const target = JSON.parse(reference).file; const envelope = JSON.parse(files.get(target));
  envelope.tag = '00'.repeat(16); files.set(target, JSON.stringify(envelope));
  await assert.rejects(load().appStorage.getItem('@comandadigitalprint/orders'));
  assert.equal(asyncValues.get('@comandadigitalprint/cloud-v1'), reference);
});
