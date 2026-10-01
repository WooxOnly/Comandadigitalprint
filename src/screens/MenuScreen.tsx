import { useLanguage } from '../i18n/LanguageContext';
import { useState } from 'react';
import { Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS } from '../ui/theme';

export default function MenuScreen() {
  const { t } = useLanguage();
  const { width, fontScale } = useWindowDimensions();
  const { menu, updateMenuProduct, removeMenuProduct, addMenuProduct, saveMenu } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return <ScreenFrame><View>
                  <Text style={styles.settingsIntro}>{t("Organize os produtos em grupos e subgrupos.")}</Text>
                  <View style={styles.menuEditActions}>
                    <Pressable style={styles.addButton} onPress={() => setExpandedId(addMenuProduct())}><Text style={styles.addButtonText}>{t("+ Adicionar produto")}</Text></Pressable>
                    <Pressable style={styles.addButton} onPress={() => saveMenu()}><Text style={styles.addButtonText}>{t("Salvar cardápio")}</Text></Pressable>
                  </View>
                  <View style={styles.menuList}>
                    {menu.map((product) => <View key={product.id} style={styles.menuListItem}>
                      <Pressable style={styles.menuListHeader} accessibilityRole="button" accessibilityState={{ expanded: expandedId === product.id }} accessibilityLabel={`${product.name}, ${t(expandedId === product.id ? 'Ocultar detalhes' : 'Ver detalhes')}`} onPress={() => setExpandedId(expandedId === product.id ? null : product.id)}>
                        <View style={styles.menuListTitle}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.mutedText}>{[product.category, product.subcategory].filter(Boolean).join(' › ')}</Text></View>
                        <Text style={styles.connectionText}>{expandedId === product.id ? '▴' : '▾'}</Text>
                      </Pressable>
                      {expandedId === product.id && <View style={styles.menuListDetails}>
                      <Text style={styles.fieldLabel}>{t("Nome do produto")}</Text>
                      <TextInput value={product.name} onChangeText={(name) => updateMenuProduct(product.id, { name })} accessibilityLabel={t("Nome do produto")} placeholder={t("Ex.: pizza de calabresa")} placeholderTextColor={COLORS.placeholder} style={styles.input} />
                      <Text style={styles.fieldLabel}>{t('Ingredientes / descrição')}</Text>
                      <TextInput value={product.description || ''} onChangeText={(description) => updateMenuProduct(product.id, { description })} accessibilityLabel={t('Ingredientes / descrição')} placeholder={t('Ingredientes do produto')} placeholderTextColor={COLORS.placeholder} style={styles.input} multiline maxLength={2000} />
                      <View style={[styles.menuEditRow, width < 520 * Math.min(fontScale, 1.5) && styles.menuEditRowCompact]}>
                        <View style={styles.menuEditField}><Text style={styles.fieldLabel}>{t("Grupo")}</Text><TextInput value={product.category} onChangeText={(category) => updateMenuProduct(product.id, { category })} accessibilityLabel={t("Grupo do produto")} placeholder={t("Ex.: pizzas")} placeholderTextColor={COLORS.placeholder} style={styles.input} /></View>
                        <View style={styles.menuEditField}><Text style={styles.fieldLabel}>{t('Subgrupo (opcional)')}</Text><TextInput value={product.subcategory || ''} onChangeText={subcategory => updateMenuProduct(product.id, { subcategory })} accessibilityLabel={t('Subgrupo do produto')} placeholder={t('Ex.: especiais')} placeholderTextColor={COLORS.placeholder} maxLength={100} style={styles.input} /></View>
                      </View>
                      <View style={styles.menuEditActions}>
                        <Pressable onPress={() => updateMenuProduct(product.id, { kind: product.kind === 'pizza' ? undefined : 'pizza' })} accessibilityRole="checkbox" accessibilityState={{ checked: product.kind === 'pizza' }} style={[styles.noteChip, product.kind === 'pizza' && styles.selectedCategory]}><Text style={[styles.noteChipText, product.kind === 'pizza' && styles.selectedCategoryText]}>{product.kind === 'pizza' ? t("✓ Pizza") : t("Marcar como pizza")}</Text></Pressable>
                        <Pressable onPress={() => { removeMenuProduct(product.id); setExpandedId(null); }} style={styles.removeButton}><Text style={styles.removeButtonText}>{t("Excluir")}</Text></Pressable>
                      </View>
                      </View>}
                    </View>)}
                  </View>
                </View></ScreenFrame>;
}
