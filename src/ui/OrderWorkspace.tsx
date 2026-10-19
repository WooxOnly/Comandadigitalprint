import type { ReactNode } from 'react';
import { ScrollView, View, useWindowDimensions } from './ThemedNative';
import { useApp } from '../state/AppContext';

export function OrderWorkspace({ catalog, order }: { catalog: ReactNode; order: ReactNode }) {
  const { isWide: wideLayout, isReady, sending } = useApp();
  const { width, height } = useWindowDimensions();
  const isWide = wideLayout && width > height;
  return <View pointerEvents={!isReady || sending ? 'none' : 'auto'} style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 1160, alignSelf: 'center', flexDirection: isWide ? 'row' : 'column', paddingHorizontal: isWide ? 20 : 12, paddingTop: 8, gap: isWide ? 16 : 8 }}>
    {!isWide && order}
    <ScrollView testID="order-catalog-scroll" style={{ flex: isWide ? 3 : 1, minWidth: 0, minHeight: 0 }} contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" removeClippedSubviews={false}>{catalog}</ScrollView>
    {isWide && <View style={{ flex: 2, minWidth: 0, minHeight: 0 }}>{order}</View>}
  </View>;
}
