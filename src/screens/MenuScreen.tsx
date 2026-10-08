import { useAccess } from '../ui/useAccess';
import { searchCatalog } from '../services/catalogOptions';
import { useBusiness } from '../state/BusinessContext';
import { useAuth } from '../state/AuthContext';
import { ProductPriceInput } from '../ui/ProductPriceInput';
import { formatMoney } from '../services/business';
import { useLanguage } from '../i18n/LanguageContext';
import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS } from '../ui/theme';

export default function MenuScreen() {
  const { t, locale } = useLanguage();
  const { modules, overview } = useBusiness(), { currentUser } = useAuth();
  const canEdit = useAccess('menu');
  const canChangePrice = canEdit && ( !modules.cash || currentUser === 'admin' || !!overview?.settings?.managers.includes(currentUser));
  const { width, fontScale } = useWindowDimensions();
  const { productOptions, updateProductOption, menu, updateMenuProduct, removeMenuProduct, addMenuProduct, saveMenu } = useApp();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return <ScreenFrame><View>
                  <Text style={styles.settingsIntro}>{t("Organize os produtos em grupos e subgrupos.")}</Text>
                  {!canChangePrice && <Text style={styles.helperText}>{t('Preços e descontos são autorizados por gerentes ou administradores.')}</Text>}
                  <View style={styles.menuEditActions}>
                    <Pressable disabled={!canChangePrice} style={styles.addButton} onPress={() => setExpandedId(addMenuProduct())}><Text style={styles.addButtonText}>{t("+ Adicionar produto")}</Text></Pressable>
                    <Pressable disabled={!canEdit} style={styles.addButton} onPress={() => saveMenu()}><Text style={styles.addButtonText}>{t("Salvar cardápio")}</Text></Pressable>
                  </View>
                  <TextInput value={search} onChangeText={setSearch} style={styles.input} maxLength={200} accessibilityLabel={t('Buscar produto')} placeholder={t('Buscar produto')} />
                  <View style={styles.menuList}>
                    {searchCatalog(menu, productOptions, search).map((product) => <View key={product.id} style={styles.menuListItem}>
                      <Pressable style={styles.menuListHeader} accessibilityRole="button" accessibilityState={{ expanded: expandedId === product.id }} accessibilityLabel={`${product.name}, ${t(expandedId === product.id ? 'Ocultar detalhes' : 'Ver detalhes')}`} onPress={() => setExpandedId(expandedId === product.id ? null : product.id)}>
                        <View style={styles.menuListTitle}><Text style={styles.cardTitle}>{productOptions[product.id]?.favorite ? '★ ' : ''}{product.name}{productOptions[product.id]?.available === false ? ` · ${t('Esgotado')}` : ''}</Text><Text style={styles.mutedText}>{[product.category, product.subcategory].filter(Boolean).map(value => t(value!)).join(' › ')}</Text>{modules.cash && <Text style={styles.cardTitle}>{Number.isFinite(product.price) ? formatMoney(Math.round(product.price * 100), locale) : '—'}</Text>}</View>
                        <Text style={styles.connectionText}>{expandedId === product.id ? '▴' : '▾'}</Text>
                      </Pressable>
                      {expandedId === product.id && <View style={styles.menuListDetails}>
                      <View style={styles.quickNotes}><Pressable disabled={!canEdit} style={styles.noteChip} onPress={() => void updateProductOption(product.id, { available: productOptions[product.id]?.available === false })}><Text style={styles.noteChipText}>{t(productOptions[product.id]?.available === false ? 'Marcar disponível' : 'Marcar esgotado')}</Text></Pressable><Pressable disabled={!canEdit} style={styles.noteChip} onPress={() => void updateProductOption(product.id, { favorite: !productOptions[product.id]?.favorite })}><Text style={styles.noteChipText}>{t(productOptions[product.id]?.favorite ? 'Remover favorito' : 'Marcar favorito')}</Text></Pressable></View>
                      <Text style={styles.fieldLabel}>{t("Nome do produto")}</Text>
                      <TextInput editable={canEdit} value={product.name} onChangeText={(name) => updateMenuProduct(product.id, { name })} accessibilityLabel={t("Nome do produto")} placeholder={t("Ex.: pizza de calabresa")} placeholderTextColor={COLORS.placeholder} style={styles.input} />
                      {modules.cash && <ProductPriceInput key={product.id} price={product.price} editable={canChangePrice} onChange={price => updateMenuProduct(product.id, { price })} />}
                      <Text style={styles.fieldLabel}>{t('Ingredientes / descrição')}</Text>
                      <TextInput editable={canEdit} value={product.description || ''} onChangeText={(description) => updateMenuProduct(product.id, { description })} accessibilityLabel={t('Ingredientes / descrição')} placeholder={t('Ingredientes do produto')} placeholderTextColor={COLORS.placeholder} style={styles.input} multiline maxLength={2000} />
                      <View style={[styles.menuEditRow, width < 520 * Math.min(fontScale, 1.5) && styles.menuEditRowCompact]}>
                        <View style={styles.menuEditField}><Text style={styles.fieldLabel}>{t("Grupo")}</Text><TextInput editable={canEdit} value={product.category} onChangeText={(category) => updateMenuProduct(product.id, { category })} accessibilityLabel={t("Grupo do produto")} placeholder={t("Ex.: pizzas")} placeholderTextColor={COLORS.placeholder} style={styles.input} /></View>
                        <View style={styles.menuEditField}><Text style={styles.fieldLabel}>{t('Subgrupo (opcional)')}</Text><TextInput editable={canEdit} value={product.subcategory || ''} onChangeText={subcategory => updateMenuProduct(product.id, { subcategory })} accessibilityLabel={t('Subgrupo do produto')} placeholder={t('Ex.: especiais')} placeholderTextColor={COLORS.placeholder} maxLength={100} style={styles.input} /></View>
                      </View>
                      <View style={styles.menuEditActions}>
                        <Pressable disabled={!canEdit} onPress={() => updateMenuProduct(product.id, { kind: product.kind === 'pizza' ? undefined : 'pizza' })} accessibilityRole="checkbox" accessibilityState={{ checked: product.kind === 'pizza' }} style={[styles.noteChip, product.kind === 'pizza' && styles.selectedCategory]}><Text style={[styles.noteChipText, product.kind === 'pizza' && styles.selectedCategoryText]}>{product.kind === 'pizza' ? t("✓ Pizza") : t("Marcar como pizza")}</Text></Pressable>
                        <Pressable disabled={!canEdit} onPress={() => { removeMenuProduct(product.id); setExpandedId(null); }} style={styles.removeButton}><Text style={styles.removeButtonText}>{t("Excluir")}</Text></Pressable>
                      </View>
                      </View>}
                    </View>)}
                  </View>
                </View></ScreenFrame>;
}
