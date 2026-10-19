import { useState } from 'react';
import { View, Text, Pressable } from './ThemedNative';
import { useAppearance } from './AppearanceContext';
import { translate, type Language } from '../i18n/translations';
function ThemeIcon({ dark }: { dark: boolean }) {
  // Explicit drawing colors keep icon strokes distinct from themed surface/border colors.
  const color = 'rgb(33,75,64)';
  const background = 'rgb(255,255,255)';
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
  return <View style={{ flexShrink: 0 }}>
    <Pressable testID="theme-switch" accessibilityRole="switch" accessibilityLabel={translate('Tema escuro', language)} accessibilityState={{ checked: theme === 'dark' }} aria-checked={theme === 'dark'} onPress={() => { void setTheme(theme === 'dark' ? 'light' : 'dark').then(() => setFailed(false), () => setFailed(true)); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View accessible={false} style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: theme === 'dark' ? 'rgb(33,75,64)' : 'rgb(210,216,214)', justifyContent: 'center', paddingHorizontal: 2 }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, alignSelf: theme === 'dark' ? 'flex-end' : 'flex-start', backgroundColor: 'rgb(255,255,255)', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 1px 3px rgba(0,0,0,0.2)' }}><View style={{ width: 22, height: 22, transform: [{ scale: 0.6 }] }}><ThemeIcon dark={theme === 'dark'} /></View></View>
      </View>
    </Pressable>
    {failed && <Text accessibilityLiveRegion="polite" style={{ color: '#AE4328', fontSize: 12 }}>{translate('Não foi possível salvar o tema.', language)}</Text>}
  </View>;
}
