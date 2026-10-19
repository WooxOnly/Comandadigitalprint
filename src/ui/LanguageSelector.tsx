import { DropdownChevron } from './DropdownChevron';
import { useRef, useState, type ComponentRef } from 'react';
import { Image, Modal, Text, useWindowDimensions, StyleSheet, View } from './ThemedNative';
import { translate, type Language } from '../i18n/translations';
import { KeyboardPressable as Pressable } from './KeyboardControls';
import { COLORS } from './theme';

const choices = [
  { value: 'pt', label: 'Português', flag: require('../../assets/flags/brazil.png') },
  { value: 'en', label: 'English', flag: require('../../assets/flags/united-states.png') },
  { value: 'es', label: 'Español', flag: require('../../assets/flags/spain.png') },
] as const;

export function LanguageSelector({ language, onChange, disabled = false }: {
  language: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const { width, height } = useWindowDimensions();
  const current = choices.find(choice => choice.value === language) || choices[0];
  return <View ref={anchor} collapsable={false} style={{ flexShrink: 0 }}>
    <Pressable testID="language-trigger" disabled={disabled} accessibilityRole="button" accessibilityLabel={translate('Idioma', language) + ': ' + current.label} accessibilityState={{ expanded: !!position, disabled }} aria-expanded={!!position} onPress={() => anchor.current?.measureInWindow((x, y, _w, h) => setPosition({ left: Math.max(8, Math.min(x, width - 188)), top: Math.max(8, Math.min(y + h, height - 156)) }))} style={flagStyles.trigger}>
      <View testID="language-trigger-face" style={[flagStyles.triggerFace, !!position && flagStyles.selected]}><Image source={current.flag} accessible={false} resizeMode="contain" style={flagStyles.image} /><DropdownChevron expanded={!!position} /></View>
    </Pressable>
    <Modal transparent visible={!!position} animationType="none" onRequestClose={() => setPosition(null)}>
      <Pressable accessible={false} onPress={() => setPosition(null)} style={StyleSheet.absoluteFill} />
      <View accessibilityLabel={translate('Idioma', language)} style={[flagStyles.menu, { left: Math.max(8, Math.min(position?.left || 8, width - 188)), top: Math.max(8, Math.min(position?.top || 8, height - 156)) }]}>
        {choices.map(({ value, label, flag }) => <Pressable key={value} disabled={disabled} accessibilityLabel={label} accessibilityRole="radio" accessibilityState={{ checked: language === value, disabled }} aria-checked={language === value} onPress={() => { setPosition(null); if (value !== language) onChange(value); }} style={[flagStyles.option, language === value && flagStyles.selected]}>
          <Image source={flag} accessible={false} resizeMode="contain" style={flagStyles.image} /><Text style={{ fontSize: 14, color: COLORS.green, flexShrink: 1 }}>{label}</Text>
        </Pressable>)}
      </View>
    </Modal>
  </View>;
}

const flagStyles = StyleSheet.create({
  trigger: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' },
  triggerFace: { width: 48, height: 32, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAF8' },
  menu: { position: 'absolute', width: 180, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF', boxShadow: '0px 4px 16px rgba(0,0,0,0.16)' },
  option: { minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 8 },
  selected: { backgroundColor: COLORS.greenSoft },
  image: { width: 16, height: 12, borderRadius: 1 },
});
