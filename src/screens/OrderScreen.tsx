import { useStoreModules } from '../ui/useStoreModules';
import { formatMoney } from '../services/business';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { describeExtra } from '../../orderItems';
import { itemName, translatedNote } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';
import { useApp } from '../state/AppContext';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { OrderWorkspace } from '../ui/OrderWorkspace';
import { styles, COLORS, PLATES, QUICK_NOTES } from '../ui/theme';

export default function OrderScreen() {
  const { t, language, locale } = useLanguage();
  const modules = useStoreModules();
  const [editingIdentity, setEditingIdentity] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [serviceModeError, setServiceModeError] = useState(false);
  const [plateListWidth, setPlateListWidth] = useState(0);
  const plateWidth = plateListWidth ? (plateListWidth - 9 * 2) / 10 : undefined;
  const { productOptions, productSearch, setProductSearch, favoritesOnly, setFavoritesOnly, plate, setPlate, serviceMode, setServiceMode, customPlate, setCustomPlate, customer, changeCustomer, orderSettings, customerError, categories, category, setCategory, subcategories, subcategory, setSubcategory, filteredMenu, openProduct, items, changeQuantity, updateNote, sendOrder, sending, isReady, isWide } = useApp();
  const currentPlate = customPlate.trim() || plate;
  const itemCount = `${items.length} ${t(items.length === 1 ? 'item' : 'itens')}`;
  const serviceLabel = serviceMode === 'dine_in' ? 'Para comer aqui' : serviceMode === 'takeout' ? 'Para levar' : null;
  const identityOpen = editingIdentity || !serviceMode;
  const disabled = sending || !isReady || items.length === 0;

  function finishOrder() {
    if (!serviceMode) {
      setServiceModeError(true);
      setEditingIdentity(true);
      return;
    }
    if (orderSettings.requireCustomer && !customer.trim()) setEditingIdentity(true);
    void sendOrder(() => {
      setEditingIdentity(true);
      setExpandedItemId(null);
    });
  }

  const identity = <View style={styles.panel}>
    <View style={layout.sectionHeader}>
      <View style={layout.sectionTitle}>
        <Text style={styles.panelTitle}>{t('Identificação')}</Text>
        {!identityOpen && <Text style={styles.mutedText}>{t(serviceLabel!)} · {t('Mesa')} {currentPlate}{customer.trim() ? ` · ${customer.trim()}` : ''}</Text>}
      </View>
      {!!serviceMode && <Pressable onPress={() => setEditingIdentity(!identityOpen)} accessibilityRole="button" accessibilityState={{ expanded: identityOpen }} style={layout.editButton}><Text style={layout.editButtonText}>{t(identityOpen ? 'Ocultar detalhes' : 'Editar')}</Text></Pressable>}
    </View>
    {identityOpen && <>
      <Text style={styles.fieldLabel}>{t('Onde será consumido?')}</Text>
      <View style={layout.serviceOptions}>{(['dine_in', 'takeout'] as const).map((value) => <Pressable key={value} onPress={() => { setServiceMode(value); setServiceModeError(false); }} accessibilityRole="radio" accessibilityState={{ checked: serviceMode === value }} style={[styles.paperOption, layout.serviceOption, serviceMode === value && styles.selectedConnection]}><Text style={[styles.connectionText, serviceMode === value && styles.selectedConnectionText]}>{t(value === 'dine_in' ? 'Para comer aqui' : 'Para levar')}</Text></Pressable>)}</View>
      {serviceModeError && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t('Escolha se o pedido é para comer aqui ou para levar.')}</Text>}
      <Text style={styles.fieldLabel}>{t('Mesa')}</Text>
      <View style={styles.plateList} onLayout={(event) => setPlateListWidth(event.nativeEvent.layout.width)}>{PLATES.map((value) => <Pressable key={value} onPress={() => { setPlate(value); setCustomPlate(''); }} accessibilityRole="radio" accessibilityLabel={t('Mesa ') + value} accessibilityState={{ checked: value === plate && !customPlate }} style={[styles.plate, { width: plateWidth }, value === plate && !customPlate && styles.selectedPlate]}><Text style={[styles.plateText, value === plate && !customPlate && styles.selectedPlateText]}>{t(value)}</Text></Pressable>)}</View>
      <View style={[styles.identityFields, isWide && styles.identityFieldsWide]}>
        <View style={styles.identityField}><Text style={styles.fieldLabel}>{t('Outro número de mesa (opcional)')}</Text><TextInput editable={!sending} value={customPlate} onChangeText={setCustomPlate} accessibilityLabel={t('Outro número de mesa')} placeholder={t('Outro número de mesa (opcional)')} placeholderTextColor={COLORS.placeholder} style={styles.input} /></View>
        <View style={styles.identityField}><Text style={styles.fieldLabel}>{t('Cliente')} {orderSettings.requireCustomer ? t('(obrigatório)') : t('(opcional)')}</Text><TextInput editable={!sending} value={customer} onChangeText={changeCustomer} accessibilityLabel={orderSettings.requireCustomer ? t('Nome do cliente, obrigatório') : t('Nome do cliente, opcional')} placeholder={t('Nome do cliente')} placeholderTextColor={COLORS.placeholder} style={[styles.input, !!customerError && styles.inputError]} /></View>
      </View>
      {!!customerError && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(customerError)}</Text>}
    </>}
  </View>;

  const order = <View style={styles.panel}>
    <View style={layout.sectionHeader}><Text style={styles.panelTitle}>{t('Pedido atual')}</Text><Text style={styles.itemCount}>{itemCount}</Text></View>
    {items.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t('Vamos montar uma comanda?')}</Text><Text style={styles.emptyText}>{t('Toque em um produto do cardápio para adicioná-lo ao pedido.')}</Text></View> : items.map((item) => {
      const expanded = expandedItemId === item.id;
      return <View key={item.id} style={layout.orderItem}>
        <View style={layout.itemRow}>
          <View style={layout.itemText}>
            <Text style={styles.cardTitle}>{itemName(item.name, language)}</Text>
            <Text style={styles.mutedText}>{item.flavors?.map((flavor, index) => `${t(index === 0 ? '1ª metade:' : '2ª metade:')} ${flavor}`).join('\n') || t(item.category)}</Text>
            {item.extras?.map((extra) => <Text key={extra.name + extra.placement} style={styles.mutedText}>+ {describeExtra(extra, item.flavors, language)}</Text>)}
            {!!item.note && !expanded && <Text style={styles.mutedText}>{translatedNote(item.note, language)}</Text>}
          </View>
          <View style={styles.quantityControl}><Pressable onPress={() => changeQuantity(item.id, -1)} accessibilityRole="button" accessibilityLabel={t('Diminuir quantidade de ') + itemName(item.name, language)} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable onPress={() => changeQuantity(item.id, 1)} accessibilityRole="button" accessibilityLabel={t('Aumentar quantidade de ') + itemName(item.name, language)} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View>
        </View>
        <Pressable onPress={() => setExpandedItemId(expanded ? null : item.id)} accessibilityRole="button" accessibilityState={{ expanded }} style={layout.itemEdit}><Text style={layout.editButtonText}>{t(expanded ? 'Ocultar detalhes' : 'Editar')}</Text></Pressable>
        {expanded && <>
          <TextInput editable={!sending} value={translatedNote(item.note, language)} onChangeText={(note) => updateNote(item.id, note)} accessibilityLabel={t('Observação de ') + itemName(item.name, language)} placeholder={t('Observação do item')} placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} multiline />
          <View style={styles.quickNotes}>{QUICK_NOTES.map((note) => <Pressable key={t(note)} onPress={() => updateNote(item.id, item.note ? item.note + ', ' + note : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{t(note)}</Text></Pressable>)}</View>
        </>}
      </View>;
    })}
  </View>;

  const products = <View>
    <TextInput value={productSearch} onChangeText={setProductSearch} style={styles.input} maxLength={200} placeholder={t('Buscar produto')} accessibilityLabel={t('Buscar produto')} />
    <Pressable style={styles.noteChip} accessibilityRole="checkbox" accessibilityState={{ checked: favoritesOnly }} onPress={() => setFavoritesOnly(!favoritesOnly)}><Text style={styles.noteChipText}>{t(favoritesOnly ? 'Mostrar todos' : 'Somente favoritos')}</Text></Pressable>
    <Text style={layout.productHeading}>{t('Escolha os produtos')}</Text>
    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="tab" accessibilityState={{ selected: value === category }} style={[styles.category, value === category && styles.selectedCategory]}><Text style={[styles.categoryText, value === category && styles.selectedCategoryText]}>{t(value)}</Text></Pressable>)}</ScrollView>
    {subcategories.length > 0 && <View><Text style={styles.fieldLabel}>{t('Subgrupos')}</Text><ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{['', ...subcategories].map(value => <Pressable key={value || 'all'} onPress={() => setSubcategory(value)} accessibilityRole="tab" accessibilityState={{ selected: value === subcategory }} style={[styles.category, value === subcategory && styles.selectedCategory]}><Text style={[styles.categoryText, value === subcategory && styles.selectedCategoryText]}>{t(value || 'Todos')}</Text></Pressable>)}</ScrollView></View>}
    {filteredMenu.length === 0 && <Text style={styles.emptyText}>{t('Nenhum produto nesta categoria.')}</Text>}
    {filteredMenu.map((product) => <Pressable disabled={productOptions[product.id]?.available === false} key={product.id} style={({ pressed }) => [styles.productCard, pressed && styles.pressed]} onPress={() => openProduct(product)} accessibilityRole="button" accessibilityLabel={t('Adicionar ') + product.name}><View style={styles.productInfo}><Text style={styles.cardTitle}>{productOptions[product.id]?.favorite ? '★ ' : ''}{product.name}{productOptions[product.id]?.available === false ? ` · ${t('Esgotado')}` : ''}</Text><Text style={styles.mutedText}>{[product.category, product.subcategory].filter(Boolean).map(value => t(value!)).join(' › ')}</Text>{product.description && <Text style={styles.mutedText}>{product.description}</Text>}{modules.cash && <Text style={styles.cardTitle}>{formatMoney(Math.round(product.price * 100), locale)}</Text>}</View><View style={styles.productArrow}><Text style={styles.productArrowText}>+</Text></View></Pressable>)}
  </View>;

  const catalog = <View style={layout.catalogColumn}>{identity}{!isWide && order}{products}</View>;

  return <View style={layout.root}>
    <View style={layout.topBar}><View style={layout.topBarInner}>
      <View style={layout.topMeta}><Text numberOfLines={2} style={layout.topMetaTitle}>{serviceLabel ? `${t(serviceLabel)} · ` : ''}{t('Mesa')} {currentPlate} · {itemCount}</Text>{!!customer.trim() && <Text numberOfLines={1} style={layout.topMetaDetail}>{t('Cliente')}: {customer.trim()}</Text>}</View>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled, busy: sending }} accessibilityHint={t('Salvar e conferir impressão')} onPress={finishOrder} style={[layout.finishButton, disabled && styles.pressed]}><Text style={layout.finishButtonText}>{sending ? t('Salvando e abrindo prévia…') : t('Finalizar pedido')}</Text>{isWide && <Text style={layout.finishButtonHint}>{t('Salvar e conferir impressão')}</Text>}</Pressable>
    </View></View>
    <OrderWorkspace catalog={catalog} order={isWide ? order : null} />
  </View>;
}

const layout = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  topBar: { backgroundColor: COLORS.surface, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  topBarInner: { width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  topMeta: { flex: 1, minWidth: 0 },
  topMetaTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  topMetaDetail: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  finishButton: { minHeight: 46, minWidth: 132, maxWidth: 220, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
  finishButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  finishButtonHint: { color: '#FFE8DE', fontSize: 11, marginTop: 2, textAlign: 'center' },
  catalogColumn: { gap: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { flex: 1, minWidth: 0 },
  editButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  editButtonText: { color: COLORS.green, fontSize: 13, fontWeight: '700' },
  serviceOptions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  serviceOption: { minWidth: 0 },
  productHeading: { color: COLORS.ink, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  orderItem: { borderTopColor: COLORS.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemText: { flex: 1, minWidth: 0 },
  itemEdit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
