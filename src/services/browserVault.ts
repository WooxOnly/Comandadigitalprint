// Browser storage is scoped to the HTTPS origin, not an OS keychain. A
// non-extractable WebCrypto key protects persisted payloads at rest; scripts
// running on the same origin remain inside the browser's trust boundary.
type Envelope = { iv: Uint8Array; data: ArrayBuffer };
let database: Promise<IDBDatabase> | undefined;
let master: Promise<CryptoKey> | undefined;
function db(): Promise<IDBDatabase> {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.isSecureContext || !globalThis.indexedDB || !globalThis.crypto?.subtle) { reject(new Error('WEB_STORAGE_UNAVAILABLE')); return; }
    const request = indexedDB.open('bistrohub-web-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('keys'); request.result.createObjectStore('values'); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('WEB_STORAGE_BLOCKED'));
    request.onsuccess = () => { const value = request.result; value.onversionchange = () => { value.close(); database = undefined; master = undefined; }; resolve(value); };
  }).catch(error => { database = undefined; throw error; });
  return database;
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, 'readonly'), request = transaction.objectStore(store).get(key);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error || new Error('WEB_STORAGE_FAILED'));
    transaction.onerror = () => reject(transaction.error);
  });
}
async function key() {
  if (!master) master = (async () => {
    const existing = await read<CryptoKey>('keys', 'master'); if (existing) return existing;
    const candidate = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const database = await db();
    return new Promise<CryptoKey>((resolve, reject) => {
      const transaction = database.transaction(['keys', 'values'], 'readwrite'), store = transaction.objectStore('keys'), request = store.get('master'); let selected: CryptoKey;
      request.onsuccess = () => {
        selected = request.result || candidate;
        if (!request.result) {
          const count = transaction.objectStore('values').count();
          count.onsuccess = () => { if (count.result) transaction.abort(); else store.put(candidate, 'master'); };
        }
      };
      transaction.oncomplete = () => resolve(selected);
      transaction.onabort = () => reject(transaction.error || new Error('WEB_STORAGE_FAILED'));
      transaction.onerror = () => reject(transaction.error);
    });
  })().catch(error => { master = undefined; throw error; });
  return master;
}
export const browserVault = {
  async storeBinding() { return await read<string>('keys', 'store-binding') ?? null; },
  async bindStore(id: string) {
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('keys', 'readwrite'), store = transaction.objectStore('keys'), request = store.get('store-binding');
      request.onsuccess = () => { if (request.result && request.result !== id) transaction.abort(); else store.put(id, 'store-binding'); };
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(new Error('Store binding mismatch')); transaction.onerror = () => reject(transaction.error);
    });
  },
  async getItem(name: string): Promise<string | null> {
    const saved = await read<Envelope>('values', name); if (!saved) return null;
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: saved.iv as Uint8Array<ArrayBuffer>, additionalData: new TextEncoder().encode(name) }, await key(), saved.data);
    return new TextDecoder().decode(plain);
  },
  async setItem(name: string, value: string) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(name) }, await key(), new TextEncoder().encode(value));
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('values', 'readwrite'); transaction.objectStore('values').put({ iv, data }, name);
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error || new Error('WEB_STORAGE_FAILED')); transaction.onerror = () => reject(transaction.error);
    });
  },
  async keys(prefix: string) {
    const database = await db();
    return new Promise<string[]>((resolve, reject) => {
      const transaction = database.transaction('values', 'readonly'), request = transaction.objectStore('values').getAllKeys();
      transaction.oncomplete = () => resolve(request.result.filter((name): name is string => typeof name === 'string' && name.startsWith(prefix)));
      transaction.onabort = () => reject(transaction.error || new Error('WEB_STORAGE_FAILED')); transaction.onerror = () => reject(transaction.error);
    });
  },
  async removeItem(name: string) {
    const database = await db();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('values', 'readwrite'); transaction.objectStore('values').delete(name);
      transaction.oncomplete = () => resolve(); transaction.onabort = () => reject(transaction.error || new Error('WEB_STORAGE_FAILED')); transaction.onerror = () => reject(transaction.error);
    });
  },
};
