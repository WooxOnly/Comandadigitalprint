import { itemName, translatedNote } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { describeExtra } from '../../orderItems';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS, PLATES, QUICK_NOTES } from '../ui/theme';

export default function OrderScreen() {
  const { t, language } = useLanguage();
  const { isWide, plate, setPlate, customPlate, setCustomPlate, customer, changeCustomer, orderSettings, customerError, categories, category, setCategory, filteredMenu, openProduct, items, changeQuantity, updateNote, sendOrder, sending, isReady } = useApp();
  return <ScreenFrame><View style={[styles.columns, isWide && styles.columnsWide]}>
                  <View style={[styles.column, isWide && styles.columnWide]}>
                    <View style={styles.panel}>
                      <Text style={styles.panelTitle}>{t("Identificação")}</Text>
                      <Text style={styles.fieldLabel}>{t("Plaquinha")}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plateList}>{PLATES.map((value) => <Pressable key={value} onPress={() => { setPlate(value); setCustomPlate(''); }} accessibilityRole="radio" accessibilityLabel={t("Plaquinha ") + value} accessibilityState={{ checked: value === plate && !customPlate }} style={[styles.plate, value === plate && !customPlate && styles.selectedPlate]}><Text style={[styles.plateText, value === plate && !customPlate && styles.selectedPlateText]}>{t(value)}</Text></Pressable>)}</ScrollView>
                      <TextInput editable={!sending} value={customPlate} onChangeText={setCustomPlate} accessibilityLabel={t("Outra plaquinha")} placeholder={t("Outra plaquinha (opcional)")} placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} />
                      <Text style={styles.fieldLabel}>{t("Cliente")} {orderSettings.requireCustomer ? t("(obrigatório)") : t("(opcional)")}</Text>
                      <TextInput editable={!sending} value={customer} onChangeText={changeCustomer} accessibilityLabel={orderSettings.requireCustomer ? t("Nome do cliente, obrigatório") : t("Nome do cliente, opcional")} placeholder={t("Nome do cliente")} placeholderTextColor={COLORS.placeholder} style={[styles.input, !!customerError && styles.inputError]} />
                      {!!customerError && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(customerError)}</Text>}
                    </View>
                    <Text style={styles.sectionTitle}>{t("Escolha os produtos")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="tab" accessibilityState={{ selected: value === category }} style={[styles.category, value === category && styles.selectedCategory]}><Text style={[styles.categoryText, value === category && styles.selectedCategoryText]}>{t(value)}</Text></Pressable>)}</ScrollView>
                    {filteredMenu.length === 0 && <Text style={styles.emptyText}>{t("Nenhum produto nesta categoria.")}</Text>}
                    {filteredMenu.map((product) => <Pressable key={product.id} style={({ pressed }) => [styles.productCard, pressed && styles.pressed]} onPress={() => openProduct(product)} accessibilityRole="button" accessibilityLabel={t("Adicionar ") + product.name}><View style={styles.productInfo}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.mutedText}>{t(product.category)}</Text>{product.description && <Text style={styles.mutedText}>{product.description}</Text>}</View><View style={styles.productArrow}><Text style={styles.productArrowText}>+</Text></View></Pressable>)}
                  </View>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <View style={styles.orderHeader}><Text style={styles.panelTitle}>{t("Pedido atual")}</Text><Text style={styles.itemCount}>{items.length} {items.length === 1 ? t("item") : t("itens")}</Text></View>
                    {items.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t("Vamos montar uma comanda?")}</Text><Text style={styles.emptyText}>{t("Toque em um produto do cardápio para adicioná-lo ao pedido.")}</Text></View> : items.map((item) => <View key={item.id} style={styles.orderCard}>
                      <Text style={styles.cardTitle}>{itemName(item.name, language)}</Text>
                      <Text style={styles.mutedText}>{item.flavors?.map((flavor, index) => `${t(index === 0 ? '1ª metade:' : '2ª metade:')} ${flavor}`).join('\n') || t(item.category)}</Text>
                      {item.extras?.map((extra) => <Text key={extra.name + extra.placement} style={styles.mutedText}>+ {describeExtra(extra, item.flavors, language)}</Text>)}
                      <View style={styles.orderLine}>
                        <View style={styles.quantityControl}><Pressable onPress={() => changeQuantity(item.id, -1)} accessibilityRole="button" accessibilityLabel={t("Diminuir quantidade de ") + itemName(item.name, language)} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable onPress={() => changeQuantity(item.id, 1)} accessibilityRole="button" accessibilityLabel={t("Aumentar quantidade de ") + itemName(item.name, language)} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View>
                      </View>
                      <TextInput editable={!sending} value={translatedNote(item.note, language)} onChangeText={(note) => updateNote(item.id, note)} accessibilityLabel={t("Observação de ") + itemName(item.name, language)} placeholder={t("Observação do item")} placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} multiline />
                      <View style={styles.quickNotes}>{QUICK_NOTES.map((note) => <Pressable key={t(note)} onPress={() => updateNote(item.id, item.note ? item.note + ', ' + note : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{t(note)}</Text></Pressable>)}</View>
                    </View>)}
                    <Pressable disabled={sending || !isReady} accessibilityState={{ disabled: sending || !isReady, busy: sending }} style={[styles.sendButton, (sending || !isReady) && styles.pressed]} onPress={sendOrder}><Text style={styles.sendButtonText}>{sending ? t("Salvando e abrindo impressão…") : t("Enviar comanda")}</Text><Text style={styles.sendButtonHint}>{t("Salvar e abrir a impressão")}</Text></Pressable>
                  </View>
                </View></ScreenFrame>;
}
