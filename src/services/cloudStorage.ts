import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { Buffer, createCipheriv, createDecipheriv, randomBytes } from 'react-native-quick-crypto';
import { hexToBytes } from '@noble/hashes/utils.js';
import { createCloudSync } from './cloudSync';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';

const keyMap: Record<string, string> = {
  '@comandadigitalprint/menu': 'menu', '@comandadigitalprint/language': 'language',
  '@comandadigitalprint/restaurant-logo': 'logo', '@comandadigitalprint/printer-settings': 'printer',
  '@comandadigitalprint/order-settings': 'order-settings',
};
const ORDERS = '@comandadigitalprint/orders';
const USER_INDEX = 'comandadigitalprint.users.v1';
const USER_PREFIX = 'comandadigitalprint.user.';
let encryptionKey: Promise<Uint8Array> | undefined;
function getKey() {
  if (!encryptionKey) encryptionKey = (async () => {
    const saved = await SecureStore.getItemAsync('comandadigitalprint.cloud-key.v1');
    if (saved) return hexToBytes(saved);
    const key = randomBytes(32).toString('hex');
    await SecureStore.setItemAsync('comandadigitalprint.cloud-key.v1', key); return hexToBytes(key);
  })().catch((error) => { encryptionKey = undefined; throw error; });
  return encryptionKey;
}
const encryptedStorage = {
  async getItem(key: string) {
    const saved = await AsyncStorage.getItem(key); if (!saved) return null;
    const reference = JSON.parse(saved);
    const envelope = reference.file ? JSON.parse(await new File(reference.file).text()) : reference;
    const cipher = createDecipheriv('aes-256-gcm', await getKey(), hexToBytes(envelope.iv));
    cipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
    return cipher.update(envelope.data, 'hex', 'utf8') + cipher.final('utf8');
  },
  async setItem(key: string, value: string) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', await getKey(), iv);
    const data = cipher.update(value, 'utf8', 'hex') + cipher.final('hex');
    const previous = await AsyncStorage.getItem(key);
    const file = new File(Paths.document, 'comanda-cloud-' + randomUUID() + '.json');
    try {
      file.create();
      file.write(JSON.stringify({ iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data }));
      // Switch the small pointer only after the complete encrypted file is durable.
      await AsyncStorage.setItem(key, JSON.stringify({ file: file.uri }));
    } catch (error) { try { file.delete(); } catch {} throw error; }
    try {
      const old = previous ? JSON.parse(previous).file : null;
      if (typeof old === 'string' && old.startsWith(Paths.document.uri + 'comanda-cloud-')) new File(old).delete();
    } catch { /* A stale encrypted file is safer than failing an already committed save. */ }
  },
};
async function seed() {
  const data: Record<string, unknown> = {};
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
export const cloud = createCloudSync(encryptedStorage, ADMIN_CREDENTIAL_ENDPOINT.replace('/auth/admin', '/cloud'), randomUUID, seed);
export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    if (key === ORDERS) return JSON.stringify((await cloud.list('order:') as { createdAt: string }[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const name = keyMap[key]; if (!name) return AsyncStorage.getItem(key);
    const value = await cloud.get(['printer', 'language'].includes(name) ? name + ':' + await cloud.deviceId() : name) ?? await cloud.get(name);
    if (value === undefined) return name === 'logo' ? AsyncStorage.getItem(key) : null;
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
      const attempts = JSON.parse(await SecureStore.getItemAsync(key + '.attempts') || '{"attempts":0,"blockedUntil":0}');
      return JSON.stringify({ ...user, ...attempts });
    }
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string) {
    if (key === USER_INDEX) return; // The encrypted user records are the index.
    if (key.startsWith(USER_PREFIX)) {
      const user = JSON.parse(value);
      await SecureStore.setItemAsync(key + '.attempts', JSON.stringify({ attempts: user.attempts, blockedUntil: user.blockedUntil }));
      await cloud.write({ ['user:' + user.username]: { username: user.username, active: user.active, login: user.login } });
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};
