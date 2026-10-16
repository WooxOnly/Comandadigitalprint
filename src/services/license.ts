import { decodeLicenseCode, LICENSE_DAY, licenseState, type LicenseClaim } from '../../shared/license.mjs';

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
type LicenseStatus = 'loading' | 'active' | 'unverified' | 'blocked' | 'expired' | 'storage-error' | 'clock-error';
export type LicenseView = { status: LicenseStatus; deviceId: string; expiresAt: number | null; checking: boolean; error: boolean };
export function createLicenseService(options: {
  storage: Storage; storeId: string; audience: string; uuid(): string; deviceKey?: string;
  verify(payload: string, signature: string): Promise<boolean>;
  fetcher?: typeof fetch; now?: () => number;
}) {
  const { storage, storeId, audience, uuid, verify } = options;
  const now = options.now || Date.now, fetcher = options.fetcher || fetch;
  const prefix = 'bistrohub.license.v1.' + storeId + '.';
  let view: LicenseView = { status: 'loading', deviceId: '', expiresAt: null, checking: false, error: false };
  let snapshot: LicenseClaim | null = null, offline: LicenseClaim | null = null, highWater = 0, attemptedAt = 0;
  let loaded = false, running: Promise<void> | undefined, lock: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = () => { for (const fn of listeners) fn(); };
  const serial = <T,>(fn: () => Promise<T>) => { const next = lock.then(fn); lock = next.catch(() => {}); return next; };
  async function proof(code: string, kind: 'snapshot' | 'offline') {
    const result = decodeLicenseCode(code), value = result.claim;
    if (value.kind !== kind || value.audience !== audience || value.storeId !== storeId || value.deviceId !== view.deviceId || !await verify(result.payload, result.signature)) throw Error('INVALID_LICENSE');
    return value;
  }
  async function clock(serverTime = 0) {
    highWater = Math.max(highWater, now(), serverTime);
    await storage.setItem(prefix + 'clock', String(highWater));
    return highWater;
  }
  function render() {
    // A new online status supersedes the old offline grant, including remote blocks.
    const effective = offline && (!snapshot || (offline.revision >= snapshot.revision && offline.issuedAt >= snapshot.issuedAt)) ? offline : snapshot;
    const status = licenseState(effective, Math.max(now(), highWater));
    // Do not let a rolled-back device clock freeze a still-valid license forever.
    // Small adjustments/network time differences are tolerated.
    view = { ...view, status: status === 'active' && now() + 300000 < highWater ? 'clock-error' : status, expiresAt: effective?.expiresAt ?? null };
    emit();
  }
  async function load() {
    if (loaded) return;
    try {
      const deviceKey = options.deviceKey || prefix + 'device';
      let deviceId = await storage.getItem(deviceKey);
      if (!deviceId) { deviceId = uuid(); await storage.setItem(deviceKey, deviceId); }
      if (!/^[a-f0-9-]{36}$/.test(deviceId)) throw Error('INVALID_DEVICE');
      view = { ...view, deviceId };
      const savedClock = await storage.getItem(prefix + 'clock'), attempt = await storage.getItem(prefix + 'attempt');
      highWater = savedClock ? Number(savedClock) : 0; attemptedAt = attempt ? Number(attempt) : 0;
      if (!Number.isSafeInteger(highWater) || highWater < 0 || !Number.isSafeInteger(attemptedAt) || attemptedAt < 0) throw Error('INVALID_CLOCK');
      const cached = await storage.getItem(prefix + 'snapshot'), grant = await storage.getItem(prefix + 'offline');
      // Invalid proofs never provide access, but a new online check can recover.
      if (cached) { try { snapshot = await proof(cached, 'snapshot'); } catch {} }
      if (grant) { try { offline = await proof(grant, 'offline'); } catch {} }
      await clock(); loaded = true; render();
    } catch { view = { ...view, status: 'storage-error', error: true }; emit(); throw Error('LICENSE_STORAGE'); }
  }
  async function refresh(force = false) {
    if (running) return running;
    running = serial(async () => {
      await load();
      try { await clock(); } catch { view = { ...view, status: 'storage-error', error: true }; emit(); return; }
      render();
      const time = Math.max(now(), highWater), expiredSinceAttempt = view.status === 'expired' && attemptedAt < (view.expiresAt || 0);
      if (!force && !expiredSinceAttempt && Math.floor(time / LICENSE_DAY) === Math.floor(attemptedAt / LICENSE_DAY)) return;
      attemptedAt = time;
      await storage.setItem(prefix + 'attempt', String(attemptedAt));
      view = { ...view, checking: true, error: false }; emit();
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetcher(audience + '/cloud/license?' + new URLSearchParams({ storeId, deviceId: view.deviceId }), { signal: controller.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) throw Error('UNAVAILABLE');
        const data = await response.json(), value = await proof(data.code, 'snapshot');
        if (snapshot && value.issuedAt < snapshot.issuedAt) throw Error('STALE_LICENSE');
        // Persist the new authority before discarding the temporary proof.
        await storage.setItem(prefix + 'snapshot', data.code);
        snapshot = value;
        await storage.setItem(prefix + 'offline', ''); offline = null;
        await clock(value.issuedAt);
        attemptedAt = Math.max(now(), highWater);
        await storage.setItem(prefix + 'attempt', String(attemptedAt));
      } catch { view = { ...view, error: true }; }
      finally { clearTimeout(timer); view = { ...view, checking: false }; render(); }
    }).finally(() => { running = undefined; });
    return running;
  }
  async function applyCode(code: string) {
    return serial(async () => {
      await load();
      const value = await proof(code, 'offline');
      if (value.expiresAt <= Math.max(highWater, now(), value.issuedAt) || value.expiresAt > value.issuedAt + 31 * LICENSE_DAY || (snapshot && (value.clientId !== snapshot.clientId || value.revision < snapshot.revision || value.issuedAt < snapshot.issuedAt))) throw Error('INVALID_LICENSE');
      await storage.setItem(prefix + 'offline', code.trim());
      await clock(value.issuedAt); offline = value;
      view = { ...view, error: false }; render();
    });
  }
  return { refresh, applyCode, snapshot: () => view, subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; } };
}
