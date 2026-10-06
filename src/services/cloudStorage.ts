import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Buffer, createCipheriv, createDecipheriv, randomBytes } from 'react-native-quick-crypto';
import { hexToBytes } from '@noble/hashes/utils.js';
import { AppState } from 'react-native';
import { createCloudSync } from './cloudSync';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';
import { getStoreId, LEGACY_STORE_ID } from '../config/store';

const keyMap: Record<string, string> = {
  '@comandadigitalprint/menu': 'menu', '@comandadigitalprint/language': 'language',
  '@comandadigitalprint/restaurant-logo': 'logo', '@comandadigitalprint/printer-settings': 'printer',
  '@comandadigitalprint/order-settings': 'order-settings',
};
const ORDERS = '@comandadigitalprint/orders';
const USER_INDEX = 'comandadigitalprint.users.v1';
const USER_PREFIX = 'comandadigitalprint.user.';
const localAuthKey = (key: string) => getStoreId() === LEGACY_STORE_ID ? key : key + '.' + getStoreId();
const CLOUD_STATE_KEY = '@comandadigitalprint/cloud-v1';
const stateKey = () => getStoreId() === LEGACY_STORE_ID ? CLOUD_STATE_KEY : CLOUD_STATE_KEY + ':' + getStoreId();
const encryptionKeyName = () => getStoreId() === LEGACY_STORE_ID ? 'comandadigitalprint.cloud-key.v1' : 'comandadigitalprint.cloud-key.v1.' + getStoreId();
const cloudFilePrefix = () => getStoreId() === LEGACY_STORE_ID ? 'comanda-cloud-' : 'comanda-cloud-' + getStoreId() + '-';
const BACKUP_NAME = /^backup-(\d{8})-\d{13}-[\w-]+\.json$/;
const RECOVERY_NAME = /^recovery-(\d{8})-\d{13}-[\w-]+\.json$/;
const BACKUP_DAYS = 14;
let encryptionKey: Promise<Uint8Array> | undefined;
let reportBackupError: (error: unknown) => void = () => {};
function getKey() {
  if (!encryptionKey) encryptionKey = (async () => {
    const keyName = encryptionKeyName();
    const saved = await SecureStore.getItemAsync(keyName);
    if (saved) return hexToBytes(saved);
    // Never replace the key for data already on disk: that would make every backup unreadable.
    if (await AsyncStorage.getItem(stateKey()) || backupFiles().length) throw new Error('Local encryption key is missing');
    const key = randomBytes(32).toString('hex');
    await SecureStore.setItemAsync(keyName, key); return hexToBytes(key);
  })().catch((error) => { encryptionKey = undefined; throw error; });
  return encryptionKey;
}
async function decryptEnvelope(contents: string) {
  const envelope = JSON.parse(contents);
  const cipher = createDecipheriv('aes-256-gcm', await getKey(), hexToBytes(envelope.iv));
  cipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
  return cipher.update(envelope.data, 'hex', 'utf8') + cipher.final('utf8');
}
async function encryptValue(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', await getKey(), iv);
  const data = cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
  return JSON.stringify({ iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data });
}
function backupDirectory() { return new Directory(Paths.document, getStoreId() === LEGACY_STORE_ID ? 'comanda-local-backups' : 'comanda-local-backups-' + getStoreId()); }
function backupFiles() {
  const directory = backupDirectory();
  if (!directory.exists) return [];
  return directory.list().filter((entry): entry is File => entry instanceof File && (BACKUP_NAME.test(entry.name) || RECOVERY_NAME.test(entry.name))).sort((a, b) => Number(b.name.split('-')[2]) - Number(a.name.split('-')[2]));
}
function localDate() {
  const date = new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}
