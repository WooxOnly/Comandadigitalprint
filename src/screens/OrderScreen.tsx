import { OrderIdentification } from '../ui/OrderIdentification';
import { tableValidationMessage } from '../services/orderSettings';
import { DropdownChevron } from '../ui/DropdownChevron';
import { useStoreModules } from '../ui/useStoreModules';
import { formatMoney } from '../services/business';
import { useCallback, useRef, useState } from 'react';
import { InlineProductSearch } from '../ui/InlineProductSearch';
import type { ScrollViewRef } from '../ui/ThemedNative';
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from '../ui/ThemedNative';
import type { Product } from '../../menuData';
import { describeExtra } from '../../orderItems';
import { itemName, translatedNote } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';
import { useApp } from '../state/AppContext';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { OrderWorkspace } from '../ui/OrderWorkspace';
import { styles, COLORS, QUICK_NOTES } from '../ui/theme';

export default function OrderScreen() {
  const { t, language, locale } = useLanguage();
  const modules = useStoreModules();
  const { width, height, fontScale } = useWindowDimensions();
  const { productOptions, productSearch, setProductSearch, plate, setPlate, serviceMode, setServiceMode, customPlate, setCustomPlate, customer, changeCustomer, orderSettings, customerError, categories, category, setCategory, subcategories, subcategory, setSubcategory, filteredMenu, openProduct, items, changeQuantity, updateNote, sendOrder, sending, isReady, isWide: wideLayout } = useApp();
  const [information, setInformation] = useState<Product | null>(null);
  const [identityError, setIdentityError] = useState('');
  const [catalogWidth, setCatalogWidth] = useState(0);
  const [editingIdentity, setEditingIdentity] = useState(true);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [serviceModeError, setServiceModeError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(!!productSearch);
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const categoryScroll = useRef<ScrollViewRef>(null);
  const categoryContentWidth = useRef(0);
  const revealSearch = useCallback(() => categoryScroll.current?.scrollTo({ x: categoryContentWidth.current, animated: true }), []);
  const [subgroupsOpen, setSubgroupsOpen] = useState(false);
  const isWide = wideLayout && width > height;
  const compactLandscape = isWide && fontScale < 1.4;
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
    const tableError = tableValidationMessage(serviceMode, currentPlate, orderSettings.requireTableForTakeout);
    if (tableError) { setIdentityError(tableError); setEditingIdentity(true); return; }
    if (orderSettings.requireCustomer && !customer.trim()) setEditingIdentity(true);
    void sendOrder(() => {
      setEditingIdentity(true);
      setExpandedItemId(null);
    });
  }

  function confirmIdentity() {
    if (!serviceMode) { setServiceModeError(true); return; }
    const tableError = tableValidationMessage(serviceMode, currentPlate, orderSettings.requireTableForTakeout);
    if (tableError) { setIdentityError(tableError); return; }
    if (orderSettings.requireCustomer && !customer.trim()) { setIdentityError('Informe o nome do cliente antes de enviar a comanda.'); return; }
    setIdentityError(''); setEditingIdentity(false);
  }
  const finishAction = <Pressable testID="finish-order" disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled, busy: sending }} onPress={finishOrder} style={[layout.finishButton, disabled && styles.pressed]}><Text style={layout.finishButtonText}>{sending ? t('Salvando e abrindo prévia…') : t('Finalizar pedido')}</Text></Pressable>;
  const identity = <OrderIdentification serviceMode={serviceMode} customer={customer} plate={plate} customPlate={customPlate} requireCustomer={orderSettings.requireCustomer} requireTableForTakeout={orderSettings.requireTableForTakeout} disabled={sending} error={serviceModeError ? 'Escolha se o pedido é para comer aqui ou para levar.' : customerError || identityError} onService={value => { setServiceMode(value); setServiceModeError(false); setIdentityError(''); }} onCustomer={value => { changeCustomer(value); setIdentityError(''); }} onPlate={value => { setPlate(value === plate && serviceMode === 'takeout' && !orderSettings.requireTableForTakeout ? '' : value); setCustomPlate(''); setIdentityError(''); }} onCustom={value => { setCustomPlate(value); setPlate(''); setIdentityError(''); }} onConfirm={confirmIdentity} />;

  const order = <View testID="current-order-panel" style={[styles.panel, layout.orderPanel, !isWide && { maxHeight: Math.max(150, Math.min(310, height * 0.28)) }]}>
    <View style={layout.sectionHeader}><Text style={styles.panelTitle}>{t('Pedido atual')}</Text><View style={layout.orderHeaderActions}><Text style={styles.itemCount}>{itemCount}</Text>{finishAction}</View></View>
    <ScrollView testID="current-order-items" nestedScrollEnabled keyboardShouldPersistTaps="handled" style={layout.orderItems} contentContainerStyle={{ paddingBottom: 4 }}>
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
    </ScrollView>
  </View>;

  const products = <View>
    <Text style={layout.productHeading}>{t('Escolha os produtos')}</Text>
    <View testID="product-category-toolbar" style={layout.categoryToolbar} onLayout={event => setToolbarWidth(event.nativeEvent.layout.width)}>
      <ScrollView ref={categoryScroll} onLayout={() => { if (searchOpen) revealSearch(); }} onContentSizeChange={contentWidth => { categoryContentWidth.current = contentWidth; }} horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} style={{ flex: 1, minWidth: 0 }} contentContainerStyle={[styles.categoryList, { paddingBottom: 0, alignItems: 'center' }]}>{categories.map(value => {
        const selected = value === category, hasSubgroups = selected && subcategories.length > 0;
        return <Pressable key={value} onPress={() => { if (hasSubgroups) setSubgroupsOpen(true); else { setCategory(value); setSubgroupsOpen(false); } }} accessibilityRole="tab" accessibilityState={{ selected }} style={[styles.category, layout.categoryChoice, value === category && styles.selectedCategory]}><Text style={[styles.categoryText, selected && styles.selectedCategoryText]}>{t(value)}{selected && subcategory ? ' · ' + t(subcategory) : ''}</Text>{hasSubgroups && <DropdownChevron expanded={subgroupsOpen} color="#FFFFFF" />}</Pressable>;
      })}</ScrollView>
      <InlineProductSearch open={searchOpen} value={productSearch} width={Math.min(240, Math.max(100, (toolbarWidth || width - 24) * 0.42))} onChange={setProductSearch} onOpened={revealSearch} onToggle={() => { setSearchOpen(!searchOpen); if (searchOpen) setProductSearch(''); }} />
    </View>
    {filteredMenu.length === 0 && <Text style={styles.emptyText}>{t('Nenhum produto nesta categoria.')}</Text>}
    <View testID="order-product-grid" style={layout.productGrid} onLayout={event => setCatalogWidth(event.nativeEvent.layout.width)}>
      {filteredMenu.map(product => <View testID={'order-product-' + product.id} key={product.id} style={[layout.productTile, compactLandscape && layout.landscapeProductTile, productWidth !== undefined && { width: productWidth }]}>
        <Pressable disabled={productOptions[product.id]?.available === false} style={layout.productDetails} onPress={() => openProduct(product)} accessibilityRole="button" accessibilityLabel={product.name}>
          <Text numberOfLines={compactLandscape ? 2 : undefined} style={[layout.productName, compactLandscape && layout.landscapeProductName]}>{product.name}{productOptions[product.id]?.available === false ? ` · ${t('Esgotado')}` : ''}</Text>
          {compactLandscape ? <View style={layout.landscapeProductMeta}><Text numberOfLines={1} style={[layout.productCategory, { flex: 1 }]}>{[product.category, product.subcategory].filter(Boolean).map(value => t(value!)).join(' › ')}</Text>{modules.cash && <Text style={layout.landscapeProductPrice}>{formatMoney(Math.round(product.price * 100), locale)}</Text>}</View> : <><Text style={layout.productCategory}>{[product.category, product.subcategory].filter(Boolean).map(value => t(value!)).join(' › ')}</Text>{modules.cash && <Text style={layout.productPrice}>{formatMoney(Math.round(product.price * 100), locale)}</Text>}</>}
        </Pressable>
        <View style={layout.productActions}>
          {!!product.description?.trim() && <Pressable testID={'product-info-' + product.id} accessibilityRole="button" accessibilityLabel={t('Ingredientes do produto') + ': ' + product.name} style={layout.infoButton} onPress={() => setInformation(product)}><Text style={layout.infoSymbol}>ⓘ</Text></Pressable>}
          <Pressable disabled={productOptions[product.id]?.available === false} accessibilityRole="button" accessibilityLabel={t('Adicionar ') + product.name} style={[layout.addProduct, productOptions[product.id]?.available === false && styles.pressed]} onPress={() => openProduct(product)}><Text style={styles.productArrowText}>+</Text></Pressable>
        </View>
      </View>)}
    </View>
  </View>;

  const catalog = <View style={layout.catalogColumn}>{products}</View>;

  return <View style={layout.root}>
    {identityOpen ? <ScrollView style={{ maxHeight: height * (isWide ? 0.55 : 0.48), flexGrow: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={layout.identityContainer}>{identity}</ScrollView> : <View style={layout.topBar}><View style={layout.topBarInner}>
      <View style={layout.topMeta}><Text testID="order-identification-summary" style={layout.topMetaTitle}>{currentPlate ? t('Mesa') + ' ' + currentPlate : t(serviceLabel!)}{customer.trim() ? ' · ' + customer.trim() : ''}{currentPlate ? ' · ' + t(serviceLabel!) : ''}</Text></View>
      <Pressable testID="edit-order-identification" onPress={() => setEditingIdentity(true)} accessibilityRole="button" style={layout.editButton}><Text style={layout.editButtonText}>{t('Editar')}</Text></Pressable>
    </View></View>}
    <OrderWorkspace catalog={catalog} order={order} />
    <Modal visible={subgroupsOpen} transparent animationType="none" onRequestClose={() => setSubgroupsOpen(false)}>
      <View style={layout.infoBackdrop}><View testID="product-subgroups-dialog" accessibilityViewIsModal style={layout.infoPanel}>
        <View style={layout.sectionHeader}><Text style={styles.panelTitle}>{t(category)} · {t('Subgrupos')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('Fechar')} style={layout.infoButton} onPress={() => setSubgroupsOpen(false)}><Text style={layout.infoSymbol}>×</Text></Pressable></View>
        <ScrollView>{['', ...subcategories].map(value => <Pressable key={value || 'all'} accessibilityRole="radio" accessibilityState={{ checked: value === subcategory }} onPress={() => { setSubcategory(value); setSubgroupsOpen(false); }} style={[styles.paperOption, { minHeight: 44 }, value === subcategory && styles.selectedConnection]}><Text style={[styles.connectionText, value === subcategory && styles.selectedConnectionText]}>{t(value || 'Todos')}</Text></Pressable>)}</ScrollView>
      </View></View>
    </Modal>
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
  orderPanel: { maxHeight: '100%', marginBottom: 0, padding: 12, minHeight: 120, flexShrink: 1 },
  orderItems: { flexShrink: 1 },
  categoryChoice: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryToolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  catalogColumn: { gap: 10 },
  identityContainer: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  orderHeaderActions: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  productGrid: { width: '100%', minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productTile: { maxWidth: '100%', minWidth: 0, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 4 },
  landscapeProductTile: { height: 76, minHeight: 76, paddingVertical: 8 },
  landscapeProductName: { fontSize: 13, lineHeight: 16 },
  landscapeProductMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  landscapeProductPrice: { color: COLORS.ink, fontSize: 12, lineHeight: 16, fontWeight: '700' },
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
  productHeading: { color: COLORS.ink, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  orderItem: { borderTopColor: COLORS.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemText: { flex: 1, minWidth: 0 },
  itemEdit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
