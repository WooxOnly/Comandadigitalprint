import type { ReactNode } from 'react';
import { ScrollView, View } from './ThemedNative';
import { useApp } from '../state/AppContext';
import { styles } from './theme';
export function ScreenFrame({ children }: { children: ReactNode }) {
  const { sending, isReady } = useApp();
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
    <View pointerEvents={sending || !isReady ? 'none' : 'auto'} style={styles.contentFrame}>{children}</View>
  </ScrollView>;
}
