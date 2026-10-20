import { Image } from './ThemedNative';
import { COLORS } from './theme';
export function FilterIcon({ size = 20 }: { size?: number }) {
  return <Image testID="filter-adjustments-icon" source={require('../../assets/ui/filter-adjustments.png')} resizeMode="contain" tintColor={COLORS.green} accessible={false} accessibilityElementsHidden style={{ width: size, height: size }} />;
}
