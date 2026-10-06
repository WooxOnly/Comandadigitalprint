import { Alert, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { printPrinterTest } from '../../printerService';
import { useApp } from '../state/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAccess } from './useAccess';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { styles } from './theme';
import type { PrinterDestination } from '../services/printerRouting';
export function PrinterDestinations() {
  const { printerSettings, updatePrinterSettings, categories } = useApp(), { t, language } = useLanguage(), allowed = useAccess('settings');
  const routing = printerSettings.routing ?? { enabled: false, destinations: [] };
  const save = (change: Partial<typeof routing>) => updatePrinterSettings({ routing: { ...routing, ...change } });
  const update = (id: string, change: Partial<PrinterDestination>) => save({ destinations: routing.destinations.map(target => target.id === id ? { ...target, ...change } : target) });
  return <View style={{ gap: 8 }}><Text style={styles.panelTitle}>{t('Impressoras por destino')}</Text><Text style={styles.helperText}>{t('Distribua categorias entre impressoras de rede. Categorias sem destino usam a impressora principal.')}</Text>
    <Pressable disabled={!allowed} style={styles.noteChip} onPress={() => save({ enabled: !routing.enabled })}><Text style={styles.noteChipText}>{t(routing.enabled ? 'Desativar destinos' : 'Ativar destinos')}</Text></Pressable>
    {routing.destinations.map(target => <View key={target.id} style={styles.historyCard}>
      {([['name', 'Nome do destino'], ['address', 'Endereço IP da impressora'], ['port', 'Porta de rede']] as const).map(([field, label]) => <View key={field}><Text style={styles.fieldLabel}>{t(label)}</Text><TextInput editable={allowed} value={target[field]} onChangeText={text => update(target.id, { [field]: text })} style={styles.input} maxLength={200} accessibilityLabel={t(label)} /></View>)}
      <View style={styles.quickNotes}>{(['58', '80', '88'] as const).map(paperWidth => <Pressable disabled={!allowed} key={paperWidth} style={[styles.noteChip, target.paperWidth === paperWidth && styles.selectedCategory]} onPress={() => update(target.id, { paperWidth })}><Text style={styles.noteChipText}>{paperWidth} mm</Text></Pressable>)}</View>
      <Text style={styles.fieldLabel}>{t('Categorias deste destino')}</Text><View style={styles.quickNotes}>{[...new Set([...categories.filter(value => value !== 'Todos'), ...target.categories])].map(category => <Pressable key={category} disabled={!allowed} style={[styles.noteChip, target.categories.includes(category) && styles.selectedCategory]} onPress={() => save({ destinations: routing.destinations.map(destination => destination.id === target.id ? { ...destination, categories: target.categories.includes(category) ? target.categories.filter(value => value !== category) : [...target.categories, category] } : { ...destination, categories: destination.categories.filter(value => value !== category) }) })}><Text style={styles.noteChipText}>{t(category)}</Text></Pressable>)}</View>
      <Pressable disabled={!allowed} style={styles.noteChip} onPress={() => save({ receiptDestinationId: routing.receiptDestinationId === target.id ? undefined : target.id })}><Text style={styles.noteChipText}>{t(routing.receiptDestinationId === target.id ? '✓ Recibos neste destino' : 'Usar para recibos do cliente')}</Text></Pressable>
      <View style={styles.quickNotes}><Pressable disabled={!allowed} style={styles.noteChip} onPress={() => { void printPrinterTest({ connection: 'wifi', ...target }, language).catch(e => Alert.alert(t('Impressão indisponível'), t(e.message))); }}><Text style={styles.noteChipText}>{t('Testar destino')}</Text></Pressable><Pressable disabled={!allowed} style={styles.noteChip} onPress={() => save({ destinations: routing.destinations.filter(destination => destination.id !== target.id), ...(routing.receiptDestinationId === target.id ? { receiptDestinationId: undefined } : {}) })}><Text style={styles.noteChipText}>{t('Excluir')}</Text></Pressable></View>
    </View>)}
    <Pressable disabled={!allowed || routing.destinations.length >= 8} style={styles.addButton} onPress={() => save({ destinations: [...routing.destinations, { id: randomUUID(), name: `${t('Destino')} ${routing.destinations.length + 1}`, address: '', port: '9100', paperWidth: '80', categories: [] }] })}><Text style={styles.addButtonText}>{t('Adicionar destino')}</Text></Pressable>
    <Text style={styles.helperText}>{t('Use Salvar configurações para confirmar os destinos neste tablet.')}</Text>
  </View>;
}
