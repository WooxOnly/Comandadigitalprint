import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { appStorage, cloud } from '../services/cloudStorage';
import { getStoreId } from '../config/store';
import { useAppRole } from '../ui/useAppRole';
import { logError } from '../services/diagnostics';
export type OnlineRequest = { id: string; customer: string; contact: string; address: string; notes: string; fulfillment: 'pickup' | 'delivery' | 'table'; table: string | null; scheduledFor: string | null; timeZone: string; createdAt: string; updatedAt: string; paymentMethod?: 'cash' | 'credit' | 'debit'; status: 'pending' | 'accepted' | 'declined'; actor: string | null; subtotalCents: number; items: { productId: string; name: string; quantity: number; note: string; unitPriceCents: number; flavors?: string[] }[] };
type Inbox = { enabled: boolean; receiving: boolean; visualAlert: boolean; soundAlert: boolean; requests: OnlineRequest[] };
const initial: Inbox = { enabled: false, receiving: false, visualAlert: true, soundAlert: false, requests: [] };
function useOnlineState() {
 const role = useAppRole(), allowed = ['admin', 'manager', 'cashier'].includes(role || '');
 const [inbox, setInbox] = useState<Inbox>(initial), [error, setError] = useState(''), [loading, setLoading] = useState(false);
 const lock = useRef(false), seen = useRef<Set<string> | null>(null), mounted = useRef(true);
 const savedSeen = useRef<string | null>(null), inboxSignature = useRef(JSON.stringify(initial));
 const player = useAudioPlayer(require('../../assets/new-kitchen-order.wav'));
 const refresh = useCallback(async (showLoading = true) => {
  if (!allowed || lock.current || AppState.currentState !== 'active') return;
  lock.current = true; if (showLoading) setLoading(true);
  try {
   const value = await cloud.onlineInbox() as Inbox;
   if (!value || typeof value.enabled !== 'boolean' || !Array.isArray(value.requests)) throw Error('INVALID_DATA');
   if (!mounted.current) return;
   const pending = value.requests.filter(r => r.status === 'pending'), key = '@bistro-online-seen:' + getStoreId();
   if (seen.current === null) { try { const saved = JSON.parse(await appStorage.getItem(key) || 'null'); const ids = Array.isArray(saved) && saved.every(id => typeof id === 'string') ? saved.slice(-500) : null; seen.current = new Set(ids || pending.map(r => r.id)); savedSeen.current = ids ? JSON.stringify(ids) : null; } catch { seen.current = new Set(pending.map(r => r.id)); } }
   const hasNew = pending.some(r => !seen.current!.has(r.id));
   const nextIds = new Set(seen.current); pending.forEach(r => nextIds.add(r.id));
   const nextSeen = JSON.stringify([...nextIds].slice(-500));
   if (nextSeen !== savedSeen.current) { await appStorage.setItem(key, nextSeen); savedSeen.current = nextSeen; }
   seen.current = new Set(JSON.parse(nextSeen) as string[]);
   if (!mounted.current) return;
   const signature = JSON.stringify(value);
   if (signature !== inboxSignature.current) { inboxSignature.current = signature; setInbox(value); }
   setError('');
   if (hasNew && value.receiving && value.soundAlert && AppState.currentState === 'active') {
    try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, allowsRecording: false, interruptionMode: 'mixWithOthers' }); await player.seekTo(0); player.play(); }
    catch (soundError) { logError('online.sound_failed', soundError); }
   }
  } catch (failure) { if (mounted.current) setError((failure as { code?: string }).code || 'UNAVAILABLE'); }
  finally { lock.current = false; if (mounted.current && showLoading) setLoading(false); }
 }, [allowed, player]);
 useEffect(() => {
  mounted.current = true;
  if (!allowed) { seen.current = null; savedSeen.current = null; return; }
  const firstRefresh = setTimeout(() => void refresh(false), 0); const timer = setInterval(() => void refresh(false), 15000);
  const listener = AppState.addEventListener('change', value => { if (value === 'active') void refresh(false); });
  return () => { mounted.current = false; clearTimeout(firstRefresh); clearInterval(timer); listener.remove(); };
 }, [allowed, refresh]);
 const decide = useCallback(async (id: string, status: 'accepted' | 'declined') => { await cloud.onlineDecision(id, status); await refresh(); }, [refresh]);
 const pending = useMemo(() => inbox.requests.filter(r => r.status === 'pending').length, [inbox]);
 return useMemo(() => !allowed ? { ...initial, pending: 0, error: '', loading: false, refresh, decide } : { ...inbox, enabled: inbox.enabled, pending, error, loading, refresh, decide }, [allowed, inbox, pending, error, loading, refresh, decide]);
}
const OnlineContext = createContext<ReturnType<typeof useOnlineState> | null>(null);
export function OnlineOrdersProvider({ children }: { children: ReactNode }) { const state = useOnlineState(); return <OnlineContext.Provider value={state}>{children}</OnlineContext.Provider>; }
export function useOnlineOrders() { return useContext(OnlineContext); }
