import { useState } from 'react';
import { Text, View } from './ThemedNative';
import { KeyboardTextInput as TextInput } from './KeyboardControls';
import { useLanguage } from '../i18n/LanguageContext';
import { datePartsISO, type DateParts, type TimeParts } from '../services/scheduledDate';
import { styles } from './theme';
export function ScheduledDateFields({ date, time, onDate, onTime, disabled = false, submitted = false, filter = false }: { date: DateParts; time?: TimeParts; onDate: (value: DateParts) => void; onTime?: (value: TimeParts) => void; disabled?: boolean; submitted?: boolean; filter?: boolean }) {
  const { t } = useLanguage(); const [touched, setTouched] = useState<Record<string, boolean>>({});
  function field(key: keyof DateParts | keyof TimeParts, label: string, value: string, max: number, change: (value: string) => void) {
    const invalid = !value || (key === 'year' ? !/^\d{4}$/.test(value) || +value < 2000 : key === 'month' ? +value < 1 || +value > 12 : key === 'day' ? +value < 1 || +value > 31 || (!!datePartsISO({ ...date, day: '1' }) && !datePartsISO(date)) : key === 'hour' ? +value > 23 : +value > 59);
    const show = (submitted || touched[key]) && invalid;
    return <View key={key} style={{ flex: 1, minWidth: key === 'year' ? 90 : 72 }}><Text style={styles.fieldLabel}>{t(label)} *</Text><TextInput testID={`${filter ? 'scheduled-filter' : 'scheduled'}-${key}`} accessibilityLabel={t(label)} value={value} editable={!disabled} keyboardType="number-pad" maxLength={max} style={[styles.input, show && { borderColor: '#c6462b' }]} onChangeText={text => change(text.replace(/\D/g, '').slice(0, max))} onBlur={() => { setTouched(previous => ({ ...previous, [key]: true })); if (value && max === 2) change(value.padStart(2, '0')); }} />{show && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(!value ? 'Campo obrigatório.' : 'Valor inválido.')}</Text>}</View>;
  }
  return <View style={{ gap: 8 }}><Text style={styles.fieldLabel}>{t(filter ? 'Data da agenda' : 'Data da retirada/entrega')} *</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['month', 'day', 'year'] as const).map((key, index) => field(key, ['Mês', 'Dia', 'Ano'][index], date[key], key === 'year' ? 4 : 2, value => onDate({ ...date, [key]: value })))}</View>{time && onTime && <><Text style={styles.fieldLabel}>{t('Horário da retirada/entrega')} *</Text><Text style={styles.helperText}>{t('Formato de 24 horas, no horário deste tablet.')}</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['hour', 'minute'] as const).map((key, index) => field(key, ['Hora', 'Minuto'][index], time[key], 2, value => onTime({ ...time, [key]: value })))}</View></>}</View>;
}
