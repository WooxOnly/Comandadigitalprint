import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { translate, LOCALES, type Language } from './translations';

const KEY = '@comandadigitalprint/language';
const LanguageContext = createContext<ReturnType<typeof useLanguageState> | null>(null);
function useLanguageState() {
  const [language, setCurrent] = useState<Language>('pt');
  const [ready, setReady] = useState(false);
  const lock = useRef(false);
  useEffect(() => { AsyncStorage.getItem(KEY).then((value) => {
    if (value === 'pt' || value === 'en' || value === 'es') setCurrent(value);
  }).finally(() => setReady(true)).catch(() => {}); }, []);
  async function setLanguage(value: Language) {
    if (lock.current) return;
    lock.current = true;
    try { await AsyncStorage.setItem(KEY, value); setCurrent(value); }
    finally { lock.current = false; }
  }
  return { language, locale: LOCALES[language], ready, setLanguage, t: (text: string) => translate(text, language) };
}
export function LanguageProvider({ children }: { children: ReactNode }) {
  const value = useLanguageState();
  return <LanguageContext.Provider value={value}>{value.ready ? children : null}</LanguageContext.Provider>;
}
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider missing');
  return value;
}
