import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

export const LEGACY_STORE_ID = 'seabra-1';
const BINDING_KEY = '@comandadigitalprint/store-id-v1';
const SECURE_BINDING_KEY = 'comandadigitalprint.store-id.v1';
const LEGACY_STATE_KEY = '@comandadigitalprint/cloud-v1';
const LEGACY_KEYS = [
  '@comandadigitalprint/orders', '@comandadigitalprint/menu',
  '@comandadigitalprint/restaurant-logo', '@comandadigitalprint/printer-settings',
  '@comandadigitalprint/order-settings', '@comandadigitalprint/language',
];
const configuredStoreId = process.env.EXPO_PUBLIC_STORE_ID?.trim() || null;
export const validStoreId = (id: string) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(id);

if (configuredStoreId && !validStoreId(configuredStoreId)) throw new Error('Invalid configured store ID');

let activeStoreId: string | null = null;
let loading: Promise<string | null> | undefined;
let binding: Promise<unknown> = Promise.resolve();

async function hasLegacyData() {
  if (await AsyncStorage.getItem(LEGACY_STATE_KEY)) return true;
  const directory = new Directory(Paths.document, 'comanda-local-backups');
  if (directory.exists && directory.list().some((entry) => entry instanceof File && /^(?:backup|recovery)-\d{8}-\d{13}-[\w-]+\.json$/.test(entry.name))) return true;
  const values = await Promise.all(LEGACY_KEYS.map((key) => AsyncStorage.getItem(key)));
  if (values.some((value) => value !== null)) return true;
  return (await SecureStore.getItemAsync('comandadigitalprint.credentials.v1')) !== null
    || (await SecureStore.getItemAsync('comandadigitalprint.users.v1')) !== null;
}

export async function loadStoreId(): Promise<string | null> {
  if (activeStoreId) return activeStoreId;
  if (!loading) loading = (async () => {
    const saved = await AsyncStorage.getItem(BINDING_KEY);
    const secure = await SecureStore.getItemAsync(SECURE_BINDING_KEY);
    if (saved !== null && secure !== null && saved !== secure) throw new Error('Store binding mismatch');
    const existing = saved !== null ? saved : secure;
    if (existing !== null) {
      if (!validStoreId(existing) || (configuredStoreId && configuredStoreId !== existing)) throw new Error('Store binding mismatch');
      if (secure === null) await SecureStore.setItemAsync(SECURE_BINDING_KEY, existing);
      if (saved === null) await AsyncStorage.setItem(BINDING_KEY, existing);
      activeStoreId = existing;
      return existing;
    }
    if (await hasLegacyData()) {
      if (configuredStoreId && configuredStoreId !== LEGACY_STORE_ID) throw new Error('Store binding mismatch');
      await SecureStore.setItemAsync(SECURE_BINDING_KEY, LEGACY_STORE_ID);
      await AsyncStorage.setItem(BINDING_KEY, LEGACY_STORE_ID);
      activeStoreId = LEGACY_STORE_ID;
      return LEGACY_STORE_ID;
    }
    return null;
  })().catch((error) => { loading = undefined; throw error; });
  return loading;
}

export function bindStoreId(id: string): Promise<string> {
  const next = binding.then(async () => {
    if (!validStoreId(id)) throw new Error('Invalid store ID');
    if (configuredStoreId && configuredStoreId !== id) throw new Error('Store binding mismatch');
    const current = await loadStoreId();
    if (current) {
      if (current !== id) throw new Error('Store binding mismatch');
      return current;
    }
    const secure = await SecureStore.getItemAsync(SECURE_BINDING_KEY);
    if (secure !== null && secure !== id) throw new Error('Store binding mismatch');
    await SecureStore.setItemAsync(SECURE_BINDING_KEY, id);
    await AsyncStorage.setItem(BINDING_KEY, id);
    activeStoreId = id;
    return id;
  });
  binding = next.catch(() => {});
  return next;
}

export function getStoreId(): string {
  if (!activeStoreId) throw new Error('Store not bound');
  return activeStoreId;
}
