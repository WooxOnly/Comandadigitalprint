import { logError } from '../services/diagnostics';
import * as SecureStore from 'expo-secure-store';
import { getRandomBytesAsync } from 'expo-crypto';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { createLocalAuth } from '../services/localAuth';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';
import { passwordDigest } from '../services/passwordDigest';
import { authStorage, cloud } from '../services/cloudStorage';
import { CloudError } from '../services/cloudSync';

const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
function useAuthState() {
  const [service] = useState(() => createLocalAuth(authStorage, getRandomBytesAsync, Date.now, passwordDigest));
  const [currentUser, setCurrentUser] = useState('');
  const [ready, setReady] = useState(false);
  const [exists, setExists] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const sync = useCallback(async () => {
    try { if (await service.syncAdmin(ADMIN_CREDENTIAL_ENDPOINT)) setExists(true); }
    catch { /* Offline or failed writes keep the last usable credential. */ }
  }, [service]);
  const load = useCallback(async () => {
    try {
      if (Platform.OS === 'web') throw new Error('Acesso local indisponível no navegador. Use o aplicativo Android ou iPad.');
      setExists(await service.load()); setError(''); setReady(true); void sync();
    } catch (e) { logError('auth.load_failed', e); setError((e as Error).message); }
  }, [service, sync]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void sync(); });
    const interval = setInterval(() => { if (AppState.currentState === 'active') void sync(); }, 60000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, [sync]);
  async function recover() {
    setRecovering(true); setRecoveryError('');
    try { await service.syncAdmin(ADMIN_CREDENTIAL_ENDPOINT); setExists(true); }
    catch { setRecoveryError('Não foi possível recuperar o acesso. Conecte à internet e tente novamente.'); }
    finally { setRecovering(false); }
  }
  async function login(username: string, password: string) {
    const name = username.trim().toLowerCase();
    try {
      if (cloud.pending('user:' + name)) {
        await service.load();
        await service.verify('login', password, name);
        const previousToken = await SecureStore.getItemAsync('comandadigitalprint.cloud-session.' + name);
        if (previousToken) { await cloud.setSession({ username: name, token: previousToken }); await cloud.sync(); }
      }
      const result = await cloud.authenticate(name, password);
      if (name === 'admin') await service.syncAdmin(ADMIN_CREDENTIAL_ENDPOINT, async () => ({ ok: true, json: async () => result.credential }) as Response);
      else await cloud.cacheUser(name, result.credential, result.revision);
      setExists(await service.load());
      await service.verify('login', password, name);
      await SecureStore.setItemAsync('comandadigitalprint.cloud-session.' + name, result.token);
      await cloud.setSession({ username: name, token: result.token });
    } catch (error) {
      logError('auth.login_failed', error);
      if (!(error instanceof CloudError) || error.code !== 'UNAVAILABLE') {
        if (error instanceof CloudError) throw new Error(error.code === 'RATE_LIMIT' ? 'Muitas tentativas. Aguarde um minuto.' : 'Usuário ou senha incorretos.');
        throw error;
      }
      await service.load();
      await service.verify('login', password, name);
      const token = await SecureStore.getItemAsync('comandadigitalprint.cloud-session.' + name);
      await cloud.setSession(token ? { username: name, token } : null);
    }
    setCurrentUser(name); setSignedIn(true); void cloud.sync();
  }
  async function recoverOffline(code: string, password: string, confirmation: string) {
    await service.recoverOffline(code, password, confirmation);
    setExists(true); setCurrentUser('admin'); setSignedIn(true);
  }
  async function changeOwnPassword(currentPassword: string, password: string, confirmation: string) {
    await service.changeOwnPassword(currentPassword, password, confirmation);
    await cloud.sync();
    if (cloud.pending('user:' + currentUser)) return false;
    try {
      const result = await cloud.authenticate(currentUser, password);
      await SecureStore.setItemAsync('comandadigitalprint.cloud-session.' + currentUser, result.token);
      await cloud.setSession({ username: currentUser, token: result.token });
      void cloud.sync();
      return true;
    } catch { return false; }
  }
  function logout() { service.logout(); void cloud.setSession(null); setCurrentUser(''); setSignedIn(false); }
  return { ready, exists, signedIn, currentUser, error, load, login, logout, service, recover, recoverOffline, changeOwnPassword, recovering, recoveryError };
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
