import { View } from './ThemedNative';
import { COLORS } from './theme';

// Original offline drawings, independent of any restaurant brand.
export function ServiceModeIcon({ mode, selected }: { mode: 'dine_in' | 'takeout'; selected: boolean }) {
  const color = selected ? '#FFFFFF' : COLORS.green;
  const line = (left: number, top: number, width: number, height: number) => ({ position: 'absolute' as const, left, top, width, height, backgroundColor: color, borderRadius: 1 });
  return <View accessible={false} accessibilityElementsHidden pointerEvents="none" style={{ width: 28, height: 28 }}>
    {mode === 'dine_in' ? <>
      <View style={line(7, 10, 14, 2)} /><View style={line(13, 12, 2, 12)} />
      <View style={line(1, 8, 2, 11)} /><View style={line(2, 17, 7, 2)} /><View style={line(5, 19, 2, 5)} />
      <View style={line(25, 8, 2, 11)} /><View style={line(19, 17, 7, 2)} /><View style={line(21, 19, 2, 5)} />
      <View style={line(9, 7, 4, 2)} /><View style={line(17, 6, 2, 3)} />
    </> : <>
      <View style={line(1, 17, 26, 2)} /><View style={line(4, 19, 2, 6)} /><View style={line(22, 19, 2, 6)} />
      <View style={{ position: 'absolute', left: 5, top: 7, width: 10, height: 10, borderWidth: 1.5, borderColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: 8, top: 3, width: 4, height: 6, borderWidth: 1.5, borderColor: color, borderRadius: 3 }} />
      <View style={line(19, 9, 5, 8)} /><View style={line(18, 7, 7, 2)} />
    </>}
  </View>;
}
