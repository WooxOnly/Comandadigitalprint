import { IconView, View } from './ThemedNative';
import { COLORS } from './theme';
export function ActionIcon({ kind }: { kind: 'plus' | 'printer' }) {
  const line = { position: 'absolute' as const, backgroundColor: COLORS.green, borderRadius: 1 };
  return <View accessible={false} pointerEvents="none" style={{ width: 22, height: 22 }}>
    {kind === 'plus' ? <><IconView style={{ ...line, left: 4, top: 10, width: 14, height: 2 }} /><IconView style={{ ...line, left: 10, top: 4, width: 2, height: 14 }} /></> : <>
      <IconView style={{ position: 'absolute', left: 2, top: 7, width: 18, height: 10, borderWidth: 1.7, borderColor: COLORS.green, borderRadius: 3 }} />
      <IconView style={{ position: 'absolute', left: 6, top: 1, width: 10, height: 7, borderWidth: 1.7, borderColor: COLORS.green }} />
      <IconView style={{ ...line, left: 6, top: 14, width: 10, height: 7 }} />
    </>}
  </View>;
}
