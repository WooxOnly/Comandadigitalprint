import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ScreenFrame } from './ScreenFrame';
import { useApp } from '../state/AppContext';
import { styles } from './theme';

export function OrderWorkspace({ catalog, order }: { catalog: ReactNode; order: ReactNode }) {
  const { isWide, isReady, sending } = useApp();
  if (!isWide) return <ScreenFrame><View style={styles.columns}>{catalog}{order}</View></ScreenFrame>;
  // Separate scroll areas keep the order reachable while browsing a long menu.
  return <View pointerEvents={!isReady || sending ? 'none' : 'auto'} style={{ flex: 1, width: '100%', maxWidth: 1160, alignSelf: 'center', flexDirection: 'row', paddingHorizontal: 20, gap: 20 }}>
    <ScrollView style={{ flex: 1, minWidth: 0 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>{catalog}</ScrollView>
    <ScrollView style={{ flex: 1, minWidth: 0 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" removeClippedSubviews={false}>{order}</ScrollView>
  </View>;
}
