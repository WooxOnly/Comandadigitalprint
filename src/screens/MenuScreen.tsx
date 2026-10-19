import { isValidMenu } from '../../shared/menu-validation.mjs';
import type { ProductOption } from '../services/catalogOptions';
import { randomUUID } from 'expo-crypto';
import type { Product } from '../../menuData';
import { DropdownChevron } from '../ui/DropdownChevron';
import { useAppRole } from '../ui/useAppRole';
import { useAccess } from '../ui/useAccess';
import { searchCatalog } from '../services/catalogOptions';
import { useBusiness } from '../state/BusinessContext';
import { ProductPriceInput } from '../ui/ProductPriceInput';
import { formatMoney } from '../services/business';
import { useLanguage } from '../i18n/LanguageContext';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from '../ui/ThemedNative';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS } from '../ui/theme';

export default function MenuScreen() {
  const { t, locale } = useLanguage();
  const { modules } = useBusiness();
  const role = useAppRole();
  const canEdit = useAccess('menu');
  const canChangePrice = canEdit && ['admin','manager'].includes(role || '');
  const { width, height, fontScale } = useWindowDimensions();
  const { productOptions, menu, saveMenu } = useApp();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [optionChanges, setOptionChanges] = useState<Partial<Pick<ProductOption, 'available' | 'favorite'>>>({});
  const editorOptions = { available: true, favorite: false, ...(draft ? productOptions[draft.id] : {}), ...optionChanges };
  function openEditor(product: Product, creating = false) { setFormError(''); setIsNew(creating); setOptionChanges({}); setDraft({ ...product }); }
  const close = () => { if (!saving) setDraft(null); };
  function updateDraft(id: string, change: Partial<Product>) {
    setFormError('');
    setDraft(current => current?.id === id ? { ...current, ...change } : current);
  }
  async function saveProduct() {
    if (!draft || saving || !canEdit) return;
    if (!isValidMenu([draft]) || (!isNew && !menu.some(product => product.id === draft.id))) { setFormError('Confira nomes, categorias e identificadores do cardápio.'); return; }
    setSaving(true);
    try {
      const next = isNew ? [draft, ...menu] : menu.map(product => product.id === draft.id ? draft : product);
      if (await saveMenu(next, Object.keys(optionChanges).length ? { productId: draft.id, ...optionChanges } : undefined)) { if (isNew) setSearch(''); setDraft(null); }
    } finally { setSaving(false); }
  }
  function deleteProduct() {
    if (!draft || saving || !canEdit) return;
    const id = draft.id;
    Alert.alert(t('Excluir'), t('Excluir este produto do cardápio?'), [
      { text: t('Cancelar'), style: 'cancel' },
      { text: t('Excluir'), style: 'destructive', onPress: () => { setSaving(true); void saveMenu(menu.filter(product => product.id !== id)).then(saved => { if (saved) setDraft(null); }).finally(() => setSaving(false)); } },
    ]);
  }
  const product = draft;
  return <View style={styles.flex}><ScreenFrame><View>
                  <View style={menuLayout.toolbar}>
                    <Text style={[styles.settingsIntro, menuLayout.intro]}>{t("Organize os produtos em grupos e subgrupos.")}</Text>
                    <View testID="menu-primary-actions" style={menuLayout.actions}>
                      <Pressable testID="menu-add-product" disabled={!canChangePrice} accessibilityRole="button" accessibilityState={{ disabled: !canChangePrice }} style={({ pressed }) => [menuLayout.button, menuLayout.add, (!canChangePrice || pressed) && styles.pressed]} onPress={() => openEditor({ id: 'item-' + randomUUID(), name: '', category: '', price: 0 }, true)}><Text style={menuLayout.buttonText}>{t("+ Adicionar produto")}</Text></Pressable>
                    </View>
                  </View>
                  {!canChangePrice && <Text style={[styles.helperText, { marginBottom: 12 }]}>{t('Preços e descontos são autorizados por gerentes ou administradores.')}</Text>}
                  <TextInput value={search} onChangeText={setSearch} style={styles.input} maxLength={200} accessibilityLabel={t('Buscar produto')} placeholder={t('Buscar produto')} />
                  <View style={styles.menuList}>
                    {searchCatalog(menu, productOptions, search).map((product) => <View key={product.id} style={styles.menuListItem}>
                      <Pressable style={styles.menuListHeader} accessibilityRole="button" accessibilityState={{ expanded: draft?.id === product.id }} accessibilityLabel={`${product.name}, ${t('Ver detalhes')}`} onPress={() => openEditor(product)}>
                        <View style={styles.menuListTitle}><Text style={styles.cardTitle}>{productOptions[product.id]?.favorite ? '★ ' : ''}{product.name}{productOptions[product.id]?.available === false ? ` · ${t('Esgotado')}` : ''}</Text><Text style={styles.mutedText}>{[product.category, product.subcategory].filter(Boolean).map(value => t(value!)).join(' › ')}</Text>{modules.cash && <Text style={styles.cardTitle}>{Number.isFinite(product.price) ? formatMoney(Math.round(product.price * 100), locale) : '—'}</Text>}</View>
                        <DropdownChevron expanded={draft?.id === product.id} framed />
                      </Pressable>

                    </View>)}
                  </View>
                </View></ScreenFrame>
    <Modal visible={!!draft} transparent animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0008' }}><KeyboardAvoidingView style={menuLayout.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View testID="menu-product-editor" accessibilityViewIsModal style={[menuLayout.editor, { height: Math.min(height - 32, 620 * Math.min(fontScale, 1.6)) }]}>
          <View style={menuLayout.editorHeader}><Text style={[styles.panelTitle, { flex: 1 }]}>{t(isNew ? 'Novo produto' : 'Editar produto')}</Text><Pressable disabled={saving} accessibilityRole="button" accessibilityLabel={t('Fechar')} onPress={close} style={styles.previewControl}><Text style={styles.previewControlText}>×</Text></Pressable></View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {product && (<View>
                      {!isNew && <View style={styles.quickNotes}><Pressable disabled={!canEdit || saving} style={styles.noteChip} onPress={() => setOptionChanges(previous => ({ ...previous, available: !editorOptions.available }))}><Text style={styles.noteChipText}>{t(editorOptions.available === false ? 'Marcar disponível' : 'Marcar esgotado')}</Text></Pressable><Pressable disabled={!canEdit || saving} style={styles.noteChip} onPress={() => setOptionChanges(previous => ({ ...previous, favorite: !editorOptions.favorite }))}><Text style={styles.noteChipText}>{t(editorOptions.favorite ? 'Remover favorito' : 'Marcar favorito')}</Text></Pressable></View>}
                      <Text style={styles.fieldLabel}>{t("Nome do produto")} *</Text>
                      <TextInput autoFocus={isNew} maxLength={200} editable={canEdit && !saving} value={product.name} onChangeText={(name) => updateDraft(product.id, { name })} accessibilityLabel={t("Nome do produto")} placeholder={t("Ex.: pizza de calabresa")} placeholderTextColor={COLORS.placeholder} style={styles.input} />
                      {modules.cash && <ProductPriceInput key={product.id} price={product.price} editable={canChangePrice && !saving} onChange={price => updateDraft(product.id, { price })} />}
                      <Text style={styles.fieldLabel}>{t('Ingredientes / descrição')}</Text>
                      <TextInput editable={canEdit && !saving} value={product.description || ''} onChangeText={(description) => updateDraft(product.id, { description })} accessibilityLabel={t('Ingredientes / descrição')} placeholder={t('Ingredientes do produto')} placeholderTextColor={COLORS.placeholder} style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]} multiline maxLength={2000} />
                      <View style={[styles.menuEditRow, width < 520 * Math.min(fontScale, 1.5) && styles.menuEditRowCompact]}>
                        <View style={styles.menuEditField}><Text style={styles.fieldLabel}>{t("Grupo")} *</Text><TextInput maxLength={100} editable={canEdit && !saving} value={product.category} onChangeText={(category) => updateDraft(product.id, { category })} accessibilityLabel={t("Grupo do produto")} placeholder={t("Ex.: pizzas")} placeholderTextColor={COLORS.placeholder} style={styles.input} /></View>
                        <View style={styles.menuEditField}><Text style={styles.fieldLabel}>{t('Subgrupo (opcional)')}</Text><TextInput editable={canEdit && !saving} value={product.subcategory || ''} onChangeText={subcategory => updateDraft(product.id, { subcategory })} accessibilityLabel={t('Subgrupo do produto')} placeholder={t('Ex.: especiais')} placeholderTextColor={COLORS.placeholder} maxLength={100} style={styles.input} /></View>
                      </View>
                      <View style={styles.menuEditActions}>
                        <Pressable disabled={!canEdit || saving} onPress={() => updateDraft(product.id, { kind: product.kind === 'pizza' ? undefined : 'pizza' })} accessibilityRole="checkbox" accessibilityState={{ checked: product.kind === 'pizza' }} style={[styles.noteChip, product.kind === 'pizza' && styles.selectedCategory]}><Text style={[styles.noteChipText, product.kind === 'pizza' && styles.selectedCategoryText]}>{product.kind === 'pizza' ? t("✓ Pizza") : t("Marcar como pizza")}</Text></Pressable>
                        {!isNew && <Pressable disabled={!canEdit || saving} onPress={deleteProduct} style={styles.removeButton}><Text style={styles.removeButtonText}>{t("Excluir")}</Text></Pressable>}
                      </View>
                      </View>)}
          </ScrollView>
          {!!formError && <Text accessibilityLiveRegion="polite" style={[styles.errorText, { paddingHorizontal: 16 }]}>{t(formError)}</Text>}
          <View style={menuLayout.editorFooter}>
            <Pressable disabled={saving} accessibilityRole="button" onPress={close} style={[menuLayout.button, menuLayout.cancel]}><Text style={styles.secondaryButtonText}>{t('Cancelar')}</Text></Pressable>
            <Pressable testID="menu-save" disabled={!canEdit || saving} accessibilityRole="button" accessibilityState={{ disabled: !canEdit || saving, busy: saving }} style={[menuLayout.button, menuLayout.save, (!canEdit || saving) && styles.pressed]} onPress={() => { void saveProduct(); }}><Text style={menuLayout.buttonText}>{t('Salvar')}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </View>;
}

const menuLayout = StyleSheet.create({
  backdrop: { flex: 1, padding: 16, justifyContent: 'center' },
  editor: { width: '100%', maxWidth: 760, maxHeight: '100%', alignSelf: 'center', backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editorFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancel: { backgroundColor: COLORS.greenSoft },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 },
  intro: { flexGrow: 1, flexShrink: 1, flexBasis: 260, marginTop: 0, marginBottom: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8, maxWidth: '100%' },
  button: { minHeight: 44, maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  add: { backgroundColor: COLORS.green },
  save: { backgroundColor: COLORS.primary },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
});