async function saveBackup(source: File) {
  const directory = backupDirectory();
  directory.create({ idempotent: true });
  const backup = new File(directory, `backup-${localDate()}-${String(Date.now()).padStart(13, '0')}-${randomUUID()}.json`);
  try {
    await source.copy(backup);
  } catch (error) {
    try { backup.delete(); } catch {}
    throw error;
  }
  // Keep the last complete copy for each of the most recent days.
  const seen = new Set<string>();
  for (const file of backupFiles().filter(file => BACKUP_NAME.test(file.name))) {
    const day = BACKUP_NAME.exec(file.name)![1];
    if (!seen.has(day) && seen.size < BACKUP_DAYS) { seen.add(day); continue; }
    file.delete();
  }
}
function validSnapshot(value: string) {
  const state = JSON.parse(value);
  return state?.version === 1 && typeof state.deviceId === 'string' && state.deviceId.length > 0
    && (state.storeId === getStoreId() || (getStoreId() === LEGACY_STORE_ID && state.storeId === undefined))
    && state.values && typeof state.values === 'object' && !Array.isArray(state.values)
    && state.pending && typeof state.pending === 'object' && !Array.isArray(state.pending)
    && Number.isSafeInteger(state.cursor) && state.cursor >= 0;
}
const encryptedStorage = {
  async getItem(key: string) {
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      try {
        const reference = JSON.parse(saved);
        return await decryptEnvelope(reference.file ? await new File(reference.file).text() : saved);
      } catch (error) {
        const recovered = await restoreBackup(key);
        if (recovered !== null) return recovered;
        throw error;
      }
    }
    return restoreBackup(key);
  },
  async setItem(key: string, value: string) {
    const previous = await AsyncStorage.getItem(key);
    const file = new File(Paths.document, cloudFilePrefix() + randomUUID() + '.json');
    try {
      file.create();
      file.write(await encryptValue(value));
      // Switch the small pointer only after the complete encrypted file is durable.
      await AsyncStorage.setItem(key, JSON.stringify({ file: file.uri }));
    } catch (error) { try { file.delete(); } catch {} throw error; }
    try { await saveBackup(file); } catch (error) { reportBackupError(error); }
    try {
      const old = previous ? JSON.parse(previous).file : null;
      if (typeof old === 'string' && old.startsWith(Paths.document.uri + cloudFilePrefix())) new File(old).delete();
    } catch { /* A stale encrypted file is safer than failing an already committed save. */ }
  },
};
async function restoreBackup(key: string): Promise<string | null> {
  if (key !== stateKey()) return null;
  for (const file of backupFiles()) {
    try {
      const recovered = await decryptEnvelope(await file.text());
      if (!validSnapshot(recovered)) continue;
      await encryptedStorage.setItem(key, recovered);
      return recovered;
    } catch { /* Try the next authenticated snapshot. */ }
  }
  return null;
}
export async function ensureLocalBackup() {
  if (backupFiles().some((file) => file.name.startsWith(`backup-${localDate()}-`))) return;
  const state = await encryptedStorage.getItem(stateKey());
  if (state === null) return;
  const file = new File(Paths.document, 'comanda-backup-source-' + (getStoreId() === LEGACY_STORE_ID ? '' : getStoreId() + '-') + randomUUID() + '.json');
  try {
    file.create(); file.write(await encryptValue(state));
    await saveBackup(file);
  } finally { try { file.delete(); } catch {} }
}
export function startLocalBackupScheduler(onError: (error: unknown) => void) {
  reportBackupError = onError;
  const check = () => { if (AppState.currentState === 'active') void ensureLocalBackup().catch(onError); };
  check();
  const interval = setInterval(check, 60000);
  const listener = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
  return () => { clearInterval(interval); listener.remove(); reportBackupError = () => {}; };
}
async function seed(storeId: string) {
  const data: Record<string, unknown> = {};
  if (storeId !== LEGACY_STORE_ID) return data;
  for (const [key, name] of Object.entries(keyMap)) {
    const saved = await AsyncStorage.getItem(key); if (saved === null) continue;
    if (name === 'logo') {
      if (saved.startsWith('data:image/')) data[name] = saved;
      else {
        try {
          const file = new File(saved);
          if (file.exists && file.size <= 500000) data[name] = 'data:' + (file.type || 'image/jpeg') + ';base64,' + await file.base64();
        } catch { /* Keep the old local image reference available until the owner replaces it. */ }
      }
    }
    else data[name] = name === 'language' ? saved : JSON.parse(saved);
  }
  const orders = JSON.parse(await AsyncStorage.getItem(ORDERS) || '[]');
  for (const order of orders) data['order:' + order.id] = order;
  const names = JSON.parse(await SecureStore.getItemAsync(USER_INDEX) || '[]');
  for (const name of names) {
    const user = JSON.parse(await SecureStore.getItemAsync(USER_PREFIX + name) || 'null');
    if (user) data['user:' + name] = { username: user.username, active: user.active, login: user.login };
  }
  return data;
}
export const cloud = createCloudSync(encryptedStorage, ADMIN_CREDENTIAL_ENDPOINT.replace('/auth/admin', '/cloud'), randomUUID, seed, fetch, getStoreId);
export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    if (key === ORDERS) return JSON.stringify((await cloud.list('order:') as { createdAt: string }[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const name = keyMap[key]; if (!name) return AsyncStorage.getItem(key);
    const value = await cloud.get(['printer', 'language'].includes(name) ? name + ':' + await cloud.deviceId() : name) ?? (getStoreId() === LEGACY_STORE_ID ? await cloud.get(name) : undefined);
    if (value === undefined) return name === 'logo' && getStoreId() === LEGACY_STORE_ID ? AsyncStorage.getItem(key) : null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  },
  async setItem(key: string, value: string) {
    if (key === ORDERS) { const entries: Record<string, unknown> = {}; for (const order of JSON.parse(value)) entries['order:' + order.id] = order; await cloud.write(entries); return; }
    const name = keyMap[key]; if (!name) return AsyncStorage.setItem(key, value);
    const target = ['printer', 'language'].includes(name) ? name + ':' + await cloud.deviceId() : name;
    await cloud.write({ [target]: ['language', 'logo'].includes(name) ? value : JSON.parse(value) });
  },
};
export const authStorage = {
  async getItemAsync(key: string) {
    if (key === USER_INDEX) return JSON.stringify((await cloud.list('user:') as { username: string }[]).map((u) => u.username));
    if (key.startsWith(USER_PREFIX)) {
      const user = await cloud.get('user:' + key.slice(USER_PREFIX.length));
      if (!user) return null;
      const attempts = JSON.parse(await SecureStore.getItemAsync(localAuthKey(key + '.attempts')) || '{"attempts":0,"blockedUntil":0}');
      return JSON.stringify({ ...user, ...attempts });
    }
    return SecureStore.getItemAsync(localAuthKey(key));
  },
  async setItemAsync(key: string, value: string) {
    if (key === USER_INDEX) return; // The encrypted user records are the index.
    if (key.startsWith(USER_PREFIX)) {
      const user = JSON.parse(value);
      await SecureStore.setItemAsync(localAuthKey(key + '.attempts'), JSON.stringify({ attempts: user.attempts, blockedUntil: user.blockedUntil }));
      await cloud.write({ ['user:' + user.username]: { username: user.username, active: user.active, login: user.login } });
      return;
    }
    await SecureStore.setItemAsync(localAuthKey(key), value);
  },
};

export async function listVerifiedBackups() {
  await cloud.load();
  const results: { name: string; createdAt: string; valid: boolean; records?: number; pending?: number; pendingCash?: boolean; orders?: number }[] = [];
  for (const file of backupFiles()) {
    const match = (BACKUP_NAME.exec(file.name) ?? RECOVERY_NAME.exec(file.name))!;
    const stamp = file.name.split('-')[2];
    try { const info = cloud.inspectRecovery(JSON.parse(await decryptEnvelope(await file.text()))); results.push({ name: file.name, createdAt: new Date(Number(stamp)).toISOString(), valid: true, records: info.records, pending: info.pending, pendingCash: info.pendingCash, orders: info.orders }); }
    catch { results.push({ name: file.name, createdAt: `${match[1].slice(0, 4)}-${match[1].slice(4, 6)}-${match[1].slice(6, 8)}`, valid: false }); }
  }
  return results;
}
export async function recoverLocalBackup(name: string) {
  await cloud.load();
  if (!BACKUP_NAME.test(name) && !RECOVERY_NAME.test(name)) throw new Error('Backup inválido.');
  if (!cloud.allowed('restore')) throw new Error('Usuário sem permissão para esta ação.');
  const file = backupFiles().find(entry => entry.name === name); if (!file) throw new Error('Backup não encontrado.');
  const value = JSON.parse(await decryptEnvelope(await file.text()));
  cloud.inspectRecovery(value);
  // Preserve a complete current snapshot before merging missing records.
  const saved = await encryptedStorage.getItem(stateKey());
  if (saved) {
    const directory = backupDirectory(); directory.create({ idempotent: true });
    const file = new File(directory, `recovery-${localDate()}-${String(Date.now()).padStart(13, '0')}-${randomUUID()}.json`);
    try { file.create(); file.write(await encryptValue(saved)); } catch (error) { try { file.delete(); } catch {} throw error; }
  }
  const recovered = await cloud.restoreMissing(value);
  await cloud.sync();
  for (const file of backupFiles().filter(file => RECOVERY_NAME.test(file.name)).slice(14)) file.delete();
  return recovered;
}
