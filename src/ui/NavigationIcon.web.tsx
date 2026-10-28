import { Image, Text, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { darkColor } from '../../shared/appearance.mjs';
import { useAppearance } from './AppearanceContext';

export function NavigationIcon({ icon, size, color, variant }: { icon: string | { source: ImageSourcePropType }; size: number; color: string; variant?: 'navigation' | 'shortcut' }) {
  const { width, height } = useWindowDimensions();
  const { theme } = useAppearance();
  const large = width >= 1000 && height >= 700, tablet = width >= 700 && height >= 600;
  const renderedSize = variant === 'navigation' && width > height ? large ? 28 : tablet ? 24 : size : size;
  const ink = theme === 'dark' ? darkColor(color, 'color') : color;
  // Navigation glyphs must match the bitmap icons; don't shrink glyphs with
  // the dense landscape typography used for the surrounding screen content.
  return typeof icon === 'string'
    ? <Text testID="navigation-icon" accessible={false} style={{ fontSize: renderedSize, lineHeight: renderedSize + 4, color: ink, fontWeight: '600' }}>{icon}</Text>
    : <Image testID="navigation-icon" accessible={false} source={icon.source} resizeMode="contain" style={{ width: renderedSize, height: renderedSize, tintColor: ink }} />;
}
