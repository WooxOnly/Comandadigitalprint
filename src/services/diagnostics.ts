import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { cloud } from './cloudStorage';
import { createDiagnosticQueue } from './diagnosticQueue';

export const diagnostics = createDiagnosticQueue(AsyncStorage, randomUUID, () => cloud.deviceId(), entry => cloud.sendDiagnostic(entry));
export function logError(event: string, error?: unknown, orderId?: string) {
  // Native error codes are useful without uploading messages that can contain private data.
  const candidate = (error as { code?: unknown })?.code;
  const code = typeof candidate === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(candidate) ? candidate : 'UNEXPECTED_ERROR';
  void diagnostics.record(event, code, orderId);
}

export function startDiagnostics() {
  const runtime = globalThis as typeof globalThis & { ErrorUtils?: { getGlobalHandler(): (error: Error, fatal?: boolean) => void; setGlobalHandler(handler: (error: Error, fatal?: boolean) => void): void } };
  const previous = runtime.ErrorUtils?.getGlobalHandler();
  if (previous) runtime.ErrorUtils!.setGlobalHandler((error, fatal) => { logError(fatal ? 'runtime.fatal' : 'runtime.error', error); previous(error, fatal); });
  let lastStatus = '';
  const stop = cloud.subscribe(() => {
    const status = cloud.status().status;
    if (status === lastStatus) return;
    lastStatus = status;
    if (status === 'SYNCED' || status === 'PENDING') void diagnostics.flush();
    if (status === 'UNAVAILABLE' || status === 'STORAGE_ERROR') void diagnostics.record('sync.failed', status);
  });
  const interval = setInterval(() => { void diagnostics.flush(); }, 60000);
  return () => { stop(); clearInterval(interval); if (previous) runtime.ErrorUtils!.setGlobalHandler(previous); };
}
