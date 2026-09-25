import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { describeExtra } from '../../orderItems';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS, PLATES, QUICK_NOTES } from '../ui/theme';

export default function OrderScreen() {
  const { isWide, plate, setPlate, customPlate, setCustomPlate, customer, setCustomer, categories, category, setCategory, filteredMenu, openProduct, items, changeQuantity, updateNote, sendOrder, sending, isReady } = useApp();
  return <ScreenFrame><View style={[styles.columns, isWide && styles.columnsWide]}>
                  <View style={[styles.column, isWide && styles.columnWide]}>
                    <View style={styles.panel}>
                      <Text style={styles.panelTitle}>Identificação</Text>
                      <Text style={styles.fieldLabel}>Plaquinha</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plateList}>{PLATES.map((value) => <Pressable key={value} onPress={() => { setPlate(value); setCustomPlate(''); }} accessibilityRole="radio" accessibilityLabel={'Plaquinha ' + value} accessibilityState={{ checked: value === plate && !customPlate }} style={[styles.plate, value === plate && !customPlate && styles.selectedPlate]}><Text style={[styles.plateText, value === plate && !customPlate && styles.selectedPlateText]}>{value}</Text></Pressable>)}</ScrollView>
                      <TextInput editable={!sending} value={customPlate} onChangeText={setCustomPlate} accessibilityLabel="Outra plaquinha" placeholder="Outra plaquinha (opcional)" placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} />
                      <TextInput editable={!sending} value={customer} onChangeText={setCustomer} accessibilityLabel="Nome do cliente" placeholder="Nome do cliente (opcional)" placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} />
                    </View>
                    <Text style={styles.sectionTitle}>Escolha os produtos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="tab" accessibilityState={{ selected: value === category }} style={[styles.category, value === category && styles.selectedCategory]}><Text style={[styles.categoryText, value === category && styles.selectedCategoryText]}>{value}</Text></Pressable>)}</ScrollView>
                    {filteredMenu.length === 0 && <Text style={styles.emptyText}>Nenhum produto nesta categoria.</Text>}
                    {filteredMenu.map((product) => <Pressable key={product.id} style={({ pressed }) => [styles.productCard, pressed && styles.pressed]} onPress={() => openProduct(product)} accessibilityRole="button" accessibilityLabel={'Adicionar ' + product.name}><View style={styles.productInfo}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.mutedText}>{product.category}</Text>{product.description && <Text style={styles.mutedText}>{product.description}</Text>}</View><View style={styles.productArrow}><Text style={styles.productArrowText}>+</Text></View></Pressable>)}
                  </View>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <View style={styles.orderHeader}><Text style={styles.panelTitle}>Pedido atual</Text><Text style={styles.itemCount}>{items.length} {items.length === 1 ? 'item' : 'itens'}</Text></View>
                    {items.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Vamos montar uma comanda?</Text><Text style={styles.emptyText}>Toque em um produto do cardápio para adicioná-lo ao pedido.</Text></View> : items.map((item) => <View key={item.id} style={styles.orderCard}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.mutedText}>{item.flavors?.map((flavor, index) => `${index + 1}ª metade: ${flavor}`).join('\n') || item.category}</Text>
                      {item.extras?.map((extra) => <Text key={extra.name + extra.placement} style={styles.mutedText}>+ {describeExtra(extra, item.flavors)}</Text>)}
                      <View style={styles.orderLine}>
                        <View style={styles.quantityControl}><Pressable onPress={() => changeQuantity(item.id, -1)} accessibilityRole="button" accessibilityLabel={'Diminuir quantidade de ' + item.name} style={styles.quantityButton}><Text style={styles.quantityText}>−</Text></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable onPress={() => changeQuantity(item.id, 1)} accessibilityRole="button" accessibilityLabel={'Aumentar quantidade de ' + item.name} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View>
                      </View>
                      <TextInput editable={!sending} value={item.note} onChangeText={(note) => updateNote(item.id, note)} accessibilityLabel={'Observação de ' + item.name} placeholder="Observação do item" placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} multiline />
                      <View style={styles.quickNotes}>{QUICK_NOTES.map((note) => <Pressable key={note} onPress={() => updateNote(item.id, item.note ? item.note + ', ' + note : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{note}</Text></Pressable>)}</View>
                    </View>)}
                    <Pressable disabled={sending || !isReady} accessibilityState={{ disabled: sending || !isReady, busy: sending }} style={[styles.sendButton, (sending || !isReady) && styles.pressed]} onPress={sendOrder}><Text style={styles.sendButtonText}>{sending ? 'Salvando e abrindo impressão…' : 'Enviar comanda'}</Text><Text style={styles.sendButtonHint}>Salvar e abrir a impressão</Text></Pressable>
                  </View>
                </View></ScreenFrame>;
}
