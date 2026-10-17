import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform, useWindowDimensions } from 'react-native';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { THEME_STORAGE_KEY, validTheme } from '../../shared/appearance.mjs';
export type ColorTheme = 'light' | 'dark';
const AppearanceContext = createContext({ theme: 'light' as ColorTheme, compactLandscape: false, setTheme: async (_theme: ColorTheme) => {} });
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { width, height, fontScale } = useWindowDimensions();
  const compactLandscape = width >= 760 && width > height && fontScale < 1.4;
  const [theme, setCurrent] = useState<ColorTheme>(() => Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
  const [ready, setReady] = useState(false);
  const writing = useRef(false);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then(value => { if (active && validTheme(value)) setCurrent(value); }).catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (ready && Platform.OS !== 'web') Appearance.setColorScheme(theme); }, [theme, ready]);
  async function setTheme(value: ColorTheme) {
    if (!validTheme(value) || writing.current) return;
    writing.current = true;
    try { await AsyncStorage.setItem(THEME_STORAGE_KEY, value); setCurrent(value); }
    finally { writing.current = false; }
  }
  return <AppearanceContext.Provider value={{ theme, setTheme, compactLandscape }}>{ready ? children : null}</AppearanceContext.Provider>;
}
export const useAppearance = () => useContext(AppearanceContext);
