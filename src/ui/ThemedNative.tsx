import * as Native from 'react-native';
import { SafeAreaView as NativeSafeAreaView } from 'react-native-safe-area-context';
import { createElement, forwardRef, useMemo, type ComponentProps, type ComponentRef, type ComponentType } from 'react';
import { darkColor } from '../../shared/appearance.mjs';
import { compactLandscapeStyle } from './layoutDensity';
import { useAppearance } from './AppearanceContext';
export * from 'react-native';

function themedStyle(style: unknown, dark: boolean, compact: boolean) {
  if ((!dark && !compact) || !style) return style;
  const flat = Native.StyleSheet.flatten(style as Native.StyleProp<Native.ViewStyle>) as Record<string, unknown> | undefined;
  if (!flat) return style;
  const sized = compact ? compactLandscapeStyle(flat) : flat;
  return dark ? Object.fromEntries(Object.entries(sized).map(([key, value]) => [key, typeof value === 'string' && /color$/i.test(key) ? darkColor(value, key) : value])) : sized;
}
// These wrappers retain native refs, gestures and accessibility props. Existing
// shared, inline and screen-specific styles all receive the same native palette.
function themed<C extends ComponentType<any>>(Component: C, textInput = false, text = false) {
  const Themed = forwardRef<ComponentRef<C>, ComponentProps<C>>((props, ref) => {
    const { theme, compactLandscape } = useAppearance(), dark = theme === 'dark';
    const themedProps = useMemo(() => {
      const values = { ...props } as Record<string, any>;
      for (const key of ['style', 'contentContainerStyle']) {
        const value = values[key];
        values[key] = typeof value === 'function' ? (state: unknown) => themedStyle(value(state), dark, compactLandscape) : themedStyle(value, dark, compactLandscape);
      }
      for (const key of ['color', 'placeholderTextColor', 'selectionColor', 'cursorColor', 'tintColor', 'thumbColor']) if (dark && typeof values[key] === 'string') values[key] = darkColor(values[key], key);
      if (dark && values.trackColor) values.trackColor = Object.fromEntries(Object.entries(values.trackColor).map(([state, color]) => [state, typeof color === 'string' ? darkColor(color, 'backgroundColor') : color]));
      if (dark && (textInput || text)) values.style = [{ color: '#f1f1f1' }, values.style];
      if (textInput && dark && !values.placeholderTextColor) values.placeholderTextColor = '#b6b8bc';
      return values;
    }, [props, dark, compactLandscape]);
    // Forward the opaque ref to the native control; its current value is never read here.
    // eslint-disable-next-line react-hooks/refs
    return createElement(Component, { ...themedProps, ref });
  });
  Themed.displayName = 'ThemedControl';
  return Themed;
}
export const View = themed(Native.View);
export const Text = themed(Native.Text, false, true);
export const ScrollView = themed(Native.ScrollView);
export type ScrollViewRef = Native.ScrollView;
export const TextInput = themed(Native.TextInput, true);
export const Pressable = themed(Native.Pressable);
export const Image = themed(Native.Image);
export const KeyboardAvoidingView = themed(Native.KeyboardAvoidingView);
export const ActivityIndicator = themed(Native.ActivityIndicator);
export const SafeAreaView = themed(NativeSafeAreaView);

export const Switch = themed(Native.Switch);

// Icon strokes/fills are foreground ink even when drawn with a View background.
export function IconView(props: ComponentProps<typeof Native.View>) {
  const { theme } = useAppearance();
  const flat = Native.StyleSheet.flatten(props.style) || {};
  const style = theme === 'dark' ? Object.fromEntries(Object.entries(flat).map(([key, value]) => [key, typeof value === 'string' && /color$/i.test(key) ? darkColor(value, 'color') : value])) : flat;
  return <Native.View {...props} style={style} />;
}
