const { loadTs } = require('./helpers/load-ts.cjs');
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
  const asyncValues = new Map(), secretValues = new Map(), files = new Map(), directories = new Set(); let failPointer = false;
  const original = [{ id: 'old-order', createdAt: new Date().toISOString(), plate: '1', customer: 'Private Customer', items: [{ id: 'a', name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] }];
  asyncValues.set('@comandadigitalprint/orders', JSON.stringify(original));
  asyncValues.set('@comandadigitalprint/language', 'es');
  asyncValues.set('@comandadigitalprint/printer-settings', JSON.stringify({ connection: 'system', name: 'A', address: '', port: '9100', paperWidth: '58' }));
  class File {
    constructor(...parts) { this.uri = parts.reduce((path, part) => path + (path && !path.endsWith('/') ? '/' : '') + (typeof part === 'string' ? part : part.uri), ''); }
    get name() { return this.uri.split('/').at(-1); }
    create() { files.set(this.uri, ''); }
    write(data) { files.set(this.uri, data); }
    async text() { if (!files.has(this.uri)) throw Error('missing'); return files.get(this.uri); }
    async copy(destination) { if (!files.has(this.uri)) throw Error('missing'); files.set(destination.uri, files.get(this.uri)); }
    delete() { files.delete(this.uri); }
  }
  class Directory {
    constructor(...parts) { this.uri = parts.reduce((path, part) => path + (path && !path.endsWith('/') ? '/' : '') + (typeof part === 'string' ? part : part.uri), ''); }
    get exists() { return directories.has(this.uri); }
    create() { directories.add(this.uri); }
    list() { return [...files.keys()].filter((uri) => uri.startsWith(this.uri + '/')).map((uri) => new File(uri)); }
  }
  const asyncStorage = { getItem: async (k) => asyncValues.get(k) ?? null, setItem: async (k, v) => { if (failPointer && k.includes('cloud-v1')) throw Error('disk full'); asyncValues.set(k, v); } };
  const secure = { getItemAsync: async (k) => secretValues.get(k) ?? null, setItemAsync: async (k, v) => { secretValues.set(k, v); } };
  const fileSystem = { Directory, File, Paths: { document: { uri: 'file:///documents/' } } };
  const store = compile('src/config/store.ts', (name) => ({
    '@react-native-async-storage/async-storage': asyncStorage,
    'expo-file-system': fileSystem,
    'expo-secure-store': secure,
  }[name] || require(name)));
  assert.equal(await store.loadStoreId(), 'seabra-1');
  const syncModule = loadTs('src/services/cloudSync.ts');
  const load = () => compile('src/services/cloudStorage.ts', (name) => ({
    '@react-native-async-storage/async-storage': asyncStorage,
    'expo-secure-store': secure,
    'expo-crypto': { randomUUID: crypto.randomUUID },
    'expo-file-system': fileSystem,
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    'react-native-quick-crypto': { ...crypto, Buffer },
    './cloudSync': syncModule,
    '../config/auth': { ADMIN_CREDENTIAL_ENDPOINT: 'https://example.com/auth/admin' },
    '../config/store': store,
  }[name] || require(name)));
  const first = load();
  assert.equal(first.cloud.storeId(), 'seabra-1');
  assert.deepEqual(JSON.parse(await first.appStorage.getItem('@comandadigitalprint/orders')), original);
  const tabletId = first.cloud.identity();
  assert.equal(await first.cloud.get('language:' + tabletId), 'es');
  assert.equal((await first.cloud.get('printer:' + tabletId)).paperWidth, '58');
  assert.equal(await first.cloud.get('printer'), undefined);
  const fresh = { ...original[0], id: tabletId + '-' + crypto.randomUUID(), tabletId };
  await first.appStorage.setItem('@comandadigitalprint/orders', JSON.stringify([fresh, ...original])); await first.cloud.sync();
  assert.equal(first.cloud.pending('order:' + fresh.id), true);
  assert.ok([...files.values()].every((data) => !data.includes('Private Customer')));
  const backupPath = [...files.keys()].find((uri) => uri.includes('/comanda-local-backups/'));
  assert.ok(backupPath);
  files.delete(backupPath);
  await first.ensureLocalBackup();
  assert.equal([...files.keys()].filter((uri) => uri.includes('/comanda-local-backups/')).length, 1);
  const reference = asyncValues.get('@comandadigitalprint/cloud-v1');
  failPointer = true;
  const failed = { ...fresh, id: 'failed' };
  await assert.rejects(first.appStorage.setItem('@comandadigitalprint/orders', JSON.stringify([failed, fresh, ...original])));
  assert.equal(asyncValues.get('@comandadigitalprint/cloud-v1'), reference);
  assert.equal(files.size, 2);
  failPointer = false;
  const reopened = load();
  const restored = JSON.parse(await reopened.appStorage.getItem('@comandadigitalprint/orders'));
  assert.equal(restored.length, 2); assert.ok(!restored.some((o) => o.id === 'failed'));
  assert.equal(reopened.cloud.identity(), tabletId);
  assert.equal(reopened.cloud.pending('order:' + fresh.id), true);
  const target = JSON.parse(reference).file; const envelope = JSON.parse(files.get(target));
  envelope.tag = '00'.repeat(16); files.set(target, JSON.stringify(envelope));
  const recovered = load();
  assert.deepEqual(JSON.parse(await recovered.appStorage.getItem('@comandadigitalprint/orders')), restored);
  assert.equal(recovered.cloud.identity(), tabletId);
  assert.equal(recovered.cloud.pending('order:' + fresh.id), true);
  assert.notEqual(asyncValues.get('@comandadigitalprint/cloud-v1'), reference);
  // A lost AsyncStorage pointer also recovers without contacting the cloud.
  asyncValues.delete('@comandadigitalprint/cloud-v1');
  const fromFiles = load();
  assert.deepEqual(JSON.parse(await fromFiles.appStorage.getItem('@comandadigitalprint/orders')), restored);
  assert.equal(fromFiles.cloud.identity(), tabletId);
  // A damaged newest snapshot falls back to an older valid day.
  const currentBackup = [...files.keys()].find((uri) => uri.includes('/comanda-local-backups/'));
  const oldBackup = 'file:///documents/comanda-local-backups/backup-20200101-0000000000000-older.json';
  files.set(oldBackup, files.get(currentBackup));
  const currentPointer = JSON.parse(asyncValues.get('@comandadigitalprint/cloud-v1')).file;
  const damaged = JSON.parse(files.get(currentBackup)); damaged.tag = '00'.repeat(16);
  files.set(currentBackup, JSON.stringify(damaged)); files.set(currentPointer, JSON.stringify(damaged));
  assert.deepEqual(JSON.parse(await load().appStorage.getItem('@comandadigitalprint/orders')), restored);
  const guided = load(); await guided.cloud.load();
  files.set('file:///documents/comanda-local-backups/backup-20261004-' + String(Date.now() - 86400000).padStart(13, '0') + '-corrupt.json', 'invalid encrypted data');
  const verified = await guided.listVerifiedBackups();
  assert.ok(verified.some(backup => backup.valid && backup.orders === 2 && backup.pending >= 1));
  assert.ok(verified.some(backup => !backup.valid));
  const good = verified.find(backup => backup.valid);
  const pendingBefore = guided.cloud.pending('order:' + fresh.id);
  assert.equal(await guided.recoverLocalBackup(good.name), 0);
  assert.equal(guided.cloud.identity(), tabletId);
  assert.equal(guided.cloud.pending('order:' + fresh.id), pendingBefore);
  assert.ok([...files.keys()].some(uri => uri.includes('/recovery-')));
  assert.ok([...files.values()].every(data => !data.includes('Private Customer')));
  await assert.rejects(guided.recoverLocalBackup('../wrong.json'));
  // Without the SecureStore key, encrypted backups must never be overwritten by a new key.
  asyncValues.delete('@comandadigitalprint/cloud-v1'); secretValues.delete('comandadigitalprint.cloud-key.v1');
  await assert.rejects(load().appStorage.getItem('@comandadigitalprint/orders'));
});

