export type Diagnostic = { id: string; deviceId: string; createdAt: string; event: string; code: string; orderId?: string };
type Store = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
const KEY = '@comandadigitalprint/diagnostics-v1';
// Only codes and identifiers: never passwords, tokens, customer names or order contents.
export function createDiagnosticQueue(storage: Store, uuid: () => string, device: () => Promise<string>, send: (entry: Diagnostic) => Promise<unknown>) {
  let lock: Promise<unknown> = Promise.resolve();
  let flushing: Promise<void> | undefined;
  const serial = <T,>(action: () => Promise<T>) => { const next = lock.then(action); lock = next.catch(() => {}); return next; };
  const read = async (): Promise<Diagnostic[]> => JSON.parse(await storage.getItem(KEY) || '[]');
  async function record(event: string, code = 'UNKNOWN', orderId?: string) {
    try {
      const entry: Diagnostic = { id: uuid(), deviceId: await device(), createdAt: new Date().toISOString(), event: event.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60), code: code.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80), ...(orderId ? { orderId } : {}) };
      await serial(async () => storage.setItem(KEY, JSON.stringify([...(await read()).slice(-199), entry])));
      void flush();
    } catch { /* Diagnostics must never prevent an order from being saved. */ }
  }
  function flush() {
    if (flushing) return flushing;
    flushing = (async () => {
      const entries = await serial(read);
      for (const entry of entries) {
        await send(entry);
        await serial(async () => storage.setItem(KEY, JSON.stringify((await read()).filter(item => item.id !== entry.id))));
      }
    })().catch(() => { /* Retain the queue for the next connection; do not recursively log failures. */ }).finally(() => { flushing = undefined; });
    return flushing;
  }
  return { record, flush };
}
