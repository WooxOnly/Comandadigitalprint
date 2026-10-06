import { searchCatalog } from '../services/catalogOptions';
import { Text, View } from 'react-native';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { useApp } from '../state/AppContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatMoney, parseMoney, type BusinessItem } from '../services/business';
import { styles } from './theme';
import { useState } from 'react';
import { randomUUID } from 'expo-crypto';

export function BusinessItemsEditor({ items, onChange, priced, disabled = false, priceEditable = true }: { items: BusinessItem[]; onChange: (items: BusinessItem[]) => void; priced: boolean; disabled?: boolean; priceEditable?: boolean }) {
  const { menu, productOptions } = useApp();
  const { t, locale } = useLanguage();
  const [search, setSearch] = useState('');
  return <View style={{ gap: 8 }}>
    <Text style={styles.sectionTitle}>{t('Itens')}</Text>
    {items.map((item, index) => <View key={item.id} style={styles.historyCard}>
      <Text style={styles.cardTitle}>{item.quantity}x {item.name}</Text>
      <View style={styles.quickNotes}>
        <Pressable accessibilityRole="button" disabled={disabled} style={styles.noteChip} accessibilityLabel={t('Diminuir quantidade')} onPress={() => onChange(items.flatMap((entry, i) => i !== index ? [entry] : entry.quantity > 1 ? [{ ...entry, quantity: entry.quantity - 1 }] : []))}><Text style={styles.noteChipText}>−</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} style={styles.noteChip} accessibilityLabel={t('Aumentar quantidade')} onPress={() => onChange(items.map((entry, i) => i === index ? { ...entry, quantity: Math.min(9999, entry.quantity + 1) } : entry))}><Text style={styles.noteChipText}>+</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} style={styles.noteChip} onPress={() => onChange(items.filter((_, i) => i !== index))}><Text style={styles.noteChipText}>{t('Excluir')}</Text></Pressable>
      </View>
      {priced && <PriceField item={item} disabled={disabled || !priceEditable} onChange={value => onChange(items.map((entry, i) => i === index ? { ...entry, unitPriceCents: value } : entry))} />}
      <Text style={styles.fieldLabel}>{t('Observações')}</Text>
      <TextInput editable={!disabled} value={item.note} style={styles.input} maxLength={4000} multiline accessibilityLabel={t('Observações')} onChangeText={note => onChange(items.map((entry, i) => i === index ? { ...entry, note } : entry))} />
    </View>)}
    <TextInput editable={!disabled} value={search} onChangeText={setSearch} style={styles.input} placeholder={t('Buscar produto')} accessibilityLabel={t('Buscar produto')} />
    <Text style={styles.helperText}>{t('Nos módulos, use as observações para informar sabores e adicionais. O preço unitário é o valor final do item.')}</Text>
    {searchCatalog(menu, productOptions, search).slice(0, 30).map(product => <Pressable accessibilityRole="button" disabled={disabled || items.length >= 200 || productOptions[product.id]?.available === false} key={product.id} style={styles.productCard} onPress={() => onChange([...items, { id: randomUUID(), productId: product.id, name: product.name, category: product.category, quantity: 1, note: '', ...(priced ? { unitPriceCents: Math.round(product.price * 100) } : {}) }])}>
      <Text style={[styles.cardTitle, { flex: 1 }]}>{productOptions[product.id]?.favorite ? '★ ' : ''}{product.name}{productOptions[product.id]?.available === false ? ` · ${t('Esgotado')}` : ''}{priced ? ` · ${formatMoney(Math.round(product.price * 100), locale)}` : ''}</Text><Text style={styles.productArrowText}>+</Text>
    </Pressable>)}
    {items.length >= 200 && <Text style={styles.errorText}>{t('Limite de itens atingido.')}</Text>}
  </View>;
}
function PriceField({ item, onChange, disabled }: { item: BusinessItem; onChange: (cents: number | undefined) => void; disabled: boolean }) {
  const { t } = useLanguage();
  const [text, setText] = useState(() => item.unitPriceCents === undefined ? '' : (item.unitPriceCents / 100).toFixed(2));
  return <><Text style={styles.fieldLabel}>{t('Preço unitário (USD)')}</Text><TextInput editable={!disabled} value={text} keyboardType="decimal-pad" style={styles.input} maxLength={11} accessibilityLabel={t('Preço unitário (USD)')} onChangeText={value => { setText(value); try { onChange(parseMoney(value)); } catch { onChange(undefined); } }} /></>;
}
