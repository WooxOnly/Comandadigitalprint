import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
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
  return <View><Text style={styles.panelTitle}>{t('Idioma')}</Text><View style={styles.quickNotes}>
    {([['pt', 'Português'], ['en', 'English'], ['es', 'Español']] as const).map(([value, label]) => <Pressable key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{ checked: language === value, disabled: busy }} onPress={() => change(value)} style={[styles.noteChip, language === value && styles.selectedCategory]}><Text style={[styles.noteChipText, language === value && styles.selectedCategoryText]}>{label}</Text></Pressable>)}
  </View></View>;
}
