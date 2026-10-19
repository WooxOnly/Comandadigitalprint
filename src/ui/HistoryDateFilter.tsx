import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { historyDateRange, historyDateText, historyPeriods, type HistoryPeriod } from '../services/historyDates';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from './ThemedNative';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { COLORS, styles } from './theme';

type Range = { period: HistoryPeriod; start: number; end: number };
export function HistoryDateFilter({ range, onApply }: { range: Range; onApply: (range: Range) => void }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false), [period, setPeriod] = useState<HistoryPeriod>('today');
  const [from, setFrom] = useState(''), [through, setThrough] = useState(''), [error, setError] = useState('');
  function show() {
    setPeriod(range.period);
    setFrom(historyDateText(new Date(range.start), language));
    setThrough(historyDateText(new Date(range.end - 1), language));
    setError(''); setOpen(true);
  }
  function apply() {
    try { onApply({ period, ...historyDateRange(period, new Date(), from, through, language) }); setOpen(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Informe datas válidas no formato indicado.'); }
  }
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <Text style={styles.helperText}>{t(historyPeriods.find(choice => choice.value === range.period)!.label)}</Text>
      <Pressable testID="history-date-filter" accessibilityRole="button" accessibilityLabel={t('Filtrar por data')} accessibilityState={{ expanded: open }} onPress={show} style={[styles.addButton, { width: 44, paddingHorizontal: 0, alignItems: 'center' }]}>
        <View accessible={false} pointerEvents="none" style={{ alignItems: 'center' }}>
          <View style={{ width: 18, height: 0, borderTopWidth: 10, borderTopColor: COLORS.green, borderLeftWidth: 7, borderRightWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' }} />
          <View style={{ width: 4, height: 7, backgroundColor: COLORS.green, marginTop: -1 }} />
        </View>
      </Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalBackdrop, { justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
        <View testID="history-date-dialog" accessibilityViewIsModal style={[styles.panel, { width: '100%', maxWidth: 440, maxHeight: '90%', gap: 12 }]}>
          <Text style={styles.panelTitle}>{t('Filtrar por data')}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
            {historyPeriods.map(choice => <Pressable key={choice.value} accessibilityRole="radio" aria-checked={period === choice.value} accessibilityState={{ checked: period === choice.value }} onPress={() => { setPeriod(choice.value); setError(''); }} style={[styles.noteChip, period === choice.value && styles.selectedCategory]}>
              <Text style={[styles.noteChipText, period === choice.value && styles.selectedCategoryText]}>{t(choice.label)}</Text>
            </Pressable>)}
            {period === 'custom' && <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={styles.helperText}>{t('Formato da data')}: {language === 'en' ? 'MM/DD/YYYY' : 'DD/MM/AAAA'}</Text>
              <Text style={styles.fieldLabel}>{t('Data inicial')}</Text>
              <TextInput accessibilityLabel={t('Data inicial')} value={from} onChangeText={setFrom} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} style={styles.input} />
              <Text style={styles.fieldLabel}>{t('Data final')}</Text>
              <TextInput accessibilityLabel={t('Data final')} value={through} onChangeText={setThrough} keyboardType="numbers-and-punctuation" maxLength={10} autoCorrect={false} style={styles.input} />
            </View>}
            {!!error && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(error)}</Text>}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={[styles.cancelButton, { marginTop: 0, paddingHorizontal: 12 }]}><Text style={styles.cancelButtonText}>{t('Cancelar')}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={apply} style={[styles.sendButton, { marginTop: 0 }]}><Text style={styles.sendButtonText}>{t('Aplicar')}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
