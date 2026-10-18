import { useStoreModules } from '../ui/useStoreModules';
import { formatMoney } from '../services/business';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from '../ui/ThemedNative';
import type { Product } from '../../menuData';
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
  const { height, fontScale } = useWindowDimensions();
  const [information, setInformation] = useState<Product | null>(null);
  const [identityError, setIdentityError] = useState('');
  const [catalogWidth, setCatalogWidth] = useState(0);
  const [editingIdentity, setEditingIdentity] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [serviceModeError, setServiceModeError] = useState(false);
  const [plateListWidth, setPlateListWidth] = useState(0);
  const [identityWidth, setIdentityWidth] = useState(0);
  const splitIdentity = identityWidth >= 680 && fontScale < 1.4;
  const splitFooter = identityWidth >= 430 && fontScale < 1.4;
  const identityGroupWidth = splitIdentity ? (identityWidth - 10) / 2 : '100%';
  const plateColumns = plateListWidth >= 484 ? 10 : plateListWidth >= 244 ? 5 : Math.max(1, Math.floor((plateListWidth + 6) / 50));
  const plateWidth = plateListWidth ? Math.floor((plateListWidth - (plateColumns - 1) * 6) / plateColumns) : 44;
  const { productOptions, productSearch, setProductSearch, plate, setPlate, serviceMode, setServiceMode, customPlate, setCustomPlate, customer, changeCustomer, orderSettings, customerError, categories, category, setCategory, subcategories, subcategory, setSubcategory, filteredMenu, openProduct, items, changeQuantity, updateNote, sendOrder, sending, isReady, isWide } = useApp();
  const currentPlate = customPlate.trim() || plate;
  const itemCount = `${items.length} ${t(items.length === 1 ? 'item' : 'itens')}`;
  const serviceLabel = serviceMode === 'dine_in' ? 'Para comer aqui' : serviceMode === 'takeout' ? 'Para levar' : null;
  const twoColumns = isWide && catalogWidth >= 470;
  const productWidth = catalogWidth ? (catalogWidth - (twoColumns ? 8 : 0)) / (twoColumns ? 2 : 1) : undefined;
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

  function confirmIdentity() {
    if (!serviceMode) { setServiceModeError(true); return; }
    if (orderSettings.requireCustomer && !customer.trim()) { setIdentityError('Informe o nome do cliente antes de enviar a comanda.'); return; }
    setIdentityError(''); setEditingIdentity(false);
  }
  const finishAction = <Pressable testID="finish-order" disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled, busy: sending }} accessibilityHint={t('Salvar e conferir impressão')} onPress={finishOrder} style={[layout.finishButton, disabled && styles.pressed]}><Text style={layout.finishButtonText}>{sending ? t('Salvando e abrindo prévia…') : t('Finalizar pedido')}</Text>{isWide && <Text style={layout.finishButtonHint}>{t('Salvar e conferir impressão')}</Text>}</Pressable>;
  const identity = <View testID="order-identification" style={layout.identityPanel}>
    <Text style={layout.identityTitle}>{t('Dados do pedido')}</Text>
    <View style={layout.identityRow} onLayout={event => setIdentityWidth(event.nativeEvent.layout.width)}>
      <View testID="order-service-group" style={[layout.identityGroup, { width: identityGroupWidth }]}>
        <Text style={layout.identityLabel}>{t('Atendimento')}</Text>
        <View testID="order-service-options" style={layout.serviceOptions}>{(['dine_in', 'takeout'] as const).map(value => <Pressable key={value} onPress={() => { setServiceMode(value); setServiceModeError(false); }} accessibilityRole="radio" accessibilityState={{ checked: serviceMode === value }} style={[styles.paperOption, layout.serviceOption, serviceMode === value && styles.selectedConnection]}><Text style={[styles.connectionText, serviceMode === value && styles.selectedConnectionText]}>{t(value === 'dine_in' ? 'Para comer aqui' : 'Para levar')}</Text></Pressable>)}</View>
      </View>
      <View testID="order-customer-group" style={[layout.identityGroup, { width: identityGroupWidth }]}>
        <Text style={layout.identityLabel}>{t('Cliente')} {orderSettings.requireCustomer ? '*' : ''}</Text>
        <TextInput editable={!sending} value={customer} onChangeText={value => { changeCustomer(value); setIdentityError(''); }} accessibilityLabel={orderSettings.requireCustomer ? t('Nome do cliente, obrigatório') : t('Nome do cliente, opcional')} placeholder={t('Nome do cliente')} placeholderTextColor={COLORS.placeholder} style={[styles.input, layout.identityInput, !!(customerError || identityError) && styles.inputError]} />
      </View>
    </View>
    <View style={layout.tableGroup}>
        <Text style={layout.identityLabel}>{t('Mesa')}</Text>
        <View testID="order-table-choices" style={layout.tableChoices} onLayout={event => setPlateListWidth(event.nativeEvent.layout.width)}>{PLATES.map(value => <Pressable key={value} onPress={() => { setPlate(value); setCustomPlate(''); }} accessibilityRole="radio" accessibilityLabel={t('Mesa ') + value} accessibilityState={{ checked: value === plate && !customPlate }} style={[styles.plate, { width: plateWidth, minWidth: 44, minHeight: 44 }, value === plate && !customPlate && styles.selectedPlate]}><Text style={[styles.plateText, value === plate && !customPlate && styles.selectedPlateText]}>{t(value)}</Text></Pressable>)}</View>
      </View>
    <View style={[layout.identityFooter, !splitFooter && layout.identityFooterStacked]}>
      <View testID="order-custom-table-group" style={[layout.customTableGroup, !splitFooter && { width: '100%', flexBasis: 'auto', flexGrow: 0 }]}><Text style={layout.identityLabel}>{t('Outra mesa')}</Text><TextInput editable={!sending} value={customPlate} onChangeText={setCustomPlate} accessibilityLabel={t('Outro número de mesa')} placeholder={t('Número')} placeholderTextColor={COLORS.placeholder} style={[styles.input, layout.identityInput]} maxLength={50} /></View>
      <Pressable testID="confirm-order-identification" disabled={sending} onPress={confirmIdentity} accessibilityRole="button" style={[layout.confirmIdentity, !splitFooter && { width: '100%' }, sending && styles.pressed]}><Text style={layout.finishButtonText}>{t('Avançar')}</Text></Pressable>
    </View>
    {serviceModeError && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t('Escolha se o pedido é para comer aqui ou para levar.')}</Text>}
    {!!(customerError || identityError) && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(customerError || identityError)}</Text>}
  </View>;

  const order = <View style={styles.panel}>
    <View style={layout.sectionHeader}><Text style={styles.panelTitle}>{t('Pedido atual')}</Text><View style={layout.orderHeaderActions}><Text style={styles.itemCount}>{itemCount}</Text>{isWide && finishAction}</View></View>
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
    <Text style={layout.productHeading}>{t('Escolha os produtos')}</Text>
    <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="tab" accessibilityState={{ selected: value === category }} style={[styles.category, value === category && styles.selectedCategory]}><Text style={[styles.categoryText, value === category && styles.selectedCategoryText]}>{t(value)}</Text></Pressable>)}</ScrollView>
    {subcategories.length > 0 && <View><Text style={styles.fieldLabel}>{t('Subgrupos')}</Text><ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{['', ...subcategories].map(value => <Pressable key={value || 'all'} onPress={() => setSubcategory(value)} accessibilityRole="tab" accessibilityState={{ selected: value === subcategory }} style={[styles.category, value === subcategory && styles.selectedCategory]}><Text style={[styles.categoryText, value === subcategory && styles.selectedCategoryText]}>{t(value || 'Todos')}</Text></Pressable>)}</ScrollView></View>}
    {filteredMenu.length === 0 && <Text style={styles.emptyText}>{t('Nenhum produto nesta categoria.')}</Text>}
    <View testID="order-product-grid" style={layout.productGrid} onLayout={event => setCatalogWidth(event.nativeEvent.layout.width)}>
      {filteredMenu.map(product => <View testID={'order-product-' + product.id} key={product.id} style={[layout.productTile, productWidth !== undefined && { width: productWidth }]}>
        <Pressable disabled={productOptions[product.id]?.available === false} style={layout.productDetails} onPress={() => openProduct(product)} accessibilityRole="button" accessibilityLabel={product.name}>
          <Text style={layout.productName}>{product.name}{productOptions[product.id]?.available === false ? ` · ${t('Esgotado')}` : ''}</Text>
          <Text style={layout.productCategory}>{[product.category, product.subcategory].filter(Boolean).map(value => t(value!)).join(' › ')}</Text>
          {modules.cash && <Text style={layout.productPrice}>{formatMoney(Math.round(product.price * 100), locale)}</Text>}
        </Pressable>
        <View style={layout.productActions}>
          {!!product.description?.trim() && <Pressable testID={'product-info-' + product.id} accessibilityRole="button" accessibilityLabel={t('Ingredientes do produto') + ': ' + product.name} style={layout.infoButton} onPress={() => setInformation(product)}><Text style={layout.infoSymbol}>ⓘ</Text></Pressable>}
          <Pressable disabled={productOptions[product.id]?.available === false} accessibilityRole="button" accessibilityLabel={t('Adicionar ') + product.name} style={[layout.addProduct, productOptions[product.id]?.available === false && styles.pressed]} onPress={() => openProduct(product)}><Text style={styles.productArrowText}>+</Text></Pressable>
        </View>
      </View>)}
    </View>
  </View>;

  const catalog = <View style={layout.catalogColumn}>{!isWide && order}{products}</View>;

  return <View style={layout.root}>
    {identityOpen ? <ScrollView style={{ maxHeight: height * (isWide ? 0.35 : 0.42), flexGrow: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={layout.identityContainer}>{identity}{!isWide && finishAction}</ScrollView> : <View style={layout.topBar}><View style={layout.topBarInner}>
      <View style={layout.topMeta}><Text testID="order-identification-summary" style={layout.topMetaTitle}>{t('Mesa')} {currentPlate}{customer.trim() ? ' · ' + customer.trim() : ''} · {t(serviceLabel!)}</Text></View>
      <Pressable testID="edit-order-identification" onPress={() => setEditingIdentity(true)} accessibilityRole="button" style={layout.editButton}><Text style={layout.editButtonText}>{t('Editar')}</Text></Pressable>
      {!isWide && finishAction}
    </View></View>}
    <OrderWorkspace catalog={catalog} order={isWide ? order : null} />
    <Modal visible={!!information} transparent animationType="fade" onRequestClose={() => setInformation(null)}>
      <View style={layout.infoBackdrop}><View testID="product-ingredients-dialog" accessibilityViewIsModal style={layout.infoPanel}>
        <View style={layout.sectionHeader}><Text style={styles.panelTitle}>{t('Ingredientes do produto')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('Fechar')} style={layout.infoButton} onPress={() => setInformation(null)}><Text style={layout.infoSymbol}>×</Text></Pressable></View>
        <ScrollView><Text style={styles.cardTitle}>{information?.name}</Text><Text style={styles.mutedText}>{information?.description}</Text></ScrollView>
      </View></View>
    </Modal>
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
  catalogColumn: { gap: 10 },
  identityContainer: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  identityPanel: { padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, gap: 8 },
  identityTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  identityGroup: { maxWidth: '100%', minWidth: 0, flexShrink: 1, gap: 4 },
  identityLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  identityInput: { width: '100%', minWidth: 0 },
  tableGroup: { width: '100%', minWidth: 0, gap: 4 },
  tableChoices: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  identityFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  identityFooterStacked: { flexDirection: 'column', alignItems: 'stretch' },
  customTableGroup: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, maxWidth: '100%', gap: 4 },
  confirmIdentity: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', maxWidth: '100%' },
  orderHeaderActions: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  productGrid: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productTile: { maxWidth: '100%', minWidth: 0, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 4 },
  productDetails: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', gap: 3 },
  productName: { color: COLORS.ink, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  productCategory: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  productPrice: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  productActions: { flexDirection: 'row', alignItems: 'center' },
  infoButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  infoSymbol: { color: COLORS.green, fontSize: 23 },
  addProduct: { width: 44, minHeight: 44, backgroundColor: COLORS.primarySoft, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoBackdrop: { flex: 1, padding: 20, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center' },
  infoPanel: { width: '100%', maxWidth: 460, maxHeight: '80%', backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, gap: 10 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { flex: 1, minWidth: 0 },
  editButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  editButtonText: { color: COLORS.green, fontSize: 13, fontWeight: '700' },
  serviceOptions: { width: '100%', minWidth: 0, flexDirection: 'row', gap: 6 },
  serviceOption: { flex: 1, flexBasis: 0, flexShrink: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 8 },
  productHeading: { color: COLORS.ink, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  orderItem: { borderTopColor: COLORS.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemText: { flex: 1, minWidth: 0 },
  itemEdit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
