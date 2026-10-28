import { Image, Text, type ImageSourcePropType } from './ThemedNative';

export function NavigationIcon({ icon, size, color }: { icon: string | { source: ImageSourcePropType }; size: number; color: string; variant?: 'navigation' | 'shortcut' }) {
  return typeof icon === 'string'
    ? <Text accessible={false} style={{ fontSize: size, color, fontWeight: '600' }}>{icon}</Text>
    : <Image accessible={false} source={icon.source} resizeMode="contain" style={{ width: size, height: size, tintColor: color }} />;
}
