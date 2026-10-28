import type { ReactNode } from 'react';
import { View } from './ThemedNative';
import { styles } from './theme';
// Use the same horizontal inset and centered width as ScreenFrame. Kitchen
// uses its existing full-width board instead of the regular content column.
export function CloudStatusFrame({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <View style={{ width: '100%', paddingHorizontal: compact ? 10 : 16, paddingBottom: 6, alignItems: 'center' }}>
    <View testID="cloud-status-frame" style={[styles.contentFrame, compact && { maxWidth: '100%' }]}>{children}</View>
  </View>;
}
