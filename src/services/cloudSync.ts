import { correctedPreparation } from '../../shared/preparation-correction.mjs';
import { appRole, roleAction, roleWrite, roleScreen } from '../../shared/app-roles.mjs';
import { inspectBackupSnapshot } from './backupRecovery';
import { DEFAULT_ACCESS, validAccess } from '../../shared/operations-validation.mjs';
import type { AccessAction, AccessSettings } from './access';
import { DEFAULT_STORE_MODULES, validStoreModules, type StoreModules, type CashOverview, type CashReport, type PreparationSettings, type Preparation, DEFAULT_PREPARATION_SETTINGS } from './business';
import { validCloudValue } from '../../shared/cloud-validation.mjs';

export type CloudRecord = { key: string; value: unknown; revision: number };
type Pending = { key: string; value: unknown; base: number; id: string; conflict?: CloudRecord };
type PreparationOperation = Pending & { offline?: { challenge: Record<string, any>; proof: Record<string, any> } };
type State = { preparationOperations?: PreparationOperation[]; preparationPrevious?: Record<string, Preparation>; preparationReview?: PreparationOperation[]; preparationCorrectionAttempt?: { id: string; orderId: string; base: number; status?: string; username?: string }; cancellationAttempt?: { id: string; orderId: string; base: number }; version: 1; operationsVersion?: 1; preparationSettings?: PreparationSettings; access?: AccessSettings; storeId: string; storeName?: string; modules?: StoreModules; cashOverview?: CashOverview; cashAttempt?: Record<string, unknown>; deviceId: string; tabletNumber?: number; reader?: string; values: Record<string, CloudRecord>; pending: Record<string, Pending>; cursor: number; lastSync: string | null };
type Store = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
type Session = { token: string; username: string; storeId: string };
const STATE_KEY = '@comandadigitalprint/cloud-v1';
const LEGACY_STORE_ID = 'seabra-1';
const stateKey = (storeId: string) => storeId === LEGACY_STORE_ID ? STATE_KEY : STATE_KEY + ':' + storeId;
export class CloudError extends Error {
  constructor(public code: string, public status = 0, public current?: CloudRecord) { super(code); }
}
export function createCloudSync(storage: Store, endpoint: string, uuid: () => string, seed: (storeId: string) => Promise<Record<string, unknown>>, fetcher: typeof fetch = fetch, selectedStore: string | (() => string) = LEGACY_STORE_ID) {
  let state: State;
  let offlineActor = '';
  const actor = () => session?.username || offlineActor || state?.reader || '';
  const roleOf = (username = actor()) => {const user=state?.values['user:' + username]?.value as { role?: string; active?: boolean; cancelPreorders?: boolean; correctPreparation?: boolean } | undefined;return user?.active===false ? null : appRole(username,user?.role)};
  const can = (action: AccessAction, username = actor()) => roleAction(roleOf(username), action);
  let rejectedSession = false;
  let loading: Promise<void> | undefined;
  let lock: Promise<unknown> = Promise.resolve();
  let running: Promise<void> | undefined;
  let session: Session | null = null;
  let status = 'LOGIN_REQUIRED';
  let received = 0;
  const listeners = new Set<() => void>();
  // Metadata/status updates retain values. Build each prefix selection once per
  // values snapshot; return copies so existing callers can safely sort them.
  let listedValues: State['values'] | undefined;
  const listed = new Map<string, unknown[]>();
  const emit = () => listeners.forEach((listener) => { try { listener(); } catch { /* Rendering must not fail a committed save. */ } });
  const serial = <T,>(action: () => Promise<T>) => {
    const next = lock.then(action); lock = next.catch(() => {}); return next;
  };
  function storeId() {
    const id = typeof selectedStore === 'function' ? selectedStore() : selectedStore;
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(id) || (state && state.storeId !== id)) throw new CloudError('STORE_MISMATCH');
    return id;
  }
  async function persist(next: State) {
    if (next.storeId !== storeId()) throw new CloudError('STORE_MISMATCH');
    await storage.setItem(stateKey(next.storeId), JSON.stringify(next)); state = next; emit();
  }
  async function load() {
    if (!loading) loading = serial(async () => {
      const id = storeId();
      const saved = await storage.getItem(stateKey(id));
      if (saved) {
        const parsed = JSON.parse(saved) as State & { storeId?: string };
        if (parsed.version !== 1 || !parsed.values || !parsed.pending || !Number.isSafeInteger(parsed.cursor)) throw Error('Invalid cloud cache');
        if (typeof parsed.deviceId !== 'string') throw Error('Invalid tablet identity');
        if (parsed.storeId !== id && !(id === LEGACY_STORE_ID && parsed.storeId === undefined)) throw new CloudError('STORE_MISMATCH');
        state = { ...parsed, operationsVersion: 1, cursor: parsed.operationsVersion === 1 ? parsed.cursor : 0, storeId: id, modules: { ...DEFAULT_STORE_MODULES, ...parsed.modules } };
        if (parsed.storeId === undefined || parsed.operationsVersion !== 1) await persist(state);
      } else {
        const deviceId = uuid(), values: State['values'] = {}, pending: State['pending'] = {};
        const initial = await seed(id);
        initial['device:' + deviceId] = { id: deviceId, name: 'Tablet ' + deviceId.slice(0, 8) };
        for (const [originalKey, value] of Object.entries(initial)) {
          const key = ['printer', 'language'].includes(originalKey) ? originalKey + ':' + deviceId : originalKey;
          if (!validCloudValue(key, value)) throw Error('Invalid local data: ' + key);
          values[key] = { key, value, revision: 0 }; pending[key] = { key, value, base: 0, id: uuid() };
        }
        await persist({ version: 1, operationsVersion: 1, storeId: id, deviceId, values, pending, cursor: 0, lastSync: null });
      }
    }).catch((error) => { loading = undefined; throw error; });
    await loading;
  }
  async function request(path: string, data?: unknown, authorization = session?.token) {
    const id = storeId();
    if (authorization && session?.token === authorization && session.storeId !== id) throw new CloudError('STORE_MISMATCH');
    if (!endpoint.startsWith('https://')) throw new CloudError('UNAVAILABLE');
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Some browser/network stacks do not promptly reject after abort. Bound
    // both the response headers and JSON body, without leaving sync locked.
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new CloudError('UNAVAILABLE')); }, 8000);
    });
    try {
      return await Promise.race([timeout, (async () => {
        const response = await fetcher(endpoint + path, { method: data === undefined ? 'GET' : 'POST', signal: controller.signal, headers: { Accept: 'application/json', ...(authorization ? { Authorization: 'Bearer ' + authorization } : {}), ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
        const result = await response.json();
        if (!response.ok) throw new CloudError(result.error || 'UNAVAILABLE', response.status, result.current);
        return result;
      })()]);
    } catch (error) { if (error instanceof CloudError) throw error; throw new CloudError('UNAVAILABLE'); }
    finally { clearTimeout(timer); }
  }

  async function write(entries: Record<string, unknown>) {
    await load();
    const changed = await serial(async () => {
      const values = { ...state.values }, pending = { ...state.pending }, preparationPrevious = { ...state.preparationPrevious };
      let changed = false;
      for (const [key, value] of Object.entries(entries)) {
        if (!validCloudValue(key, value)) throw new CloudError('INVALID_DATA');
        if (JSON.stringify(values[key]?.value) === JSON.stringify(value)) continue;
        const previous = values[key]?.value as { role?: string; active?: boolean; cancelPreorders?: boolean; correctPreparation?: boolean } | undefined, nextUser = value as { role?: string; active?: boolean; cancelPreorders?: boolean; correctPreparation?: boolean };
        const ownPassword = key === 'user:' + actor() && !!previous && previous.active === nextUser.active && (previous.cancelPreorders === true) === (nextUser.cancelPreorders === true) && (previous.correctPreparation === true) === (nextUser.correctPreparation === true) && appRole(actor(),previous.role) === appRole(actor(),nextUser.role);
        if (!ownPassword && !roleWrite(roleOf(),key,value)) throw new CloudError('ACCESS_DENIED');
        if ((key === 'menu' || key.startsWith('product-option:')) && !can('menu')) throw new CloudError('ACCESS_DENIED');
        if ((['printer', 'order-settings', 'logo'].includes(key) || key.startsWith('printer:')) && !can('settings')) throw new CloudError('ACCESS_DENIED');
        if (key.startsWith('activity:') && ['reprint', 'restore'].includes((value as { kind: string }).kind) && !can((value as { kind: AccessAction }).kind)) throw new CloudError('ACCESS_DENIED');
        if (key.startsWith('preparation:') && JSON.stringify((value as { correction?: unknown }).correction) !== JSON.stringify((values[key]?.value as { correction?: unknown } | undefined)?.correction)) throw new CloudError('PREPARATION_AUTH_REQUIRED');
        if (key.startsWith('preparation:') && !state.modules?.preparation) throw new CloudError('MODULE_DISABLED');
        if (key.startsWith('customer:') && !state.modules?.customers) throw new CloudError('MODULE_DISABLED');
        if (key.startsWith('preorder:') && ((value as { status?: string }).status === 'cancelled' || JSON.stringify((value as { cancellation?: unknown }).cancellation) !== JSON.stringify((values[key]?.value as { cancellation?: unknown } | undefined)?.cancellation))) throw new CloudError('CANCELLATION_AUTH_REQUIRED');
        if (key.startsWith('preorder:') && !state.modules?.preorders) throw new CloudError('MODULE_DISABLED');
        if (key === 'menu' && state.modules?.cash && !['admin','manager'].includes(roleOf() || '')) {
          const menu = (state.values.menu?.value ?? []) as { id: string; price: number }[];
          if ((value as { id: string; price: number }[]).some(product => !menu.some(previous => previous.id === product.id && previous.price === product.price))) throw new CloudError('MANAGER_REQUIRED');
        }
        if (JSON.stringify(values[key]?.value) === JSON.stringify(value)) continue;
        if (key.startsWith('order:') && values[key]) throw new CloudError('IMMUTABLE_ORDER');
        if (key.startsWith('preparation:')) { const record = value as Preparation; preparationPrevious[key] = values[key]?.value as Preparation ?? {orderId:record.orderId,status:'received',updatedAt:record.updatedAt}; }
        const revision = values[key]?.revision || 0;
        changed = true;
        values[key] = { key, value, revision };
        pending[key] = { key, value, base: pending[key]?.base ?? revision, id: uuid(), ...(pending[key]?.conflict ? { conflict: pending[key].conflict } : {}) };
      }
      if (changed) await persist({ ...state, values, pending, preparationPrevious });
      return changed;
    });
    if (changed) void sync();
  }
  async function pull(token: string) {
    let more = true;
    while (more && session?.token === token) {
      // Coalesce up to ten API pages before encrypting, saving and backing up
      // the whole cache. The durable cursor advances with the saved records.
      let cursor = state.cursor;
      const result: { changes: CloudRecord[]; userProfiles: any[]; cursor: number; more: boolean } = { changes: [], userProfiles: [], cursor, more: true };
      for (let page = 0; page < 10 && result.more; page++) {
        const batch = await request('/changes?after=' + cursor + '&features=operations-v1&offlineProfiles=1', undefined, token);
        if (session?.token !== token) return;
        if (!Array.isArray(batch.changes) || !Number.isSafeInteger(batch.cursor) || batch.cursor < cursor || typeof batch.more !== 'boolean' || (batch.more && batch.cursor === cursor)) throw new CloudError('INVALID_DATA');
        result.changes.push(...batch.changes);
        result.userProfiles.push(...(batch.userProfiles || []));
        cursor = result.cursor = batch.cursor;
        result.more = batch.more;
      }
      await serial(async () => {
        if (session?.token !== token) return;
        let values = state.values;
        for (const record of result.changes as CloudRecord[]) {
          if (!validCloudValue(record.key, record.value) || !Number.isSafeInteger(record.revision) || record.revision < 1) throw new CloudError('INVALID_DATA');
          if (!state.pending[record.key] && !state.preparationOperations?.some(item=>item.key===record.key) && record.revision > (values[record.key]?.revision ?? 0)) {
            if (values === state.values) values = { ...values };
            values[record.key] = record;
          }
        }
        for(const profile of result.userProfiles||[]) {
          const cached=values[profile.key];if(!cached||state.pending[profile.key]||!Number.isSafeInteger(profile.revision)||profile.revision<=cached.revision)continue;
          const value={...(cached.value as object),...profile.value};
          if(!profile.key.startsWith('user:')||!validCloudValue(profile.key,value))throw new CloudError('INVALID_DATA');
          if (values === state.values) values = { ...values };
          values[profile.key]={key:profile.key,value,revision:profile.revision};
        }
        const attempt = state.cancellationAttempt;
        const terminal = attempt && ['cancelled', 'completed'].includes((values['preorder:' + attempt.orderId]?.value as { status?: string })?.status || '');
        const correctionAttempt = state.preparationCorrectionAttempt;
        const corrected = correctionAttempt && (values['preparation:' + correctionAttempt.orderId]?.value as { correction?: { id?: string } })?.correction?.id === correctionAttempt.id;
        if (values !== state.values || result.cursor !== state.cursor || terminal || corrected) {
          await persist({ ...state, values, cursor: result.cursor, ...(terminal ? { cancellationAttempt: undefined } : {}), ...(corrected ? { preparationCorrectionAttempt: undefined } : {}) });
        }
      });
      received += result.changes.length;
      emit();
      more = result.more;
    }
  }
  async function flushPreparationOperations(token: string) {
    const blocked = new Set<string>();
    for (const snapshot of state.preparationOperations || []) {
      const sent = state.preparationOperations?.find(value=>value.id===snapshot.id); if (!sent) continue;
      if (session?.token !== token) return;
      if (blocked.has(sent.key) || sent.conflict || state.pending['order:'+(sent.value as Preparation).orderId]) { blocked.add(sent.key); continue; }
      try {
        const response = sent.offline ? await request('/preparation/correct',{id:sent.id,orderId:(sent.value as Preparation).orderId,base:sent.base,offline:sent.offline},token) : await request('/change',{id:sent.id,key:sent.key,value:sent.value,base:sent.base},token);
        const revision = sent.offline ? response.record?.revision : response.revision;
        if (!Number.isSafeInteger(revision) || revision<1) throw new CloudError('INVALID_DATA');
        await serial(async()=>{
          const queue = (state.preparationOperations||[]).filter(value=>value.id!==sent.id).map(value=>value.key===sent.key?{...value,base:revision}:value);
          const pending = {...state.pending}; if(pending[sent.key])pending[sent.key]={...pending[sent.key],base:revision};
          const values = {...state.values};if(values[sent.key])values[sent.key]={...values[sent.key],revision};
          await persist({...state,preparationOperations:queue,pending,values});
        });
      } catch(error) {
        if(error instanceof CloudError && error.status===409 && error.current && validCloudValue(error.current.key,error.current.value)) {
          await serial(()=>persist({...state,preparationOperations:(state.preparationOperations||[]).map(value=>value.id===sent.id?{...value,conflict:error.current}:value)}));blocked.add(sent.key);
        } else throw error;
      }
    }
  }
  function sync(): Promise<void> {
    if (running) return running;
    running = (async () => {
      await load();
      if (!session) { status = 'LOGIN_REQUIRED'; emit(); return; }
      if (session.storeId !== storeId()) throw new CloudError('STORE_MISMATCH');
      const token = session.token, username = session.username;
      received = 0; status = 'SYNCING'; emit();
      try {
        const store = await request('/store?storeId=' + encodeURIComponent(storeId()) + '&moduleVersion=3', undefined, token);
        if (store.storeId !== storeId() || typeof store.name !== 'string' || !store.name.trim() || store.name.length > 80 || (store.modules !== undefined && !validStoreModules(store.modules))) throw new CloudError('INVALID_DATA');
        await serial(async () => {
          const modules = { ...DEFAULT_STORE_MODULES, ...store.modules };
          if (state.storeName !== store.name || JSON.stringify(state.modules) !== JSON.stringify(modules)) await persist({ ...state, storeName: store.name, modules });
        });
        try { const access = await request('/access', undefined, token); if (!validAccess(access)) throw new CloudError('INVALID_DATA'); await serial(async () => { if (JSON.stringify(state.access) !== JSON.stringify(access)) await persist({ ...state, access }); }); } catch (error) { if (!(error instanceof CloudError) || error.status !== 404) throw error; }
        let kitchen = DEFAULT_PREPARATION_SETTINGS;
        if (state.modules?.preparation) {
          const value = await request('/preparation-settings', undefined, token);
          if (!value || typeof value.allowReprint !== 'boolean' || (value.useFinishButton !== undefined && typeof value.useFinishButton !== 'boolean')) throw new CloudError('INVALID_DATA');
          kitchen = { allowReprint: value.allowReprint, useFinishButton: value.useFinishButton !== false };
        }
        await serial(async () => { if (JSON.stringify(state.preparationSettings) !== JSON.stringify(kitchen)) await persist({ ...state, preparationSettings: kitchen }); });
        // Upload individual immutable orders: retries cannot duplicate an order.
        const preparationFollowups = new Set((state.preparationOperations || []).map(item => item.key));
        for (let preparationPass=0;preparationPass<2;preparationPass++) {
        for (const sent of Object.values(state.pending)) {
          if (preparationPass === 1 && !preparationFollowups.has(sent.key)) continue;
          if (session?.token !== token) return;
          if (state.preparationOperations?.some(item=>item.key===sent.key)) continue;
          if (!sent.key.startsWith('user:') && !roleWrite(roleOf(),sent.key,sent.value)) continue;
          if (sent.key.startsWith('activity:') && ['reprint', 'restore'].includes((sent.value as { kind: string }).kind) && !can((sent.value as { kind: AccessAction }).kind)) continue;
          if ((sent.key === 'menu' || sent.key.startsWith('product-option:')) && !can('menu')) continue;
          if ((['printer', 'order-settings', 'logo'].includes(sent.key) || sent.key.startsWith('printer:')) && !can('settings')) continue;
          if (sent.key.startsWith('preparation:') && (!state.modules?.preparation || state.pending['order:' + (sent.value as { orderId: string }).orderId])) continue;
          if (((sent.key.startsWith('preorder:') && !state.modules?.preorders) || (sent.key.startsWith('customer:') && !state.modules?.customers)) || sent.conflict || (sent.key.startsWith('user:') && roleOf() !== 'admin' && sent.key !== 'user:' + username)) continue;
          if (sent.key.startsWith('preorder:') && (sent.value as { customerId?: string }).customerId) {
            const linkedId = (sent.value as { customerId: string }).customerId;
            // A disabled/conflicted customer must not block independent kitchen
            // writes. Preserve the linked preorder until its customer can sync.
            if (sent.base === 0 && (!state.modules?.customers || (state.pending['customer:' + linkedId] && !state.values['customer:' + linkedId]?.revision))) continue;
          }
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
        await flushPreparationOperations(token);
        }
        if (!state.tabletNumber) {
          const assigned = await request('/tablet-number', { deviceId: state.deviceId }, token);
          if (!Number.isSafeInteger(assigned.number) || assigned.number < 1) throw new CloudError('INVALID_DATA');
          await serial(() => persist({ ...state, tabletNumber: assigned.number }));
        }
        await pull(token);
        if (session?.token !== token) return;
        if (state.modules?.cash && roleScreen(roleOf(),'cash')) {
          await serial(async () => {
            const overview = await request('/cash?deviceId=' + encodeURIComponent(state.deviceId), undefined, token);
            if (!Array.isArray(overview.sessions) || !Array.isArray(overview.entries)) throw new CloudError('INVALID_DATA');
            if (session?.token === token && JSON.stringify(state.cashOverview) !== JSON.stringify(overview)) await persist({ ...state, cashOverview: overview });
          });
        }
        await serial(() => persist({ ...state, lastSync: new Date().toISOString() }));
        status = [...Object.values(state.pending),...(state.preparationOperations||[])].some((p) => p.conflict) ? 'CONFLICT' : Object.keys(state.pending).length || state.preparationOperations?.length ? 'PENDING' : 'SYNCED';
      } catch (error) {
        // An older request may finish after logout or a different login.
        if (session?.token !== token) return;
        if (error instanceof CloudError && error.status === 401) rejectedSession = true;
        status = error instanceof CloudError && error.status === 401 ? 'LOGIN_REQUIRED' : 'UNAVAILABLE';
      }
      finally { emit(); }
    })().catch(() => { status = 'STORAGE_ERROR'; emit(); }).finally(() => { running = undefined; });
    return running;
  }
  return {
    load, write, sync,
    storeId,
    setOfflineActor(username: string) { offlineActor = username; },
    access() { return state?.access ?? DEFAULT_ACCESS as AccessSettings; },
    role: roleOf,
    sessionRejected() { return rejectedSession; },
    allowed(action: AccessAction, username = actor()) { return can(action, username); },
    async activity(kind: 'print' | 'reprint' | 'restore', target: string, details = '') { const id = uuid(); await write({ ['activity:' + id]: { id, kind, target, details, createdAt: new Date().toISOString() } }); },
    preparationSettings() { return state?.preparationSettings ?? DEFAULT_PREPARATION_SETTINGS; },
    async authorizePreparationReprint(orderId: string) {
      if (!session) throw new Error('Entre na nuvem para reimprimir pelo painel de preparo.');
      try { const response = await request('/preparation-reprint', { orderId }); if (response.allowed !== true) throw new CloudError('INVALID_DATA'); }
      catch (error) {
        if (error instanceof CloudError && error.status === 401) throw new Error('Entre na nuvem para reimprimir pelo painel de preparo.');
        if (error instanceof CloudError && error.code === 'ORDER_NOT_FOUND') throw new Error('Pedido não encontrado.');
        if (error instanceof CloudError && ['PREPARATION_REPRINT_DISABLED', 'MODULE_DISABLED'].includes(error.code)) throw new Error('Reimpressão no preparo não habilitada para esta loja.');
        if (error instanceof CloudError && error.code === 'ACCESS_DENIED') throw new Error('Usuário sem permissão para esta ação.');
        throw new Error('Não foi possível autorizar a reimpressão. Confira a conexão e as permissões.');
      }
    },
    async onlineInbox() { await load(); if (!session) throw new CloudError('LOGIN_REQUIRED'); return request('/online'); },
    async onlineDecision(id: string, status: 'accepted' | 'declined') { await load(); if (!session) throw new CloudError('LOGIN_REQUIRED'); return request('/online/decision', { id, status }); },
    modules() { return state?.modules ?? DEFAULT_STORE_MODULES; },
    cashOverview() { return state?.cashOverview ?? null; },
    pendingCashCommand() { return state?.cashAttempt ?? null; },
    inspectRecovery(input: unknown) { return inspectBackupSnapshot(input, storeId(), state?.deviceId); },
    async restoreMissing(input: unknown) {
      await load(); if (running) await running;
      return serial(async () => {
        if (!can('restore')) throw new CloudError('ACCESS_DENIED');
        const { snapshot } = inspectBackupSnapshot(input, storeId(), state.deviceId);
        if (state.cashAttempt && JSON.stringify(state.cashAttempt) !== JSON.stringify(snapshot.cashAttempt)) throw new CloudError('CASH_PENDING');
        const values = { ...state.values }, pending = { ...state.pending }; let recovered = 0;
        for (const [key, row] of Object.entries(snapshot.values)) { if (values[key]) continue; values[key] = row; if (snapshot.pending[key]) pending[key] = snapshot.pending[key]; recovered++; }
        const id = uuid(), key = 'activity:' + id, activity = { id, kind: 'restore', target: state.deviceId, details: `Registros recuperados: ${recovered}`, createdAt: new Date().toISOString() };
        values[key] = { key, value: activity, revision: 0 }; pending[key] = { key, value: activity, base: 0, id: uuid() };
        await persist({ ...state, values, pending, cursor: 0, cashAttempt: state.cashAttempt ?? snapshot.cashAttempt });
        return recovered;
      });
    },
    async recoverFromCloud() {
      await load(); if (!session) throw new CloudError('LOGIN_REQUIRED');
      if (!can('restore')) throw new CloudError('ACCESS_DENIED');
      if (running) await running;
      await serial(() => persist({ ...state, cursor: 0 }));
      await sync();
      if (['UNAVAILABLE', 'STORAGE_ERROR', 'LOGIN_REQUIRED'].includes(status)) throw new CloudError(status);
      await this.activity('restore', state.deviceId, 'Releitura completa dos dados da empresa na nuvem');
    },
    async customerHistory(customerId: string) {
      await load(); if (!roleScreen(roleOf(),'customers')) throw new CloudError('ACCESS_DENIED'); if (!session) throw new CloudError('LOGIN_REQUIRED');
      return request('/customers/history?' + new URLSearchParams({ customerId }));
    },
    async cashReport(start: string, end: string, timeZone: string) {
      await load(); if (!roleScreen(roleOf(),'cash-reports')) throw new CloudError('ACCESS_DENIED');
      if (!session) throw new CloudError('LOGIN_REQUIRED');
      const result = await request('/cash/report?' + new URLSearchParams({ start, end, timeZone }));
      if (result.storeId !== storeId() || !Array.isArray(result.days) || !Array.isArray(result.products) || !Array.isArray(result.methods) || !Array.isArray(result.closings) || !Array.isArray(result.movements) || !result.totals) throw new CloudError('INVALID_DATA');
      return result as CashReport;
    },
    async preparationCorrectionUsers(): Promise<{ users: { username: string; role: string }[] }> {
      await load(); if (!session) throw new CloudError('LOGIN_REQUIRED');
      if (!roleScreen(roleOf(), 'preparation') || !state.modules?.preparation) throw new CloudError('ACCESS_DENIED');
      return request('/preparation/correction-users');
    },
    async correctPreparationLocally(orderId: string, target: Preparation['status'] | undefined, approve: (challenge: Record<string, any>)=>Promise<Record<string, any>>, expectedUpdatedAt?: string) {
      await load();
      return serial(async()=>{
        if (!roleScreen(roleOf(),'preparation') || !state.modules?.preparation) throw new CloudError('ACCESS_DENIED');
        const key='preparation:'+orderId,current=state.values[key],before=current?.value as Preparation|undefined;
        if (!before || (expectedUpdatedAt&&before.updatedAt!==expectedUpdatedAt)) throw new CloudError('PREPARATION_CHANGED');
        const previous=state.preparationPrevious?.[key];
        if (!target && !previous) throw new CloudError('PREPARATION_AUTH_REQUIRED');
        const id=uuid(),challenge={id,storeId:storeId(),deviceId:state.deviceId,orderId,before,previous:previous??null,target:target??previous!.status,undo:target===undefined,at:new Date().toISOString(),requestedBy:actor(),localBase:current.revision};
        const proof=await approve(challenge),value=correctedPreparation(challenge,proof,current.revision) as Preparation;
        const pending={...state.pending},queue=[...(state.preparationOperations||[])];
        if(pending[key]){queue.push(pending[key]);delete pending[key];}
        queue.push({key,id,value,base:current.revision,offline:{challenge,proof}});
        await persist({...state,pending,preparationOperations:queue,preparationPrevious:{...state.preparationPrevious,[key]:before},values:{...state.values,[key]:{key,value,revision:current.revision}}});
        return value;
      });
    },
    async correctPreparation(orderId: string, status?: string, username?: string, password?: string, expectedUpdatedAt?: string) {
      await load(); if (!session) throw new CloudError('LOGIN_REQUIRED');
      if (!roleScreen(roleOf(), 'preparation') || !state.modules?.preparation) throw new CloudError('ACCESS_DENIED');
      const recovering = state.preparationCorrectionAttempt;
      await sync();
      return serial(async () => {
        const key = 'preparation:' + orderId, current = state.values[key];
        if (!current || state.pending[key] || !current.revision) throw new CloudError('PREPARATION_NOT_SYNCED');
        if (recovering?.orderId === orderId && recovering.status === status && recovering.username === username && (current.value as { correction?: { id?: string } }).correction?.id === recovering.id) return current.value;
        if (expectedUpdatedAt && (current.value as { updatedAt: string }).updatedAt !== expectedUpdatedAt) throw new CloudError('PREPARATION_CHANGED');
        const saved = state.preparationCorrectionAttempt;
        if (saved && (saved.orderId !== orderId || saved.status !== status || saved.username !== username)) throw new CloudError('PREPARATION_CORRECTION_PENDING');
        const attempt = saved ?? { id: uuid(), orderId, status, username, base: current.revision };
        await persist({ ...state, preparationCorrectionAttempt: attempt });
        let result: { record: CloudRecord };
        try { result = await request('/preparation/correct', { ...attempt, ...(password !== undefined ? { password } : {}) }); }
        catch (error) { if (error instanceof CloudError && [400,401,403,404,409].includes(error.status)) await persist({ ...state, preparationCorrectionAttempt: undefined }); throw error; }
        if (result.record?.key !== key || !validCloudValue(key, result.record.value) || !Number.isSafeInteger(result.record.revision) || result.record.revision < 1) throw new CloudError('INVALID_DATA');
        await persist({ ...state, values: { ...state.values, [key]: result.record }, preparationCorrectionAttempt: undefined });
        return result.record.value;
      });
    },
    async cancellationUsers(): Promise<{ users: { username: string; role: string }[] }> {
      await load(); if (!session) throw new CloudError('LOGIN_REQUIRED');
      if (!roleScreen(roleOf(), 'preorders') || !state.modules?.preorders) throw new CloudError('ACCESS_DENIED');
      return request('/preorders/cancellation-users');
    },
    async cancelPreorder(orderId: string, username: string, password: string) {
      await load(); if (!session) throw new CloudError('LOGIN_REQUIRED');
      if (!roleScreen(roleOf(), 'preorders') || !state.modules?.preorders) throw new CloudError('ACCESS_DENIED');
      await sync();
      return serial(async () => {
        const key = 'preorder:' + orderId, current = state.values[key];
        if (!current || state.pending[key] || !current.revision) throw new CloudError('PREORDER_NOT_SYNCED');
        if (state.cancellationAttempt && state.cancellationAttempt.orderId !== orderId) throw new CloudError('CANCELLATION_PENDING');
        const attempt = state.cancellationAttempt ?? { id: uuid(), orderId, base: current.revision };
        await persist({ ...state, cancellationAttempt: attempt });
        let result: { record: CloudRecord };
        try { result = await request('/preorders/cancel', { ...attempt, username, password }); }
        catch (error) { if (error instanceof CloudError && [400,401,403,404,409].includes(error.status)) await persist({ ...state, cancellationAttempt: undefined }); throw error; }
        if (result.record?.key !== key || !validCloudValue(key, result.record.value) || !Number.isSafeInteger(result.record.revision) || result.record.revision < 1) throw new CloudError('INVALID_DATA');
        await persist({ ...state, values: { ...state.values, [key]: result.record }, cancellationAttempt: undefined });
        return result.record.value;
      });
    },
    async cashCommand(input: Record<string, unknown>) {
      await load(); if (!roleScreen(roleOf(),'cash')) throw new CloudError('ACCESS_DENIED');
      return serial(async () => {
        if (!session) throw new CloudError('LOGIN_REQUIRED');
        const attempt = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
        if (state.cashAttempt && JSON.stringify(state.cashAttempt) !== JSON.stringify(attempt)) throw new CloudError('CASH_PENDING');
        // Persist the exact request before sending. A lost acknowledgement or
        // application restart must reuse its ID rather than create another sale.
        await persist({ ...state, cashAttempt: attempt });
        let overview: CashOverview;
        try { overview = await request('/cash', { ...attempt, deviceId: state.deviceId }); }
        catch (error) {
          if (error instanceof CloudError && [400, 401, 403, 404, 409].includes(error.status)) {
            await persist({ ...state, cashAttempt: undefined });
          }
          throw error;
        }
        if (!Array.isArray(overview.sessions) || !Array.isArray(overview.entries)) throw new CloudError('INVALID_DATA');
        await persist({ ...state, cashOverview: overview, cashAttempt: undefined });
        return overview;
      });
    },
    storeName() { return state?.storeName ?? null; },
    async sendDiagnostic(entry: unknown) { if (!session) throw new CloudError('LOGIN_REQUIRED'); return request('/diagnostics', entry); },
    identity() { if (!state) throw new Error('Storage not ready'); return state.deviceId; },
    tabletNumber() { return state?.tabletNumber ?? null; },
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
    status() { return { status, received, pending: Object.keys(state?.pending || {}).length+(state?.preparationOperations?.length||0), lastSync: state?.lastSync, conflicts: [...Object.values(state?.pending || {}),...(state?.preparationOperations||[])].filter((p) => p.conflict) }; },
    async get(key: string) { await load(); await lock; return state.values[key]?.value; },
    async list(prefix: string) {
      await load(); await lock;
      if (listedValues !== state.values) { listed.clear(); listedValues = state.values; }
      let values = listed.get(prefix);
      if (!values) { values = Object.values(state.values).filter(record => record.key.startsWith(prefix)).map(record => record.value); listed.set(prefix, values); }
      return values.slice();
    },
    pending(key: string) { return !!state?.pending[key] || !!state?.preparationOperations?.some(item=>item.key===key); },
    async authenticate(username: string, password: string) {
      await load();
      const id = storeId();
      const result = await request('/login', { storeId: id, username, password }, undefined);
      if (result.storeId !== id) throw new CloudError('STORE_MISMATCH');
      return result;
    },
    async setSession(next: Session | null) {
      if (next && next.storeId !== storeId()) throw new CloudError('STORE_MISMATCH');
      await load();
      const changed = state.reader !== next?.username;
      session = next; rejectedSession = false;
      if (changed && next) await serial(() => persist({ ...state, reader: next.username, cursor: 0 }));
      if (!next) { status = 'LOGIN_REQUIRED'; emit(); }
    },
    async resolve(key: string, keepLocal: boolean) {
      await load();
      await serial(async () => {
        const queued = state.preparationOperations?.find(item=>item.key===key&&item.conflict);
        if (queued?.conflict) {
          if(!roleWrite(roleOf(),key,queued.value))throw new CloudError('ACCESS_DENIED');
          if(keepLocal)throw new Error('Confira a etapa atual antes de refazer a correção do preparo.');
          const pending={...state.pending};delete pending[key];
          await persist({...state,pending,values:{...state.values,[key]:queued.conflict},preparationReview:[...(state.preparationReview||[]),...(state.preparationOperations||[]).filter(item=>item.key===key)],preparationOperations:(state.preparationOperations||[]).filter(item=>item.key!==key)});return;
        }
        const item = state.pending[key]; if (!item?.conflict) return;
        // Resolving can discard a draft or replace its base revision. Apply the
        // current operator's permissions before either choice changes the queue.
        const ownPassword = key === 'user:' + actor() &&
          (item.value as { active?: boolean }).active === (item.conflict.value as { active?: boolean }).active &&
          ((item.value as { cancelPreorders?: boolean; correctPreparation?: boolean }).cancelPreorders === true) === ((item.conflict.value as { cancelPreorders?: boolean; correctPreparation?: boolean }).cancelPreorders === true) &&
          ((item.value as { correctPreparation?: boolean }).correctPreparation === true) === ((item.conflict.value as { correctPreparation?: boolean }).correctPreparation === true) &&
          appRole(actor(), (item.value as { role?: string }).role) === appRole(actor(), (item.conflict.value as { role?: string }).role);
        if (!ownPassword && !roleWrite(roleOf(),key,item.value)) throw new CloudError('ACCESS_DENIED');
        if ((key === 'menu' || key.startsWith('product-option:')) && !can('menu')) throw new CloudError('ACCESS_DENIED');
        if ((['printer','order-settings','logo'].includes(key) || key.startsWith('printer:')) && !can('settings')) throw new CloudError('ACCESS_DENIED');
        if (key.startsWith('activity:') && ['reprint','restore'].includes((item.value as { kind: string }).kind) && !can((item.value as { kind: AccessAction }).kind)) throw new CloudError('ACCESS_DENIED');
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
