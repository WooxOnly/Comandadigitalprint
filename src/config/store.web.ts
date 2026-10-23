import { browserVault } from '../services/browserVault';
export const LEGACY_STORE_ID = 'seabra-1';
export const validStoreId = (id: string) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(id);
const configured = process.env.EXPO_PUBLIC_STORE_ID?.trim();
let current: string | null = null;
let binding: Promise<unknown> = Promise.resolve();
export async function loadStoreId(): Promise<string | null> {
  if (current) return current;
  const saved = await browserVault.storeBinding();
  if (saved !== null && (!validStoreId(saved) || (configured && configured !== saved))) throw Error('Store binding mismatch');
  current = saved; return current;
}
export function bindStoreId(id: string): Promise<string> {
  const next = binding.then(async () => {
    if (!validStoreId(id) || (configured && configured !== id)) throw Error('Store binding mismatch');
    const saved = await loadStoreId(); if (saved && saved !== id) throw Error('Store binding mismatch');
    await browserVault.bindStore(id); current = id; return id;
  }); binding = next.catch(() => {}); return next;
}
export function getStoreId() { if (!current) throw Error('Store not bound'); return current; }
