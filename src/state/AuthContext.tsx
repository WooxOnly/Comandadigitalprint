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
const adminEndpoint = () => ADMIN_CREDENTIAL_ENDPOINT + '?storeId=' + encodeURIComponent(cloud.storeId());
const sessionKey = (username: string) => 'comandadigitalprint.cloud-session.' + cloud.storeId() + '.' + username;
async function storedSession(username: string) {
  return await SecureStore.getItemAsync(sessionKey(username))
    || (cloud.storeId() === 'seabra-1' ? await SecureStore.getItemAsync('comandadigitalprint.cloud-session.' + username) : null);
}
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
    try { if (await service.syncAdmin(adminEndpoint())) setExists(true); }
    catch { /* Offline or failed writes keep the last usable credential. */ }
  }, [service]);
  const logout = useCallback(() => {
    service.logout(); cloud.setOfflineActor(''); void cloud.setSession(null); setCurrentUser(''); setSignedIn(false);
  }, [service]);
  const load = useCallback(async () => {
    try {
      if (Platform.OS === 'web') throw new Error('Acesso local indisponível no navegador. Use o aplicativo Android ou iPad.');
      setExists(await service.load()); setError(''); setReady(true); void sync();
    } catch (e) { logError('auth.load_failed', e); setError((e as Error).message); }
  }, [service, sync]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    const checkSession = () => {
      if (signedIn && !service.isSessionActive()) { logout(); return false; }
      return true;
    };
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active' && checkSession()) void sync(); });
    const interval = setInterval(() => { if (AppState.currentState === 'active' && checkSession()) void sync(); }, 60000);
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const midnight = signedIn ? setTimeout(checkSession, nextDay.getTime() - now.getTime() + 50) : null;
    if (signedIn) checkSession();
    return () => { subscription.remove(); clearInterval(interval); if (midnight) clearTimeout(midnight); };
  }, [logout, service, signedIn, sync]);
  async function recover() {
    setRecovering(true); setRecoveryError('');
    try { await service.syncAdmin(adminEndpoint()); setExists(true); }
    catch { setRecoveryError('Não foi possível recuperar o acesso. Conecte à internet e tente novamente.'); }
    finally { setRecovering(false); }
  }
  async function login(username: string, password: string) {
    const name = username.trim().toLowerCase();
    try {
      if (cloud.pending('user:' + name)) {
        await service.load();
        await service.verify('login', password, name);
        const previousToken = await storedSession(name);
        if (previousToken) { await cloud.setSession({ username: name, token: previousToken, storeId: cloud.storeId() }); await cloud.sync(); }
      }
      const result = await cloud.authenticate(name, password);
      if (name === 'admin') await service.syncAdmin(adminEndpoint(), async () => ({ ok: true, json: async () => result.credential }) as Response);
      else await cloud.cacheUser(name, result.credential, result.revision);
      setExists(await service.load());
      await service.verify('login', password, name);
      await SecureStore.setItemAsync(sessionKey(name), result.token);
      await cloud.setSession({ username: name, token: result.token, storeId: cloud.storeId() });
    } catch (error) {
      logError('auth.login_failed', error);
      if (!(error instanceof CloudError) || error.code !== 'UNAVAILABLE') {
        if (error instanceof CloudError) throw new Error(error.code === 'RATE_LIMIT' ? 'Muitas tentativas. Aguarde um minuto.' : 'Usuário ou senha incorretos.');
        throw error;
      }
      await service.load();
      await service.verify('login', password, name);
      const token = await storedSession(name);
      await cloud.setSession(token ? { username: name, token, storeId: cloud.storeId() } : null);
    }
    cloud.setOfflineActor(name); setCurrentUser(name); setSignedIn(true); void cloud.sync();
  }
  async function recoverOffline(code: string, password: string, confirmation: string) {
    await service.recoverOffline(code, password, confirmation);
    await cloud.setSession(null);
    setExists(true); cloud.setOfflineActor('admin'); setCurrentUser('admin'); setSignedIn(true);
  }
  async function changeOwnPassword(currentPassword: string, password: string, confirmation: string) {
    await service.changeOwnPassword(currentPassword, password, confirmation);
    await cloud.sync();
    if (cloud.pending('user:' + currentUser)) return false;
    try {
      const result = await cloud.authenticate(currentUser, password);
      await SecureStore.setItemAsync(sessionKey(currentUser), result.token);
      await cloud.setSession({ username: currentUser, token: result.token, storeId: cloud.storeId() });
      void cloud.sync();
      return true;
    } catch { return false; }
  }
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
