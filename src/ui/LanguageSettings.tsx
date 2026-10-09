import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../i18n/LanguageContext';
import { type Language } from '../i18n/translations';
import { styles } from './theme';

export function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();
  const [busy, setBusy] = useState(false);
  async function change(value: Language) {
    setBusy(true);
    try { await setLanguage(value); }
    catch { Alert.alert(t('Falha ao salvar'), t('Não foi possível salvar a configuração.')); }
    finally { setBusy(false); }
  }
  return <View><Text style={styles.panelTitle}>{t('Idioma')}</Text><LanguageSelector language={language} disabled={busy} onChange={(value) => void change(value)} /></View>;
}
