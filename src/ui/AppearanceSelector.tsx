import { useState } from 'react';
import { View, Text, Pressable } from './ThemedNative';
import { useAppearance } from './AppearanceContext';
import { translate, type Language } from '../i18n/translations';
export function AppearanceSelector({ language = 'pt' }: { language?: Language }) {
  const { theme, setTheme } = useAppearance();
  const [failed, setFailed] = useState(false);
  return <View style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {(['light', 'dark'] as const).map(value => <Pressable testID={'theme-' + value} key={value} accessibilityRole='radio' accessibilityLabel={translate(value === 'light' ? 'Tema claro' : 'Tema escuro', language)} accessibilityState={{ checked: theme === value }} aria-checked={theme === value} onPress={() => { void setTheme(value).then(() => setFailed(false), () => setFailed(true)); }} style={{ minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme === value ? '#214B40' : '#DBE2DC', backgroundColor: theme === value ? '#E8F1EC' : '#FFFFFF' }}><Text style={{ color: '#214B40', fontSize: 12, fontWeight: '700' }}>{translate(value === 'light' ? 'Claro' : 'Escuro', language)}</Text></Pressable>)}
    </View>
    {failed && <Text accessibilityLiveRegion='polite' style={{ color: '#AE4328', fontSize: 12 }}>{translate('Não foi possível salvar o tema.', language)}</Text>}
  </View>;
}
