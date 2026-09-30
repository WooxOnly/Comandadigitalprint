import { validCloudValue } from '../../shared/cloud-validation.mjs';

export type CloudRecord = { key: string; value: unknown; revision: number };
type Pending = { key: string; value: unknown; base: number; id: string; conflict?: CloudRecord };
type State = { version: 1; deviceId: string; reader?: string; values: Record<string, CloudRecord>; pending: Record<string, Pending>; cursor: number; lastSync: string | null };
type Store = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
type Session = { token: string; username: string };
const STATE_KEY = '@comandadigitalprint/cloud-v1';
export class CloudError extends Error {
  constructor(public code: string, public status = 0, public current?: CloudRecord) { super(code); }
}
export function createCloudSync(storage: Store, endpoint: string, uuid: () => string, seed: () => Promise<Record<string, unknown>>, fetcher: typeof fetch = fetch) {
  let state: State;
  let loading: Promise<void> | undefined;
  let lock: Promise<unknown> = Promise.resolve();
  let running: Promise<void> | undefined;
  let session: Session | null = null;
  let status = 'LOGIN_REQUIRED';
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => { try { listener(); } catch { /* Rendering must not fail a committed save. */ } });
  const serial = <T,>(action: () => Promise<T>) => {
    const next = lock.then(action); lock = next.catch(() => {}); return next;
  };
  async function persist(next: State) { await storage.setItem(STATE_KEY, JSON.stringify(next)); state = next; emit(); }
  async function load() {
    if (!loading) loading = serial(async () => {
      const saved = await storage.getItem(STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as State;
        if (parsed.version !== 1 || !parsed.values || !parsed.pending || !Number.isSafeInteger(parsed.cursor)) throw Error('Invalid cloud cache');
        if (typeof parsed.deviceId !== 'string') throw Error('Invalid tablet identity');
        state = parsed;
      } else {
        const deviceId = uuid(), values: State['values'] = {}, pending: State['pending'] = {};
        const initial = await seed();
        initial['device:' + deviceId] = { id: deviceId, name: 'Tablet ' + deviceId.slice(0, 8) };
        for (const [originalKey, value] of Object.entries(initial)) {
          const key = ['printer', 'language'].includes(originalKey) ? originalKey + ':' + deviceId : originalKey;
          if (!validCloudValue(key, value)) throw Error('Invalid local data: ' + key);
          values[key] = { key, value, revision: 0 }; pending[key] = { key, value, base: 0, id: uuid() };
        }
        await persist({ version: 1, deviceId, values, pending, cursor: 0, lastSync: null });
      }
    }).catch((error) => { loading = undefined; throw error; });
    await loading;
  }
  async function request(path: string, data?: unknown, authorization = session?.token) {
    if (!endpoint.startsWith('https://')) throw new CloudError('UNAVAILABLE');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetcher(endpoint + path, { method: data === undefined ? 'GET' : 'POST', signal: controller.signal, headers: { Accept: 'application/json', ...(authorization ? { Authorization: 'Bearer ' + authorization } : {}), ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      const result = await response.json();
      if (!response.ok) throw new CloudError(result.error || 'UNAVAILABLE', response.status, result.current);
      return result;
    } catch (error) { if (error instanceof CloudError) throw error; throw new CloudError('UNAVAILABLE'); }
    finally { clearTimeout(timer); }
  }
  async function write(entries: Record<string, unknown>) {
    await load();
    const changed = await serial(async () => {
      const values = { ...state.values }, pending = { ...state.pending };
      let changed = false;
      for (const [key, value] of Object.entries(entries)) {
        if (!validCloudValue(key, value)) throw new CloudError('INVALID_DATA');
        if (JSON.stringify(values[key]?.value) === JSON.stringify(value)) continue;
        if (key.startsWith('order:') && values[key]) throw new CloudError('IMMUTABLE_ORDER');
        const revision = values[key]?.revision || 0;
        changed = true;
        values[key] = { key, value, revision };
        pending[key] = { key, value, base: pending[key]?.base ?? revision, id: uuid(), ...(pending[key]?.conflict ? { conflict: pending[key].conflict } : {}) };
      }
      if (changed) await persist({ ...state, values, pending });
      return changed;
    });
    if (changed) void sync();
  }
  async function pull(token: string) {
    let more = true;
    while (more && session?.token === token) {
      const result = await request('/changes?after=' + state.cursor, undefined, token);
      if (!Array.isArray(result.changes) || !Number.isSafeInteger(result.cursor) || result.cursor < state.cursor || typeof result.more !== 'boolean') throw new CloudError('INVALID_DATA');
      await serial(async () => {
        if (session?.token !== token) return;
        const values = { ...state.values };
        for (const record of result.changes as CloudRecord[]) {
          if (!validCloudValue(record.key, record.value) || !Number.isSafeInteger(record.revision) || record.revision < 1) throw new CloudError('INVALID_DATA');
          if (!state.pending[record.key] && record.revision > (values[record.key]?.revision ?? 0)) values[record.key] = record;
        }
        await persist({ ...state, values, cursor: result.cursor });
      });
      more = result.more;
    }
  }
  function sync(): Promise<void> {
    if (running) return running;
    running = (async () => {
      await load();
      if (!session) { status = 'LOGIN_REQUIRED'; emit(); return; }
      const token = session.token, username = session.username;
      status = 'SYNCING'; emit();
      try {
        // Upload individual immutable orders: retries cannot duplicate an order.
        for (const sent of Object.values(state.pending)) {
          if (session?.token !== token) return;
          if (sent.conflict || (sent.key.startsWith('user:') && username !== 'admin' && sent.key !== 'user:' + username)) continue;
          try {
            const ack = await request('/change', { key: sent.key, value: sent.value, base: sent.base, id: sent.id }, token);
            if (!Number.isSafeInteger(ack.revision) || ack.revision < 1) throw new CloudError('INVALID_DATA');
            await serial(async () => {
              const current = state.pending[sent.key];
              if (!current) return;
              const pending = { ...state.pending }, values = { ...state.values };
              if (current.id === sent.id) { delete pending[sent.key]; values[sent.key] = { key: sent.key, value: sent.value, revision: ack.revision }; }
              else { pending[sent.key] = { ...current, base: ack.revision }; values[sent.key] = { ...values[sent.key], revision: ack.revision }; }
              await persist({ ...state, values, pending });
            });
          } catch (error) {
            if (error instanceof CloudError && error.code === 'CONFLICT' && error.current && validCloudValue(error.current.key, error.current.value)) {
              await serial(async () => {
                if (!state.pending[sent.key]) return;
                await persist({ ...state, pending: { ...state.pending, [sent.key]: { ...state.pending[sent.key], conflict: error.current } } });
              });
            } else throw error;
          }
        }
        await pull(token);
        if (session?.token !== token) return;
        await serial(() => persist({ ...state, lastSync: new Date().toISOString() }));
        status = Object.values(state.pending).some((p) => p.conflict) ? 'CONFLICT' : Object.keys(state.pending).length ? 'PENDING' : 'SYNCED';
      } catch (error) { status = error instanceof CloudError && error.status === 401 ? 'LOGIN_REQUIRED' : 'UNAVAILABLE'; }
      finally { emit(); }
    })().catch(() => { status = 'STORAGE_ERROR'; emit(); }).finally(() => { running = undefined; });
    return running;
  }
  return {
    load, write, sync,
    async sendDiagnostic(entry: unknown) { if (!session) throw new CloudError('LOGIN_REQUIRED'); return request('/diagnostics', entry); },
    identity() { if (!state) throw new Error('Storage not ready'); return state.deviceId; },
    async deviceId() { await load(); return state.deviceId; },
    async cacheUser(username: string, value: unknown, revision: number) {
      await load();
      const key = 'user:' + username;
      if (!validCloudValue(key, value) || !Number.isSafeInteger(revision)) throw new CloudError('INVALID_DATA');
      await serial(async () => {
        if (state.pending[key]) return;
        await persist({ ...state, values: { ...state.values, [key]: { key, value, revision } } });
      });
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    status() { return { status, pending: Object.keys(state?.pending || {}).length, lastSync: state?.lastSync, conflicts: Object.values(state?.pending || {}).filter((p) => p.conflict) }; },
    async get(key: string) { await load(); await lock; return state.values[key]?.value; },
    async list(prefix: string) { await load(); await lock; return Object.values(state.values).filter((r) => r.key.startsWith(prefix)).map((r) => r.value); },
    pending(key: string) { return !!state?.pending[key]; },
    async authenticate(username: string, password: string) { return request('/login', { username, password }, undefined); },
    async setSession(next: Session | null) {
      await load();
      const changed = state.reader !== next?.username;
      session = next;
      if (changed && next) await serial(() => persist({ ...state, reader: next.username, cursor: 0 }));
      if (!next) { status = 'LOGIN_REQUIRED'; emit(); }
    },
    async resolve(key: string, keepLocal: boolean) {
      await load();
      await serial(async () => {
        const item = state.pending[key]; if (!item?.conflict) return;
        const pending = { ...state.pending }, values = { ...state.values };
        if (keepLocal) {
          if (key.startsWith('order:')) {
            const value = { ...(item.value as object), id: uuid() }, nextKey = 'order:' + value.id;
            values[nextKey] = { key: nextKey, value, revision: 0 }; pending[nextKey] = { key: nextKey, value, base: 0, id: uuid() };
            values[key] = item.conflict; delete pending[key];
          } else pending[key] = { key, value: item.value, base: item.conflict.revision, id: uuid() };
        } else { values[key] = item.conflict; delete pending[key]; }
        await persist({ ...state, values, pending });
      });
      await sync();
    },
  };
}
