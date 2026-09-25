import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { styles } from './theme';
export function ScreenFrame({ children }: { children: ReactNode }) {
  const { sending, isReady } = useApp();
  return <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View pointerEvents={sending || !isReady ? 'none' : 'auto'} style={styles.contentFrame}>{children}</View>
  </ScrollView>;
}
