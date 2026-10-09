import { Image, StyleSheet, View } from 'react-native';
import { type Language } from '../i18n/translations';
import { KeyboardPressable as Pressable } from './KeyboardControls';
import { COLORS, styles } from './theme';

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
  return <View style={styles.quickNotes}>
    {choices.map(({ value, label, flag }) => <Pressable
      key={value}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: language === value, disabled }}
      aria-checked={language === value}
      aria-disabled={disabled}
      onPress={() => onChange(value)}
      style={[flagStyles.button, language === value && flagStyles.selected, disabled && styles.pressed]}
    >
      <Image source={flag} accessible={false} resizeMode="contain" style={flagStyles.image} />
    </Pressable>)}
  </View>;
}

const flagStyles = StyleSheet.create({
  button: { minWidth: 64, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 2, borderColor: 'transparent', backgroundColor: COLORS.greenSoft },
  selected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  image: { width: 32, height: 24, borderRadius: 3 },
});
