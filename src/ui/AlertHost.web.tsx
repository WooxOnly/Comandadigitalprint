import { useAuth } from '../state/AuthContext';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Modal, ScrollView, Text, View, StyleSheet } from './ThemedNative';
import { KeyboardPressable as Pressable } from './KeyboardControls';
import { alertStore } from './AppAlert.web';
import { COLORS } from './theme';
export function AlertHost() {
 const { signedIn, currentUser } = useAuth();
 const identity = signedIn ? currentUser : null, previous = useRef(identity);
 useEffect(() => { if (previous.current !== identity) { previous.current = identity; alertStore.clear(); } }, [identity]);
 const active = useSyncExternalStore(alertStore.subscribe, alertStore.snapshot, () => null);
 if (!active) return null;
 return <Modal key={active.id} visible transparent animationType="none" onRequestClose={() => { if (active) alertStore.dismiss(active.id); }}>
  {active && <View style={layout.backdrop}><View testID="app-alert" accessibilityViewIsModal style={layout.panel}>
   <ScrollView><Text role="heading" style={layout.title}>{active.title}</Text>{!!active.message && <Text style={layout.message}>{active.message}</Text>}</ScrollView>
   <View style={layout.actions}>{active.buttons.map((button, index) => <Pressable key={index} accessibilityRole="button" style={[layout.button, button.style === 'cancel' && layout.cancel, button.style === 'destructive' && layout.destructive]} onPress={() => alertStore.choose(active.id, index)}><Text style={layout.label}>{button.text || 'OK'}</Text></Pressable>)}</View>
  </View></View>}
 </Modal>;
}
const layout = StyleSheet.create({
 backdrop: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0008' },
 panel: { width: '100%', maxWidth: 520, maxHeight: '90%', padding: 20, borderRadius: 14, backgroundColor: COLORS.surface, gap: 16 },
 title: { color: COLORS.ink, fontWeight: '700', fontSize: 20, marginBottom: 12 }, message: { color: COLORS.ink, fontSize: 16 },
 actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 }, button: { minHeight: 44, minWidth: 90, borderRadius: 8, padding: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.green },
 cancel: { backgroundColor: COLORS.muted }, destructive: { backgroundColor: '#AE4328' }, label: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
