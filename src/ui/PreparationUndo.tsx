import { useEffect, useState } from 'react';
import { Alert, View, Text } from './ThemedNative';
import { KeyboardPressable as Pressable } from './KeyboardControls';
import { useBusiness } from '../state/BusinessContext';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useApp } from '../state/AppContext';
import type { Preparation } from '../services/business';
import { styles, COLORS } from './theme';
export function canUndoPreparation(value: Preparation, username: string | null, now: number) {
  const actor = value.status === 'completed' ? value.completedBy : value.status === 'ready' ? value.readyBy : value.startedBy;
  const age = now - Date.parse(value.updatedAt);
  return value.status !== 'received' && value.correction?.at !== value.updatedAt && actor === username && age >= 0 && age <= 60000;
}
export function PreparationUndo() {
  const { preparation, correctPreparation, busy } = useBusiness(), { currentUser } = useAuth(), { history } = useApp(), { t } = useLanguage();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const eligible = preparation.filter(value => canUndoPreparation(value, currentUser, now)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const change = eligible[0];
  if (!change) return null;
  const order = history.find(value => value.id === change.orderId);
  return <View testID="preparation-undo-notice" style={{ position: 'absolute', bottom: 76, left: 12, right: 12, maxWidth: 620, alignSelf: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 150 }}>
    <Text style={[styles.helperText, { flex: 1 }]}>{t('Etapa alterada')} · {t('Mesa')} {order?.plate || change.orderId} · {Math.max(0, Math.ceil((60000 - now + Date.parse(change.updatedAt)) / 1000))} {t('s')}</Text>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.noteChip} onPress={() => { void correctPreparation(change.orderId, undefined, undefined, undefined, change.updatedAt).catch(error => Alert.alert(t('Falha ao salvar'), t(error.message))); }}><Text style={styles.noteChipText}>{t('Desfazer')}</Text></Pressable>
  </View>;
}
