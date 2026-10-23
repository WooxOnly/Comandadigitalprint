import { darkColor } from '../../shared/appearance.mjs';
import { compactLandscapeStyle } from './layoutDensity';

// StyleSheet definitions are immutable. Weak keys also allow temporary inline
// styles to be collected, rather than retaining every rendered screen forever.
export function createThemedStyleResolver(flatten: (style: any) => unknown) {
  const cache = new WeakMap<object, Map<number, unknown>>();
  return function resolve(style: unknown, dark: boolean, compact: boolean): unknown {
    if ((!dark && !compact) || !style) return style;
    // Arrays can contain mutable animated values. Cache only static plain styles.
    const cacheable = typeof style === 'object' && !Array.isArray(style) && Object.isFrozen(style);
    const key = Number(dark) + 2 * Number(compact);
    if (cacheable && cache.get(style as object)?.has(key)) return cache.get(style as object)!.get(key);
    const flat = flatten(style) as Record<string, unknown> | undefined;
    if (!flat) return style;
    const sized = compact ? compactLandscapeStyle(flat) : flat;
    const result = dark ? Object.fromEntries(Object.entries(sized).map(([name, value]) => [name, typeof value === 'string' && /color$/i.test(name) ? darkColor(value, name) : value])) : sized;
    if (cacheable) {
      let modes = cache.get(style as object);
      if (!modes) { modes = new Map(); cache.set(style as object, modes); }
      modes.set(key, result);
    }
    return result;
  };
}
