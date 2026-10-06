import { useState } from 'react';
import { Text } from 'react-native';
import { KeyboardTextInput as TextInput } from './KeyboardControls';
import { styles } from './theme';
import { parseMoney } from '../services/business';
import { useLanguage } from '../i18n/LanguageContext';
export function ProductPriceInput({ price, onChange, editable = true }: { price: number; onChange: (price: number) => void; editable?: boolean }) {
  const { t } = useLanguage();
  const [text, setText] = useState(() => price.toFixed(2));
  return <><Text style={styles.fieldLabel}>{t('Preço do produto (USD)')}</Text><TextInput editable={editable} value={text} keyboardType="decimal-pad" maxLength={11} style={styles.input} accessibilityLabel={t('Preço do produto (USD)')} onChangeText={value => { setText(value); try { onChange(parseMoney(value) / 100); } catch { onChange(Number.NaN); } }} /></>;
}