test('a newly bound store uses separate encrypted state, key and backups', async () => {
  const values = new Map(), secrets = new Map(), files = new Map(), directories = new Set();
  const asyncStorage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const secure = { getItemAsync: async (key) => secrets.get(key) ?? null, setItemAsync: async (key, value) => { secrets.set(key, value); } };
  class File {
    constructor(...parts) { this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/').replace(/\/+/g, '/').replace('file:/', 'file:///'); }
    get name() { return this.uri.split('/').at(-1); }
    create() { files.set(this.uri, ''); }
    write(value) { files.set(this.uri, value); }
    async text() { if (!files.has(this.uri)) throw Error('missing'); return files.get(this.uri); }
    async copy(destination) { files.set(destination.uri, files.get(this.uri)); }
    delete() { files.delete(this.uri); }
  }
  class Directory {
    constructor(...parts) { this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/').replace(/\/+/g, '/').replace('file:/', 'file:///'); }
    get exists() { return directories.has(this.uri); }
    create() { directories.add(this.uri); }
    list() { return [...files.keys()].filter((uri) => uri.startsWith(this.uri + '/')).map((uri) => new File(uri)); }
  }
  const fileSystem = { File, Directory, Paths: { document: { uri: 'file:///documents' } } };
  const store = compile('src/config/store.ts', (name) => ({
    '@react-native-async-storage/async-storage': asyncStorage,
    'expo-file-system': fileSystem,
    'expo-secure-store': secure,
  }[name] || require(name)));
  assert.equal(await store.loadStoreId(), null);
  assert.equal(await store.bindStoreId('loja-2'), 'loja-2');
  await assert.rejects(store.bindStoreId('seabra-1'), /mismatch/);
  assert.equal(secrets.get('comandadigitalprint.store-id.v1'), 'loja-2');
  const syncModule = loadTs('src/services/cloudSync.ts');
  const storage = compile('src/services/cloudStorage.ts', (name) => ({
    '@react-native-async-storage/async-storage': asyncStorage,
    'expo-secure-store': secure,
    'expo-crypto': { randomUUID: crypto.randomUUID },
    'expo-file-system': fileSystem,
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    'react-native-quick-crypto': { ...crypto, Buffer },
    './cloudSync': syncModule,
    '../config/auth': { ADMIN_CREDENTIAL_ENDPOINT: 'https://example.com/auth/admin' },
    '../config/store': store,
  }[name] || require(name)));
  await storage.cloud.load();
  assert.equal(storage.cloud.storeId(), 'loja-2');
  assert.equal(await storage.appStorage.getItem('@comandadigitalprint/menu'), null);
  assert.equal(storage.cloud.pending('menu'), false);
  await storage.authStorage.setItemAsync('comandadigitalprint.credentials.v1', 'store-specific-credential');
  assert.equal(await storage.authStorage.getItemAsync('comandadigitalprint.credentials.v1'), 'store-specific-credential');
  assert.equal(secrets.get('comandadigitalprint.credentials.v1.loja-2'), 'store-specific-credential');
  assert.equal(secrets.has('comandadigitalprint.credentials.v1'), false);
  const tabletId = storage.cloud.identity();
  const order = { id: tabletId + '-' + crypto.randomUUID(), tabletId, createdAt: new Date().toISOString(), plate: '1', customer: 'Loja 2', items: [{ id: 'a', name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] };
  await storage.appStorage.setItem('@comandadigitalprint/orders', JSON.stringify([order]));
  assert.deepEqual(JSON.parse(await storage.appStorage.getItem('@comandadigitalprint/orders')), [order]);
  assert.ok(values.has('@comandadigitalprint/cloud-v1:loja-2'));
  assert.equal(values.has('@comandadigitalprint/cloud-v1'), false);
  assert.ok(secrets.has('comandadigitalprint.cloud-key.v1.loja-2'));
  assert.equal(secrets.has('comandadigitalprint.cloud-key.v1'), false);
  assert.ok([...files.keys()].some((path) => path.includes('/comanda-local-backups-loja-2/')));
  assert.equal([...files.keys()].some((path) => path.includes('/comanda-local-backups/')), false);
  values.delete('@comandadigitalprint/store-id-v1');
  const recoveredStore = compile('src/config/store.ts', (name) => ({
    '@react-native-async-storage/async-storage': asyncStorage,
    'expo-file-system': fileSystem,
    'expo-secure-store': secure,
  }[name] || require(name)));
  assert.equal(await recoveredStore.loadStoreId(), 'loja-2');
  assert.equal(values.get('@comandadigitalprint/store-id-v1'), 'loja-2');
  values.set('@comandadigitalprint/store-id-v1', 'seabra-1');
  const mismatchedStore = compile('src/config/store.ts', (name) => ({
    '@react-native-async-storage/async-storage': asyncStorage,
    'expo-file-system': fileSystem,
    'expo-secure-store': secure,
  }[name] || require(name)));
  await assert.rejects(mismatchedStore.loadStoreId(), /mismatch/);
});

test('legacy cache keeps pending orders during store migration and cannot be read as another store', async () => {
  const syncModule = loadTs('src/services/cloudSync.ts');
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const order = { id: 'old-order', createdAt: new Date().toISOString(), plate: '1', customer: 'Saved offline', items: [{ id: 'a', name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }] };
  const key = 'order:' + order.id;
  values.set('@comandadigitalprint/cloud-v1', JSON.stringify({
    version: 1, deviceId: crypto.randomUUID(), values: { [key]: { key, value: order, revision: 0 } },
    pending: { [key]: { key, value: order, base: 0, id: crypto.randomUUID() } }, cursor: 0, lastSync: null,
  }));
  const noFetch = async () => { throw Error('unexpected network request'); };
  const first = syncModule.createCloudSync(storage, 'https://example.com/cloud', crypto.randomUUID, async () => ({}), noFetch, 'seabra-1');
  await first.load();
  assert.equal(first.pending(key), true);
  assert.deepEqual(await first.get(key), order);
  assert.equal(JSON.parse(values.get('@comandadigitalprint/cloud-v1')).storeId, 'seabra-1');
  const second = syncModule.createCloudSync(storage, 'https://example.com/cloud', crypto.randomUUID, async () => ({}), noFetch, 'loja-2');
  await second.load();
  assert.deepEqual(await second.list('order:'), []);
  assert.equal(JSON.parse(values.get('@comandadigitalprint/cloud-v1:loja-2')).storeId, 'loja-2');
  await assert.rejects(second.setSession({ username: 'admin', token: 'token-from-seabra-1', storeId: 'seabra-1' }), (error) => error.code === 'STORE_MISMATCH');
});
