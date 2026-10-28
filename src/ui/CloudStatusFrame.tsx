import type { ReactNode } from 'react';
import { View } from './ThemedNative';
// Preserve the existing APK spacing exactly.
export function CloudStatusFrame({ children }: { children: ReactNode; compact?: boolean }) {
  return <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>{children}</View>;
}
