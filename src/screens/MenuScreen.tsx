import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MENU } from '../../menuData';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, COLORS } from '../ui/theme';
const MENU_KEY = '@comandadigitalprint/menu';

export default function MenuScreen() {
  const { menu, isWide, setMenu, setCategory, updateMenuProduct, removeMenuProduct, addMenuProduct, saveMenu } = useApp();
  return <ScreenFrame><View>
                  <Text style={styles.settingsIntro}>Organize os produtos e as categorias do seu cardápio.</Text>
                  <Pressable style={styles.secondaryWideButton} onPress={() => Alert.alert('Carregar cardápio Seabra', 'Substituir os produtos deste aparelho pelo cardápio das fotos? O histórico será mantido.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Carregar', onPress: () => { setMenu(DEFAULT_MENU); setCategory('Todos'); AsyncStorage.setItem(MENU_KEY, JSON.stringify(DEFAULT_MENU)).catch(() => Alert.alert('Falha ao salvar', 'Tente salvar o cardápio novamente.')); } }])}><Text style={styles.secondaryButtonText}>Carregar cardápio Seabra</Text></Pressable>
                  <View style={styles.menuGrid}>
                    {menu.map((product) => <View key={product.id} style={[styles.menuEditCard, isWide && styles.menuEditCardWide]}>
                      <Text style={styles.fieldLabel}>Nome do produto</Text>
                      <TextInput value={product.name} onChangeText={(name) => updateMenuProduct(product.id, { name })} accessibilityLabel="Nome do produto" placeholder="Ex.: pizza de calabresa" placeholderTextColor={COLORS.placeholder} style={styles.input} />
                      <View style={styles.menuEditRow}>
                        <View style={styles.menuEditField}><Text style={styles.fieldLabel}>Categoria</Text><TextInput value={product.category} onChangeText={(category) => updateMenuProduct(product.id, { category })} accessibilityLabel="Categoria do produto" placeholder="Ex.: pizzas" placeholderTextColor={COLORS.placeholder} style={styles.input} /></View>
                      </View>
                      <View style={styles.menuEditActions}>
                        <Pressable onPress={() => updateMenuProduct(product.id, { kind: product.kind === 'pizza' ? undefined : 'pizza' })} accessibilityRole="checkbox" accessibilityState={{ checked: product.kind === 'pizza' }} style={[styles.noteChip, product.kind === 'pizza' && styles.selectedCategory]}><Text style={[styles.noteChipText, product.kind === 'pizza' && styles.selectedCategoryText]}>{product.kind === 'pizza' ? '✓ Pizza' : 'Marcar como pizza'}</Text></Pressable>
                        <Pressable onPress={() => removeMenuProduct(product.id)} style={styles.removeButton}><Text style={styles.removeButtonText}>Excluir</Text></Pressable>
                      </View>
                    </View>)}
                  </View>
                  <Pressable style={styles.secondaryWideButton} onPress={addMenuProduct}><Text style={styles.secondaryButtonText}>+ Adicionar produto</Text></Pressable>
                  <Pressable style={styles.sendButton} onPress={saveMenu}><Text style={styles.sendButtonText}>Salvar cardápio</Text></Pressable>
                </View></ScreenFrame>;
}
