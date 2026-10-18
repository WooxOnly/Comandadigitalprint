import { useState } from 'react';
import { View, Text, Pressable } from './ThemedNative';
import { useAppearance } from './AppearanceContext';
import { translate, type Language } from '../i18n/translations';
function ThemeIcon({ dark, selected }: { dark: boolean; selected: boolean }) {
  const { theme } = useAppearance();
  // Explicit drawing colors keep icon strokes distinct from themed surface/border colors.
  const color = theme === 'dark' ? 'rgb(243,165,136)' : 'rgb(33,75,64)';
  const background = theme === 'dark' ? (selected ? 'rgb(44,46,50)' : 'rgb(36,38,41)') : (selected ? 'rgb(232,241,236)' : 'rgb(255,255,255)');
  return <View accessible={false} testID={dark ? 'theme-icon-moon' : 'theme-icon-sun'} style={{ width: 22, height: 22 }}>
    {dark ? <><View style={{ position: 'absolute', left: 1, top: 2, width: 19, height: 19, borderRadius: 10, backgroundColor: color }} /><View style={{ position: 'absolute', left: 7, top: -1, width: 17, height: 17, borderRadius: 9, backgroundColor: background }} /></> : <>
      <View style={{ position: 'absolute', left: 6, top: 6, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color }} />
      {Array.from({ length: 8 }, (_, index) => <View key={index} style={{ position: 'absolute', width: 22, height: 22, transform: [{ rotate: (index * 45) + 'deg' }] }}><View style={{ position: 'absolute', left: 10, top: 0, width: 2, height: 4, borderRadius: 1, backgroundColor: color }} /></View>)}
    </>}
  </View>;
}
export function AppearanceSelector({ language = 'pt' }: { language?: Language }) {
  const { theme, setTheme } = useAppearance();
  const [failed, setFailed] = useState(false);
  return <View style={{ alignSelf: 'flex-end', flexShrink: 0 }}>
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {(['light', 'dark'] as const).map(value => <Pressable testID={'theme-' + value} key={value} accessibilityRole='radio' accessibilityLabel={translate(value === 'light' ? 'Tema claro' : 'Tema escuro', language)} accessibilityState={{ checked: theme === value }} aria-checked={theme === value} onPress={() => { void setTheme(value).then(() => setFailed(false), () => setFailed(true)); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme === value ? '#214B40' : '#DBE2DC', backgroundColor: theme === value ? '#E8F1EC' : '#FFFFFF' }}><ThemeIcon dark={value === 'dark'} selected={theme === value} /></Pressable>)}
    </View>
    {failed && <Text accessibilityLiveRegion='polite' style={{ color: '#AE4328', fontSize: 12 }}>{translate('Não foi possível salvar o tema.', language)}</Text>}
  </View>;
}
