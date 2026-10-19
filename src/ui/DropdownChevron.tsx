import { View } from './ThemedNative';
import { COLORS } from './theme';

// Draw the same chevron everywhere; font glyphs vary between Android and web.
export function DropdownChevron({ expanded = false, color = COLORS.green, framed = false }: { expanded?: boolean; color?: string; framed?: boolean }) {
  return <View testID="dropdown-chevron" accessible={false} accessibilityElementsHidden pointerEvents="none" style={{ width: framed ? 28 : 14, height: framed ? 28 : 14, flexShrink: 0, alignItems: 'center', justifyContent: 'center', ...(framed ? { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.greenSoft } : {}) }}>
    <View style={{ width: 7, height: 7, borderBottomWidth: 1.8, borderRightWidth: 1.8, borderColor: color, transform: [{ rotate: expanded ? '225deg' : '45deg' }], marginTop: expanded ? 3 : -3 }} />
  </View>;
}
