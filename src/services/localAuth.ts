import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

const KEY = 'comandadigitalprint.credentials.v1';
const ITERATIONS = 600000;
type Digest = { salt: string; hash: string; iterations?: number };
type Credentials = { version: 1; username: string; login: Digest; attempts: number; blockedUntil: number; week?: number; revision?: number };
type Storage = { getItemAsync: (key: string) => Promise<string | null>; setItemAsync: (key: string, value: string) => Promise<void> };
export const AUTH_STORAGE_ERROR = 'Não foi possível acessar o armazenamento seguro. Tente novamente.';
export const PASSWORD_ERROR = 'As senhas precisam ter pelo menos 8 caracteres e coincidir com a confirmação.';
export function validPasswords(password: string, confirmation: string) { return password.length >= 8 && password.length <= 128 && password === confirmation; }
async function digest(password: string, salt: string, iterations = ITERATIONS) {
  return bytesToHex(await pbkdf2Async(sha256, password, hexToBytes(salt), { c: iterations, dkLen: 32, asyncTick: 10 }));
}
function equal(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export function createLocalAuth(storage: Storage, randomBytes: (size: number) => Promise<Uint8Array>, now = Date.now) {
  let record: Credentials | null = null;
  let loaded = false;
  let busy = false;
  let signedIn = false;
  async function save(next: Credentials) {
    try { await storage.setItemAsync(KEY, JSON.stringify(next)); record = next; }
    catch { throw new Error(AUTH_STORAGE_ERROR); }
  }
  async function run<T>(action: () => Promise<T>) {
    if (busy) throw new Error('Salvando…');
    busy = true;
    try { return await action(); } finally { busy = false; }
  }
  async function makeDigest(password: string) {
    const salt = bytesToHex(await randomBytes(16));
    return { salt, hash: await digest(password, salt) };
  }
  return {
    async load() {
      return run(async () => {
        try {
          const stored = await storage.getItemAsync(KEY);
          const parsed = stored === null ? null : JSON.parse(stored);
          const validDigest = (value: Digest) => value && /^[a-f0-9]{32}$/.test(value.salt) && /^[a-f0-9]{64}$/.test(value.hash) && (value.iterations === undefined || value.iterations === 100000 || value.iterations === ITERATIONS);
          if (parsed && (parsed.version !== 1 || typeof parsed.username !== 'string' || !parsed.username.trim() || !validDigest(parsed.login) || !Number.isInteger(parsed.attempts) || parsed.attempts < 0 || !Number.isFinite(parsed.blockedUntil))) throw new Error();
          if (stored !== null && !parsed) throw new Error();
          record = parsed; loaded = true;
          return record !== null;
        } catch { loaded = false; throw new Error(AUTH_STORAGE_ERROR); }
      });
    },
    async setup(username: string, password: string, confirmation: string) {
      return run(async () => {
        if (!loaded || record) throw new Error(AUTH_STORAGE_ERROR);
        if (username.trim() !== 'admin') throw new Error('Informe um usuário.');
        if (!validPasswords(password, confirmation)) throw new Error(PASSWORD_ERROR);
        await save({ version: 1, username: username.trim(), login: await makeDigest(password), attempts: 0, blockedUntil: 0 });
        signedIn = true;
      });
    },
    async verify(kind: 'login' | 'settings', password: string, username = '') {
      return run(async () => {
        if (!loaded || !record || (kind === 'settings' && !signedIn)) throw new Error(AUTH_STORAGE_ERROR);
        if (record.blockedUntil > now()) throw new Error('Muitas tentativas. Aguarde um minuto.');
        const matches = kind === 'settings' ? equal(password, settingsAccessCode(new Date(now()))) : equal(await digest(password.slice(0, 129), record.login.salt, record.login.iterations), record.login.hash);
        if (!matches || (kind === 'login' && username.trim() !== record.username)) {
          const attempts = record.attempts + 1;
          await save({ ...record, attempts: attempts >= 5 ? 0 : attempts, blockedUntil: attempts >= 5 ? now() + 60000 : 0 });
          throw new Error(kind === 'login' ? 'Usuário ou senha incorretos.' : 'Senha incorreta.');
        }
        await save({ ...record, attempts: 0, blockedUntil: 0 });
        if (kind === 'login') signedIn = true;
      });
    },
    lockSettings() { /* UI gate clears its unlock state on blur/background. */ },
    logout() { signedIn = false; },
    async syncAdmin(endpoint: string, fetcher: typeof fetch = fetch) {
      if (!loaded || !endpoint) return false;
      if (!endpoint.startsWith('https://')) throw new Error('Invalid admin endpoint');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetcher(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error('Admin sync unavailable');
        const next = await response.json();
        const revision = next.revision ?? 0;
        if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid admin revision');
        if (next.username !== 'admin' || next.iterations !== 100000 || !Number.isInteger(next.week) || next.week < 0 || !/^[a-f0-9]{32}$/.test(next.salt) || !/^[a-f0-9]{64}$/.test(next.hash)) throw new Error('Invalid admin credential');
        return await run(async () => {
          if (record?.week !== undefined && (next.week < record.week || (next.week === record.week && revision <= (record.revision ?? 0)))) return false;
          await save({ version: 1, username: 'admin', login: { salt: next.salt, hash: next.hash, iterations: next.iterations }, week: next.week, revision, attempts: record?.attempts || 0, blockedUntil: record?.blockedUntil || 0 });
          return true;
        });
      } finally { clearTimeout(timeout); }
    },
  };
}

export function settingsAccessCode(date = new Date()) {
  return String(date.getMonth() + 1 + date.getDate() + date.getFullYear() + date.getHours());
}
