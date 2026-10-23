import { randomUUID } from 'expo-crypto';
import { AppState } from 'react-native';
import { browserVault } from './browserVault';
import { createCloudSync } from './cloudSync';
import { getStoreId, LEGACY_STORE_ID } from '../config/store';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';

const names: Record<string, string> = { '@comandadigitalprint/menu': 'menu', '@comandadigitalprint/language': 'language', '@comandadigitalprint/restaurant-logo': 'logo', '@comandadigitalprint/printer-settings': 'printer', '@comandadigitalprint/order-settings': 'order-settings' };
const ORDERS = '@comandadigitalprint/orders', USERS = 'comandadigitalprint.users.v1', USER = 'comandadigitalprint.user.';
const scope = (name: string) => `store:${getStoreId()}:${name}`;
const backupPrefix = () => scope('backup:');
const recoveryPrefix = () => scope('recovery:');
let backupError: (error: unknown) => void = () => {};
async function backup(value: string) {
  const date = new Date(), day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  await browserVault.setItem(backupPrefix() + day, JSON.stringify({ createdAt: date.toISOString(), value }));
  const entries = await browserVault.keys(backupPrefix());
  for (const name of entries.sort().reverse().slice(14)) await browserVault.removeItem(name);
}
const snapshots = {
  getItem: (name: string) => browserVault.getItem(scope(name)),
  async setItem(name: string, value: string) {
    await browserVault.setItem(scope(name), value);
    try { await backup(value); } catch (error) { backupError(error); }
  },
};
export const cloud = createCloudSync(snapshots, ADMIN_CREDENTIAL_ENDPOINT.replace('/auth/admin', '/cloud'), randomUUID, async () => ({}), fetch, getStoreId);
export const appStorage = {
  async getItem(name: string): Promise<string | null> {
    if (name === ORDERS) return JSON.stringify((await cloud.list('order:') as { createdAt: string }[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    const mapped = names[name]; if (!mapped) return browserVault.getItem(scope(name));
    const value = await cloud.get(['printer', 'language'].includes(mapped) ? mapped + ':' + await cloud.deviceId() : mapped) ?? (getStoreId() === LEGACY_STORE_ID ? await cloud.get(mapped) : undefined);
    if (value === undefined) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  },
  async setItem(name: string, value: string) {
    if (name === ORDERS) { const entries: Record<string, unknown> = {}; for (const order of JSON.parse(value)) entries['order:' + order.id] = order; await cloud.write(entries); return; }
    const mapped = names[name]; if (!mapped) { await browserVault.setItem(scope(name), value); return; }
    const target = ['printer', 'language'].includes(mapped) ? mapped + ':' + await cloud.deviceId() : mapped;
    await cloud.write({ [target]: ['language', 'logo'].includes(mapped) ? value : JSON.parse(value) });
  },
};
export const authStorage = {
  async getItemAsync(name: string): Promise<string | null> {
    if (name === USERS) return JSON.stringify((await cloud.list('user:') as { username: string }[]).map(user => user.username));
    if (name.startsWith(USER)) {
      const user = await cloud.get('user:' + name.slice(USER.length)); if (!user) return null;
      return JSON.stringify({ ...user, ...JSON.parse(await browserVault.getItem(scope(name + '.attempts')) || '{"attempts":0,"blockedUntil":0}') });
    }
    return browserVault.getItem(scope(name));
  },
  async setItemAsync(name: string, value: string) {
    if (name === USERS) return;
    if (name.startsWith(USER)) {
      const user = JSON.parse(value); await browserVault.setItem(scope(name + '.attempts'), JSON.stringify({ attempts: user.attempts, blockedUntil: user.blockedUntil }));
      await cloud.write({ ['user:' + user.username]: { username: user.username, active: user.active, role: user.role, ...(user.cancelPreorders !== undefined ? { cancelPreorders: user.cancelPreorders } : {}), ...(user.correctPreparation !== undefined ? { correctPreparation: user.correctPreparation } : {}), login: user.login } }); return;
    }
    await browserVault.setItem(scope(name), value);
  },
};
export async function ensureLocalBackup() {
  const key = getStoreId() === LEGACY_STORE_ID ? '@comandadigitalprint/cloud-v1' : '@comandadigitalprint/cloud-v1:' + getStoreId();
  const saved = await snapshots.getItem(key); if (saved) await backup(saved);
}
export function startLocalBackupScheduler(onError: (error: unknown) => void) {
  backupError = onError;
  const check = () => { if (AppState.currentState === 'active') void ensureLocalBackup().catch(onError); };
  check(); const interval = setInterval(check, 60000), listener = AppState.addEventListener('change', check);
  return () => { clearInterval(interval); listener.remove(); backupError = () => {}; };
}
export async function listVerifiedBackups() {
  await cloud.load(); const output = [];
  for (const name of [...await browserVault.keys(backupPrefix()), ...await browserVault.keys(recoveryPrefix())]) {
    try { const saved = JSON.parse((await browserVault.getItem(name))!); const info = cloud.inspectRecovery(JSON.parse(saved.value)); output.push({ name, createdAt: saved.createdAt as string, valid: true, ...info }); }
    catch { output.push({ name, createdAt: '', valid: false }); }
  }
  return output.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function recoverLocalBackup(name: string) {
  await cloud.load(); if (!cloud.allowed('restore')) throw Error('Usuário sem permissão para esta ação.');
  if (!name.startsWith(backupPrefix()) && !name.startsWith(recoveryPrefix())) throw Error('Backup inválido.');
  const saved = await browserVault.getItem(name); if (!saved) throw Error('Backup não encontrado.');
  const value = JSON.parse(JSON.parse(saved).value); cloud.inspectRecovery(value);
  // Capture the current state before the merge; do not overwrite the chosen copy.
  const current = await snapshots.getItem(getStoreId() === LEGACY_STORE_ID ? '@comandadigitalprint/cloud-v1' : '@comandadigitalprint/cloud-v1:' + getStoreId());
  if (current) await browserVault.setItem(recoveryPrefix() + Date.now(), JSON.stringify({ createdAt: new Date().toISOString(), value: current }));
  for (const name of (await browserVault.keys(recoveryPrefix())).sort().reverse().slice(14)) await browserVault.removeItem(name);
  const result = await cloud.restoreMissing(value); await cloud.sync(); return result;
}
