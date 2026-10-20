import { Image } from './ThemedNative';
import { COLORS } from './theme';

const icons = {
  dine_in: require('../../assets/service/dine-in.png'),
  takeout: require('../../assets/service/takeout.png'),
};

// Approved option 1: two chairs and table / handled paper bag. Bundled masks
// retain their rounded strokes at every density; the shared theme tints the ink.
export function ServiceModeIcon({ mode, selected }: { mode: 'dine_in' | 'takeout'; selected: boolean }) {
  return <Image testID={'service-mode-icon-' + mode} source={icons[mode]} resizeMode="contain" accessible={false} accessibilityElementsHidden tintColor={selected ? '#FFFFFF' : COLORS.green} style={{ width: 28, height: 28 }} />;
}
