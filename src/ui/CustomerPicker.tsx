import { useState } from 'react';
import { Text, View } from 'react-native';
import { useBusiness } from '../state/BusinessContext';
import { useLanguage } from '../i18n/LanguageContext';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { styles } from './theme';
import type { Customer } from '../services/business';
export function CustomerPicker({ selectedId, onSelect, disabled }: { selectedId?: string; onSelect: (customer: Customer | null) => void; disabled: boolean }) {
  const { modules, customers } = useBusiness(), { t } = useLanguage();
  const [search, setSearch] = useState('');
  if (!modules.customers) return null;
  const matching = customers.filter(customer => customer.active && `${customer.name} ${customer.phone} ${customer.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <View style={{ gap: 8 }}><Text style={styles.fieldLabel}>{t('Selecionar cliente cadastrado (opcional)')}</Text>
    <TextInput value={search} onChangeText={setSearch} editable={!disabled} maxLength={200} style={styles.input} accessibilityLabel={t('Buscar cliente')} />
    <View style={styles.quickNotes}>{matching.slice(0, 10).map(customer => <Pressable key={customer.id} accessibilityRole="button" disabled={disabled} style={[styles.noteChip, selectedId === customer.id && styles.selectedCategory]} onPress={() => onSelect(customer)}><Text style={[styles.noteChipText, selectedId === customer.id && styles.selectedCategoryText]}>{customer.name} · {customer.phone || customer.email}</Text></Pressable>)}</View>
    {matching.length > 10 && <Text style={styles.helperText}>{t('Mostrando os dez primeiros clientes. Refine a busca.')}</Text>}
    {selectedId && <Pressable disabled={disabled} style={styles.cancelButton} onPress={() => onSelect(null)}><Text style={styles.cancelButtonText}>{t('Desvincular cliente')}</Text></Pressable>}
  </View>;
}
