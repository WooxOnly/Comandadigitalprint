import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Product = { id: string; name: string; category: string; kind?: 'pizza' };
type OrderItem = Product & { quantity: number; note: string };
type SavedOrder = { id: string; plate: string; customer: string; items: OrderItem[]; createdAt: string };

const STORAGE_KEY = '@comandadigitalprint/orders';
const PLATES = Array.from({ length: 10 }, (_, index) => String(index + 1));
const CATEGORIES = ['Todos', 'Lanches', 'Pizzas', 'Bebidas'];
const MENU: Product[] = [
  { id: 'item-1', name: 'Produto de exemplo', category: 'Lanches' },
  { id: 'item-2', name: 'Pizza de exemplo', category: 'Pizzas', kind: 'pizza' },
  { id: 'item-3', name: 'Bebida de exemplo', category: 'Bebidas' },
];
const QUICK_NOTES = ['Sem cebola', 'Pouco sal', 'Bem passado'];

export default function App() {
  const [category, setCategory] = useState('Todos');
  const [plate, setPlate] = useState('1');
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<SavedOrder[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setHistory(JSON.parse(stored) as SavedOrder[]);
    }).catch(() => Alert.alert('Historico indisponivel', 'Nao foi possivel carregar os pedidos salvos.'));
  }, []);

  const filteredMenu = useMemo(() => category === 'Todos' ? MENU : MENU.filter((item) => item.category === category), [category]);

  function addItem(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1, note: '' }];
    });
  }

  function changeQuantity(id: string, delta: number) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  function updateNote(id: string, note: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, note } : item));
  }

  function sendOrder() {
    if (items.length === 0) {
      Alert.alert('Comanda vazia', 'Adicione pelo menos um item antes de enviar.');
      return;
    }
    const order: SavedOrder = { id: `${Date.now()}`, plate, customer: customer.trim(), items, createdAt: new Date().toISOString() };
    const nextHistory = [order, ...history];
    setHistory(nextHistory); setItems([]); setCustomer('');
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory)).catch(() => Alert.alert('Falha ao salvar', 'A comanda foi enviada, mas nao foi salva no dispositivo.'));
    Alert.alert('Comanda registrada', 'A impressao sera conectada quando a impressora for definida.');
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>COMANDA DIGITAL</Text><Text style={styles.title}>Novo pedido</Text></View>
          <Pressable style={styles.historyButton} onPress={() => setShowHistory((visible) => !visible)}><Text style={styles.historyButtonText}>{showHistory ? 'Cardapio' : `Historico (${history.length})`}</Text></Pressable>
        </View>
        {showHistory ? (
          <View><Text style={styles.sectionTitle}>Pedidos enviados</Text>{history.length === 0 ? <Text style={styles.emptyText}>Nenhuma comanda registrada neste aparelho.</Text> : history.map((order) => <View key={order.id} style={styles.historyCard}><View><Text style={styles.cardTitle}>Plaquinha {order.plate}</Text><Text style={styles.mutedText}>{order.customer || 'Cliente nao informado'}</Text></View><Text style={styles.mutedText}>{order.items.length} item(ns)</Text></View>)}</View>
        ) : (
          <>
            <View style={styles.formCard}><Text style={styles.label}>Plaquinha</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plateList}>{PLATES.map((value) => <Pressable key={value} onPress={() => setPlate(value)} style={[styles.plate, value === plate && styles.selectedPlate]}><Text style={[styles.plateText, value === plate && styles.selectedPlateText]}>{value}</Text></Pressable>)}</ScrollView><TextInput value={customer} onChangeText={setCustomer} placeholder="Nome do cliente (opcional)" placeholderTextColor="#8a8f98" style={styles.input} /></View>
            <Text style={styles.sectionTitle}>Cardapio</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{CATEGORIES.map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.category, value === category && styles.selectedCategory]}><Text style={[styles.categoryText, value === category && styles.selectedCategoryText]}>{value}</Text></Pressable>)}</ScrollView>
            <Text style={styles.notice}>Itens demonstrativos: substitua pelo cardapio real antes de operar.</Text>
            {filteredMenu.map((product) => <View key={product.id} style={styles.productCard}><View style={styles.productInfo}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.mutedText}>{product.category}</Text></View><Pressable style={styles.addButton} onPress={() => addItem(product)}><Text style={styles.addButtonText}>Adicionar</Text></Pressable></View>)}
            <View style={styles.orderHeader}><Text style={styles.sectionTitle}>Pedido atual</Text>{items.length > 0 && <Text style={styles.itemCount}>{items.length} item(ns)</Text>}</View>
            {items.length === 0 ? <Text style={styles.emptyText}>Toque em Adicionar para montar a comanda.</Text> : items.map((item) => <View key={item.id} style={styles.orderCard}><View style={styles.orderLine}><View style={styles.productInfo}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.mutedText}>{item.category}</Text></View><View style={styles.quantityControl}><Pressable onPress={() => changeQuantity(item.id, -1)} style={styles.quantityButton}><Text style={styles.quantityText}>-</Text></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable onPress={() => changeQuantity(item.id, 1)} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View></View><TextInput value={item.note} onChangeText={(note) => updateNote(item.id, note)} placeholder="Observacao do item" placeholderTextColor="#8a8f98" style={styles.noteInput} /><View style={styles.quickNotes}>{QUICK_NOTES.map((note) => <Pressable key={note} onPress={() => updateNote(item.id, item.note ? `${item.note}, ${note}` : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{note}</Text></Pressable>)}</View></View>)}
            <Pressable style={styles.sendButton} onPress={sendOrder}><Text style={styles.sendButtonText}>Enviar comanda</Text><Text style={styles.sendButtonHint}>Salva no aparelho e prepara a impressao</Text></Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f2eb' }, content: { padding: 20, paddingTop: 58, paddingBottom: 42 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 }, eyebrow: { color: '#d35d32', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#202322', fontSize: 32, fontWeight: '800', marginTop: 4 },
  historyButton: { backgroundColor: '#202322', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, historyButtonText: { color: '#fffaf0', fontSize: 12, fontWeight: '700' }, formCard: { backgroundColor: '#fffaf0', borderRadius: 12, padding: 16 }, label: { color: '#686b68', fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  plateList: { gap: 8, paddingBottom: 4 }, plate: { alignItems: 'center', borderColor: '#d9d3c9', borderRadius: 8, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 }, selectedPlate: { backgroundColor: '#d35d32', borderColor: '#d35d32' }, plateText: { color: '#424642', fontSize: 16, fontWeight: '800' }, selectedPlateText: { color: '#fffaf0' }, input: { borderBottomColor: '#d9d3c9', borderBottomWidth: 1, color: '#202322', fontSize: 15, marginTop: 15, paddingBottom: 8 },
  sectionTitle: { color: '#202322', fontSize: 20, fontWeight: '800', marginBottom: 12, marginTop: 25 }, categoryList: { gap: 8, paddingBottom: 14 }, category: { borderColor: '#d9d3c9', borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 9 }, selectedCategory: { backgroundColor: '#202322', borderColor: '#202322' }, categoryText: { color: '#686b68', fontSize: 13, fontWeight: '700' }, selectedCategoryText: { color: '#fffaf0' }, notice: { color: '#9a5b3c', fontSize: 12, marginBottom: 10 },
  productCard: { alignItems: 'center', backgroundColor: '#fffaf0', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 15 }, productInfo: { flex: 1 }, cardTitle: { color: '#202322', fontSize: 15, fontWeight: '800' }, mutedText: { color: '#777a76', fontSize: 12, marginTop: 4 }, addButton: { backgroundColor: '#e8b44f', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 }, addButtonText: { color: '#202322', fontSize: 12, fontWeight: '800' },
  orderHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' }, itemCount: { color: '#777a76', fontSize: 12 }, emptyText: { color: '#777a76', fontSize: 14, lineHeight: 21 }, orderCard: { backgroundColor: '#fffaf0', borderRadius: 10, marginBottom: 10, padding: 15 }, orderLine: { alignItems: 'center', flexDirection: 'row' }, quantityControl: { alignItems: 'center', flexDirection: 'row', gap: 8 }, quantityButton: { alignItems: 'center', backgroundColor: '#f0e9dc', borderRadius: 7, height: 30, justifyContent: 'center', width: 30 }, quantityText: { color: '#202322', fontSize: 18, fontWeight: '700' }, quantity: { color: '#202322', fontSize: 15, fontWeight: '800' },
  noteInput: { borderBottomColor: '#d9d3c9', borderBottomWidth: 1, color: '#202322', fontSize: 13, marginTop: 14, paddingBottom: 7 }, quickNotes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }, noteChip: { backgroundColor: '#f0e9dc', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 }, noteChipText: { color: '#686b68', fontSize: 11 }, sendButton: { alignItems: 'center', backgroundColor: '#d35d32', borderRadius: 10, marginTop: 15, padding: 15 }, sendButtonText: { color: '#fffaf0', fontSize: 16, fontWeight: '800' }, sendButtonHint: { color: '#ffe5d8', fontSize: 11, marginTop: 4 }, historyCard: { alignItems: 'center', backgroundColor: '#fffaf0', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 15 },
});
