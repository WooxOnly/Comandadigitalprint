import * as SecureStore from 'expo-secure-store';
import { getRandomBytesAsync } from 'expo-crypto';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { createLocalAuth } from '../services/localAuth';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';

const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
function useAuthState() {
  const [service] = useState(() => createLocalAuth(SecureStore, getRandomBytesAsync));
  const [ready, setReady] = useState(false);
  const [exists, setExists] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');
  const sync = useCallback(async () => {
    try { if (await service.syncAdmin(ADMIN_CREDENTIAL_ENDPOINT)) setExists(true); }
    catch { /* Offline or failed writes keep the last usable credential. */ }
  }, [service]);
  const load = useCallback(async () => {
    try {
      if (Platform.OS === 'web') throw new Error('Acesso local indisponível no navegador. Use o aplicativo Android ou iPad.');
      setExists(await service.load()); setError(''); setReady(true); void sync();
    } catch (e) { setError((e as Error).message); }
  }, [service, sync]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void sync(); });
    const interval = setInterval(() => { if (AppState.currentState === 'active') void sync(); }, 60000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, [sync]);
  async function login(username: string, password: string, confirmation: string) {
    if (exists) await service.verify('login', password, username);
    else { await service.setup(username, password, confirmation); setExists(true); }
    setSignedIn(true);
  }
  function logout() { service.logout(); setSignedIn(false); }
  return { ready, exists, signedIn, error, load, login, logout, service };
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
