import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import recoveryVerifier from '../config/offlineRecovery.json';

const KEY = 'comandadigitalprint.credentials.v1';
const ITERATIONS = 600000;
type Digest = { salt: string; hash: string; iterations?: number };
type Credentials = { version: 1; username: string; login: Digest; attempts: number; blockedUntil: number; week?: number; revision?: number };
type Storage = { getItemAsync: (key: string) => Promise<string | null>; setItemAsync: (key: string, value: string) => Promise<void> };
export const AUTH_STORAGE_ERROR = 'Não foi possível acessar o armazenamento seguro. Tente novamente.';
export const PASSWORD_ERROR = 'Use uma senha de 4 a 6 caracteres e confirme a mesma senha.';
export function validPasswords(password: string, confirmation: string) { return password.length >= 4 && password.length <= 6 && password === confirmation; }
async function digest(password: string, salt: string, iterations = ITERATIONS) {
  return bytesToHex(await pbkdf2Async(sha256, password, hexToBytes(salt), { c: iterations, dkLen: 32, asyncTick: 10 }));
}
function equal(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
export function createLocalAuth(storage: Storage, randomBytes: (size: number) => Promise<Uint8Array>, now = Date.now, derive: (password: string, salt: string, iterations: number) => Promise<string> = digest, recovery = recoveryVerifier) {
  let record: Credentials | null = null;
  let loaded = false;
  let busy = false;
  let signedIn = false;
  let currentUser = '';
  let settingsOpen = false;
  const USER_INDEX = 'comandadigitalprint.users.v1';
  type User = { username: string; active: boolean; login: Digest; attempts: number; blockedUntil: number };
  let users: User[] = [];
  const userKey = (username: string) => `comandadigitalprint.user.${username}`;
  const requireSettings = () => { if (!signedIn || !settingsOpen) throw new Error('Acesso protegido'); };
  async function saveUser(next: User) {
    await storage.setItemAsync(userKey(next.username), JSON.stringify(next));
    users = users.map((user) => user.username === next.username ? next : user);
  }
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
    return { salt, hash: await derive(password, salt, 100000), iterations: 100000 };
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
          const index = JSON.parse(await storage.getItemAsync(USER_INDEX) || '[]');
          if (!Array.isArray(index) || index.some((name) => typeof name !== 'string' || !/^[a-z0-9._-]{3,24}$/.test(name) || name === 'admin') || new Set(index).size !== index.length) throw new Error();
          users = await Promise.all(index.map(async (name) => {
            const user = JSON.parse(await storage.getItemAsync(userKey(name)) || 'null');
            if (!user || user.username !== name || typeof user.active !== 'boolean' || !validDigest(user.login) || !Number.isInteger(user.attempts) || user.attempts < 0 || !Number.isFinite(user.blockedUntil)) throw new Error();
            return user as User;
          }));
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
        currentUser = username.trim();
      });
    },
    async recoverOffline(code: string, password: string, confirmation: string) {
      return run(async () => {
        if (!loaded) throw new Error(AUTH_STORAGE_ERROR);
        if (record) throw new Error('O admin já está configurado. Use a senha de entrada.');
        if (!validPasswords(password, confirmation)) throw new Error(PASSWORD_ERROR);
        const attemptKey = 'comandadigitalprint.recovery-attempts.v1';
        let attempts: { count: number; blockedUntil: number };
        try {
          attempts = JSON.parse(await storage.getItemAsync(attemptKey) || '{"count":0,"blockedUntil":0}');
          if (!attempts || !Number.isInteger(attempts.count) || attempts.count < 0 || !Number.isFinite(attempts.blockedUntil)) throw new Error();
        } catch { throw new Error(AUTH_STORAGE_ERROR); }
        if (attempts.blockedUntil > now()) throw new Error('Muitas tentativas. Aguarde um minuto.');
        const normalized = code.toUpperCase().replace(/[\s-]/g, '');
        const valid = /^[A-HJ-NP-Z2-9]{16}$/.test(normalized) && equal(await derive(normalized, recovery.salt, recovery.iterations), recovery.hash);
        if (!valid) {
          const count = attempts.count + 1;
          await storage.setItemAsync(attemptKey, JSON.stringify({ count: count >= 5 ? 0 : count, blockedUntil: count >= 5 ? now() + 60000 : 0 }));
          throw new Error('Chave de recuperação incorreta.');
        }
        const login = await makeDigest(password);
        await storage.setItemAsync(attemptKey, '{"count":0,"blockedUntil":0}');
        await save({ version: 1, username: 'admin', login, attempts: 0, blockedUntil: 0 });
        signedIn = true; currentUser = 'admin'; settingsOpen = false;
      });
    },
    async verify(kind: 'login' | 'settings', password: string, username = '') {
      return run(async () => {
        if (!loaded || (kind === 'settings' && !signedIn)) throw new Error(AUTH_STORAGE_ERROR);
        const name = kind === 'settings' ? currentUser : username.trim().toLowerCase();
        const account = name === 'admin' ? record : users.find((user) => user.username === name && user.active);
        if (!account) throw new Error(name === 'admin' && !record ? 'Recupere o acesso do admin antes de entrar.' : 'Usuário ou senha incorretos.');
        if (account.blockedUntil > now()) throw new Error('Muitas tentativas. Aguarde um minuto.');
        const persist = async (attempts: number, blockedUntil: number) => name === 'admin' ? save({ ...record!, attempts, blockedUntil }) : saveUser({ ...account as User, attempts, blockedUntil });
        const matches = kind === 'settings' ? equal(password, settingsAccessCode(new Date(now()))) : password.length > 0 && password.length <= 128 && equal(await derive(password, account.login.salt, account.login.iterations ?? ITERATIONS), account.login.hash);
        if (!matches) {
          const attempts = account.attempts + 1;
          await persist(attempts >= 5 ? 0 : attempts, attempts >= 5 ? now() + 60000 : 0);
          throw new Error(kind === 'login' ? 'Usuário ou senha incorretos.' : 'Senha incorreta.');
        }
        await persist(0, 0);
        if (kind === 'login') { signedIn = true; currentUser = name; settingsOpen = false; }
        else settingsOpen = true;
      });
    },
    lockSettings() { settingsOpen = false; },
    logout() { signedIn = false; currentUser = ''; settingsOpen = false; },
    listUsers() { requireSettings(); return users.map(({ username, active }) => ({ username, active })); },
    async createUser(username: string, password: string, confirmation: string) {
      return run(async () => {
        requireSettings();
        const name = username.trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,24}$/.test(name) || name === 'admin') throw new Error('Use de 3 a 24 letras, números, ponto, hífen ou sublinhado. Admin é reservado.');
        if (users.some((user) => user.username === name)) throw new Error('Este usuário já existe.');
        if (users.length >= 30) throw new Error('Limite de 30 usuários neste aparelho.');
        if (!validPasswords(password, confirmation)) throw new Error(PASSWORD_ERROR);
        const user: User = { username: name, active: true, login: await makeDigest(password), attempts: 0, blockedUntil: 0 };
        requireSettings();
        await storage.setItemAsync(userKey(name), JSON.stringify(user));
        await storage.setItemAsync(USER_INDEX, JSON.stringify([...users.map((u) => u.username), name]));
        users = [...users, user];
      });
    },
    async updateUser(username: string, active: boolean, password?: string, confirmation?: string) {
      return run(async () => {
        requireSettings();
        const user = users.find((u) => u.username === username);
        if (!user) throw new Error('Usuário não encontrado.');
        if (!active && username === currentUser) throw new Error('Não é possível desativar o usuário conectado.');
        if (password !== undefined && !validPasswords(password, confirmation || '')) throw new Error(PASSWORD_ERROR);
        const login = password === undefined ? user.login : await makeDigest(password);
        requireSettings();
        await saveUser({ ...user, active, login, attempts: 0, blockedUntil: 0 });
      });
    },
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
