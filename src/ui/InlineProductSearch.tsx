import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Animated, Easing, TextInput, View } from './ThemedNative';
import { KeyboardPressable as Pressable } from './KeyboardControls';
import { useLanguage } from '../i18n/LanguageContext';
import { COLORS } from './theme';

export function InlineProductSearch({ open, value, width, onChange, onToggle, onOpened }: {
  open: boolean; value: string; width: number; onChange: (text: string) => void; onToggle: () => void; onOpened: () => void;
}) {
  const { t } = useLanguage();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [expansion] = useState(() => new Animated.Value(open ? width : 0));
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const animation = Animated.timing(expansion, { toValue: open ? width : 0, duration: reduceMotion ? 0 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start(({ finished }) => { if (finished && open) { onOpened(); input.current?.focus(); } });
    return () => animation.stop();
  }, [open, width, reduceMotion, expansion, onOpened]);
  return <View testID="inline-product-search" style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, minHeight: 44, borderWidth: 1, borderColor: open ? COLORS.green : COLORS.border, backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden' }}>
    <Animated.View style={{ width: expansion, overflow: 'hidden' }}>
      {open && <TextInput ref={input} testID="product-search-input" returnKeyType="search" submitBehavior="blurAndSubmit" disableFullscreenUI underlineColorAndroid="transparent" value={value} onChangeText={onChange} maxLength={200} placeholder={t('Buscar produto')} accessibilityLabel={t('Buscar produto')} autoCorrect={false} autoCapitalize="none" style={{ width, minHeight: 44, paddingLeft: 10, paddingRight: 4, paddingVertical: 6, borderWidth: 0, outlineWidth: 0, outlineStyle: 'solid', backgroundColor: 'transparent', color: COLORS.ink, fontSize: 14 }} />}
    </Animated.View>
    <Pressable testID="toggle-product-search" accessibilityRole="button" accessibilityLabel={t(open ? 'Fechar busca' : 'Buscar produto')} accessibilityState={{ expanded: open }} onPress={onToggle} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View accessible={false} pointerEvents="none" style={{ width: 20, height: 20 }}>
        <View style={{ width: 14, height: 14, borderWidth: 1.7, borderColor: COLORS.green, borderRadius: 7 }} />
        <View style={{ width: 8, height: 1.7, position: 'absolute', top: 14, left: 11, borderRadius: 1, backgroundColor: COLORS.green, transform: [{ rotate: '45deg' }] }} />
      </View>
    </Pressable>
  </View>;
}
