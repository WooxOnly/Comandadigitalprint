import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { appStorage, cloud } from '../services/cloudStorage';
import { useApp } from '../state/AppContext';
import { kitchenAlertIds, newKitchenOrders } from '../services/kitchenAlerts';
import { logError } from '../services/diagnostics';
import { useFocusEffect } from 'expo-router';

const soundKey = '@comandadigitalprint/kitchen-sound';
export function useKitchenAlerts(enabled: boolean, orders: { id: string; createdAt: string }[]) {
  const { isReady } = useApp();
  const player = useAudioPlayer(require('../../assets/new-kitchen-order.wav'));
  const seen = useRef<Set<string> | null>(null);
  const openedAt = useRef(0);
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { openedAt.current = Date.now(); setFocused(true); return () => setFocused(false); }, []));
  const active = enabled && focused;
  const [sound, setSound] = useState(false), [unread, setUnread] = useState<string[]>([]);
  useEffect(() => { let mounted = true; void appStorage.getItem(soundKey).then(value => { if (mounted) setSound(value === 'true'); }).catch(error => logError('kitchen.settings_failed', error)); return () => { mounted = false; }; }, []);
  const play = useCallback(async () => {
    try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, allowsRecording: false, interruptionMode: 'mixWithOthers' }); await player.seekTo(0); player.play(); }
    catch (error) { logError('kitchen.sound_failed', error); }
  }, [player]);
  useEffect(() => {
    if (!active || !isReady) { seen.current = null; return; }
    const result = newKitchenOrders(kitchenAlertIds(orders, openedAt.current), seen.current); seen.current = result.seen;
    if (!result.added.length) return;
    setUnread(previous => [...new Set([...previous, ...result.added])]);
    if (sound && AppState.currentState === 'active') void play();
  }, [active, isReady, orders, sound, play]);
  useEffect(() => {
    if (!active) return;
    const update = () => { if (AppState.currentState === 'active') void cloud.sync(); };
    update(); const timer = setInterval(update, 5000);
    const stop = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); stop.remove(); };
  }, [active]);
  async function toggleSound() { const next = !sound; await appStorage.setItem(soundKey, String(next)); setSound(next); }
  return { sound, unread, toggleSound, testSound: play, acknowledge(id?: string) { setUnread(previous => id ? previous.filter(value => value !== id) : []); } };
}
