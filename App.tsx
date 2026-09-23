import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { printOrder, type PrinterConnection, type PrinterSettings } from './printerService';

type Product = { id: string; name: string; category: string; price: number; kind?: 'pizza' };
type OrderItem = Product & { quantity: number; note: string; flavors?: string[] };
type SavedOrder = { id: string; plate: string; customer: string; items: OrderItem[]; createdAt: string };
type AppScreen = 'home' | 'order' | 'menu' | 'history' | 'printer';

const STORAGE_KEY = '@comandadigitalprint/orders';
const PRINTER_SETTINGS_KEY = '@comandadigitalprint/printer-settings';
const MENU_KEY = '@comandadigitalprint/menu';
const MENU_UPDATE_URL_KEY = '@comandadigitalprint/menu-update-url';
const LOGO_KEY = '@comandadigitalprint/restaurant-logo';
const PLATES = Array.from({ length: 10 }, (_, index) => String(index + 1));
const CONNECTIONS: { value: PrinterConnection; label: string }[] = [
  { value: 'system', label: 'Sistema Android' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'wifi', label: 'Wi-Fi / rede' },
  { value: 'usb', label: 'USB / OTG' },
];
const DEFAULT_PRINTER_SETTINGS: PrinterSettings = { connection: 'system', name: '', address: '', port: '9100', paperWidth: '80' };
const DEFAULT_MENU: Product[] = [
  { id: 'item-1', name: 'Produto de exemplo', category: 'Lanches', price: 0 },
  { id: 'item-2', name: 'Pizza de exemplo', category: 'Pizzas', price: 0, kind: 'pizza' },
  { id: 'item-3', name: 'Bebida de exemplo', category: 'Bebidas', price: 0 },
];
const QUICK_NOTES = ['Sem cebola', 'Pouco sal', 'Bem passado'];

export default function App() {
  const [category, setCategory] = useState('Todos');
  const [plate, setPlate] = useState('1');
  const [customPlate, setCustomPlate] = useState('');
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<SavedOrder[]>([]);
  const [menu, setMenu] = useState<Product[]>(DEFAULT_MENU);
  const [menuUpdateUrl, setMenuUpdateUrl] = useState('');
  const [menuUpdateStatus, setMenuUpdateStatus] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [screen, setScreen] = useState<AppScreen>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productNote, setProductNote] = useState('');
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(PRINTER_SETTINGS_KEY), AsyncStorage.getItem(MENU_KEY), AsyncStorage.getItem(MENU_UPDATE_URL_KEY), AsyncStorage.getItem(LOGO_KEY)]).then(async ([storedOrders, storedPrinter, storedMenu, storedUrl, storedLogo]) => {
      if (storedOrders) setHistory(JSON.parse(storedOrders) as SavedOrder[]);
      if (storedPrinter) setPrinterSettings({ ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(storedPrinter) as Partial<PrinterSettings> });
      if (storedMenu) setMenu(JSON.parse(storedMenu) as Product[]);
      if (storedUrl) {
        setMenuUpdateUrl(storedUrl);
        await refreshMenuFromUrl(storedUrl, false);
      }
      if (storedLogo) setLogoUri(storedLogo);
    }).catch(() => Alert.alert('Dados indisponiveis', 'Nao foi possivel carregar os dados salvos.'));
  }, []);

  const filteredMenu = useMemo(() => category === 'Todos' ? menu : menu.filter((item) => item.category === category), [category, menu]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(menu.map((item) => item.category).filter(Boolean)))], [menu]);
  const pizzaMenu = useMemo(() => menu.filter((item) => item.kind === 'pizza'), [menu]);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setProductNote('');
  }

  function addSelectedProduct() {
    if (!selectedProduct) return;
    setItems((current) => {
      if (!productNote.trim()) {
        const existing = current.find((item) => item.id === selectedProduct.id && !item.note);
        if (existing) return current.map((item) => item.id === selectedProduct.id && !item.note ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, { ...selectedProduct, quantity: 1, note: productNote.trim() }];
    });
    setSelectedProduct(null);
  }

  function addTwoFlavorPizza(first: Product) {
    const second = pizzaMenu.find((product) => product.id !== first.id);
    if (!second) {
      Alert.alert('Cadastre outra pizza', 'A pizza com dois sabores precisa de pelo menos dois sabores cadastrados.');
      return;
    }
    setItems((current) => [...current, { ...first, id: `${first.id}-${second.id}-${Date.now()}`, name: 'Pizza com dois sabores', quantity: 1, note: '', flavors: [first.name, second.name], price: Math.max(first.price, second.price) }]);
  }

  function changeQuantity(id: string, delta: number) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  function updateNote(id: string, note: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, note } : item));
  }

  function updatePrinterSettings(change: Partial<PrinterSettings>) {
    setPrinterSettings((current) => ({ ...current, ...change }));
  }

  async function chooseLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao necessaria', 'Permita o acesso as fotos para escolher a logo do restaurante.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setLogoUri(uri);
      await AsyncStorage.setItem(LOGO_KEY, uri);
    }
  }

  function saveMenu() {
    AsyncStorage.multiSet([[MENU_KEY, JSON.stringify(menu)], [MENU_UPDATE_URL_KEY, menuUpdateUrl.trim()]]).then(() => Alert.alert('Cardapio salvo', 'Os produtos e a URL de atualizacao foram salvos neste aparelho.')).catch(() => Alert.alert('Falha ao salvar', 'Nao foi possivel salvar o cardapio.'));
  }

  function addMenuProduct() {
    setMenu((current) => [...current, { id: `item-${Date.now()}`, name: 'Novo produto', category: 'Lanches', price: 0 }]);
  }

  function updateMenuProduct(id: string, change: Partial<Product>) {
    setMenu((current) => current.map((product) => product.id === id ? { ...product, ...change } : product));
  }

  function removeMenuProduct(id: string) {
    setMenu((current) => current.filter((product) => product.id !== id));
  }

  async function refreshMenuFromUrl(url: string, showFeedback: boolean) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Resposta invalida');
      const remoteMenu = await response.json() as Product[];
      if (!Array.isArray(remoteMenu) || remoteMenu.some((item) => !item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.category !== 'string' || typeof item.price !== 'number' || !Number.isFinite(item.price) || (item.kind !== undefined && item.kind !== 'pizza'))) throw new Error('Formato invalido');
      setMenu(remoteMenu);
      setCategory('Todos');
      setMenuUpdateStatus(`Atualizado em ${new Date().toLocaleTimeString('pt-BR')}`);
      await AsyncStorage.multiSet([[MENU_KEY, JSON.stringify(remoteMenu)], [MENU_UPDATE_URL_KEY, url]]);
      if (showFeedback) Alert.alert('Cardapio atualizado', 'A atualizacao foi aplicada sem bloquear o uso do aplicativo.');
    } catch {
      setMenuUpdateStatus('Usando cardapio local');
      if (showFeedback) Alert.alert('Atualizacao indisponivel', 'Nao foi possivel atualizar agora. O cardapio local continua disponivel.');
    }
  }

  async function updateMenuFromUrl() {
    const url = menuUpdateUrl.trim();
    if (!url) {
      Alert.alert('URL ausente', 'Informe uma URL que retorne uma lista JSON de produtos.');
      return;
    }
    await refreshMenuFromUrl(url, true);
  }

  function orderTotal(orderItems: OrderItem[]) {
    return orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  function savePrinterSettings() {
    AsyncStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(printerSettings)).then(() => {
      Alert.alert('Configuracao salva', 'A impressora sera usada quando a comunicacao for habilitada.');
    }).catch(() => Alert.alert('Falha ao salvar', 'Nao foi possivel salvar a configuracao da impressora.'));
  }

  async function printSavedOrder(order: SavedOrder) {
    try {
      await printOrder(order, printerSettings);
      Alert.alert('Impressao iniciada', 'A comanda foi enviada para o metodo selecionado.');
    } catch (error) {
      Alert.alert('Impressao indisponivel', error instanceof Error ? error.message : 'Nao foi possivel iniciar a impressao.');
    }
  }

  async function testPrinter() {
    await printSavedOrder({ id: 'printer-test', plate: 'TESTE', customer: 'Teste de impressao', items: [{ id: 'printer-test-item', name: 'Comanda de teste', category: 'Teste', price: 0, quantity: 1, note: '' }], createdAt: new Date().toISOString() });
  }

  async function sendOrder() {
    if (items.length === 0) {
      Alert.alert('Comanda vazia', 'Adicione pelo menos um item antes de enviar.');
      return;
    }
    const order: SavedOrder = { id: `${Date.now()}`, plate: customPlate.trim() || plate, customer: customer.trim(), items, createdAt: new Date().toISOString() };
    const nextHistory = [order, ...history];
    setHistory(nextHistory); setItems([]); setCustomer(''); setCustomPlate('');
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      await printSavedOrder(order);
    } catch {
      Alert.alert('Falha ao salvar', 'A comanda foi enviada, mas nao foi salva no dispositivo.');
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.logoButton} onPress={chooseLogo}><View style={styles.logoFrame}>{logoUri ? <Image source={{ uri: logoUri }} style={styles.logoImage} /> : <Text style={styles.logoPlaceholder}>+</Text>}</View><Text style={styles.logoHint}>{logoUri ? 'Trocar logo' : 'Adicionar logo'}</Text></Pressable><View style={styles.headerTitle}><Text style={styles.eyebrow}>COMANDA DIGITAL</Text><Text style={styles.title}>{screen === 'home' ? 'Inicio' : screen === 'order' ? 'Novo pedido' : screen === 'menu' ? 'Cardapio' : screen === 'history' ? 'Historico' : 'Configuracoes'}</Text></View>
          <View style={styles.headerActions}>{screen === 'printer' && <Pressable style={styles.secondaryButton} onPress={testPrinter}><Text style={styles.secondaryButtonText}>Testar impressora</Text></Pressable>}{screen !== 'home' && <Pressable style={styles.backButton} onPress={() => setScreen('home')}><Text style={styles.backButtonText}>Inicio</Text></Pressable>}</View>
        </View>
        {screen === 'home' ? (
          <View>
            <Text style={styles.homeIntro}>Organize pedidos, cardapio e impressao em um so lugar.</Text>
            <Pressable style={styles.startButton} onPress={() => setScreen('order')}><Text style={styles.startButtonText}>Iniciar pedido</Text><Text style={styles.startButtonHint}>Montar uma nova comanda</Text></Pressable>
            <View style={styles.mainMenu}><Pressable style={styles.mainMenuButton} onPress={() => setScreen('order')}><Text style={styles.mainMenuIcon}>+</Text><Text style={styles.mainMenuTitle}>Pedido</Text><Text style={styles.mainMenuHint}>Nova comanda</Text></Pressable><Pressable style={styles.mainMenuButton} onPress={() => setScreen('menu')}><Text style={styles.mainMenuIcon}>≡</Text><Text style={styles.mainMenuTitle}>Cadastro</Text><Text style={styles.mainMenuHint}>Cardapio e produtos</Text></Pressable><Pressable style={styles.mainMenuButton} onPress={() => setScreen('history')}><Text style={styles.mainMenuIcon}>◷</Text><Text style={styles.mainMenuTitle}>Historico</Text><Text style={styles.mainMenuHint}>{history.length} pedido(s)</Text></Pressable><Pressable style={styles.mainMenuButton} onPress={() => setScreen('printer')}><Text style={styles.mainMenuIcon}>⚙</Text><Text style={styles.mainMenuTitle}>Configuracoes</Text><Text style={styles.mainMenuHint}>Impressora</Text></Pressable></View>
          </View>
        ) : screen === 'printer' ? (
          <View><Text style={styles.sectionTitle}>Configuracao da impressora</Text><Text style={styles.settingsIntro}>Escolha como o Android vai localizar a impressora. Os dados ficam salvos neste aparelho.</Text><Text style={styles.label}>Metodo de conexao</Text><View style={styles.connectionList}>{CONNECTIONS.map((option) => <Pressable key={option.value} onPress={() => updatePrinterSettings({ connection: option.value })} style={[styles.connectionOption, option.value === printerSettings.connection && styles.selectedConnection]}><Text style={[styles.connectionText, option.value === printerSettings.connection && styles.selectedConnectionText]}>{option.label}</Text></Pressable>)}</View><TextInput value={printerSettings.name} onChangeText={(name) => updatePrinterSettings({ name })} placeholder="Nome da impressora (opcional)" placeholderTextColor="#8a8f98" style={styles.input} /><TextInput value={printerSettings.address} onChangeText={(address) => updatePrinterSettings({ address })} placeholder={printerSettings.connection === 'wifi' ? 'Endereco IP ou nome da rede' : 'Endereco, MAC ou identificador'} placeholderTextColor="#8a8f98" style={styles.input} autoCapitalize="none" /><TextInput value={printerSettings.port} onChangeText={(port) => updatePrinterSettings({ port })} placeholder="Porta (rede)" placeholderTextColor="#8a8f98" style={styles.input} keyboardType="number-pad" /><Text style={[styles.label, styles.paperLabel]}>Largura do papel</Text><View style={styles.paperOptions}>{(['58', '80'] as const).map((width) => <Pressable key={width} onPress={() => updatePrinterSettings({ paperWidth: width })} style={[styles.paperOption, width === printerSettings.paperWidth && styles.selectedConnection]}><Text style={[styles.connectionText, width === printerSettings.paperWidth && styles.selectedConnectionText]}>{width} mm</Text></Pressable>)}</View><Pressable style={styles.sendButton} onPress={savePrinterSettings}><Text style={styles.sendButtonText}>Salvar configuracao</Text></Pressable></View>
        ) : screen === 'menu' ? (
          <View>
            <Text style={styles.sectionTitle}>Editar cardapio</Text>
            <Text style={styles.settingsIntro}>Cadastre produtos localmente e salve-os no aparelho.</Text>
            {menu.map((product) => <View key={product.id} style={styles.menuEditCard}><TextInput value={product.name} onChangeText={(name) => updateMenuProduct(product.id, { name })} placeholder="Nome do produto" placeholderTextColor="#8a8f98" style={styles.input} /><View style={styles.menuEditRow}><TextInput value={product.category} onChangeText={(category) => updateMenuProduct(product.id, { category })} placeholder="Categoria" placeholderTextColor="#8a8f98" style={[styles.input, styles.menuEditField]} /><TextInput value={String(product.price)} onChangeText={(price) => updateMenuProduct(product.id, { price: Number(price.replace(',', '.')) || 0 })} placeholder="Preco" placeholderTextColor="#8a8f98" style={[styles.input, styles.menuEditField]} keyboardType="decimal-pad" /></View><View style={styles.menuEditActions}><Pressable onPress={() => updateMenuProduct(product.id, { kind: product.kind === 'pizza' ? undefined : 'pizza' })} style={styles.noteChip}><Text style={styles.noteChipText}>{product.kind === 'pizza' ? 'Pizza' : 'Marcar pizza'}</Text></Pressable><Pressable onPress={() => removeMenuProduct(product.id)} style={styles.removeButton}><Text style={styles.removeButtonText}>Excluir</Text></Pressable></View></View>)}
            <Pressable style={styles.secondaryWideButton} onPress={addMenuProduct}><Text style={styles.secondaryButtonText}>Adicionar produto</Text></Pressable>
            <Pressable style={styles.sendButton} onPress={saveMenu}><Text style={styles.sendButtonText}>Salvar cardapio</Text></Pressable>
            <Text style={[styles.label, styles.paperLabel]}>Atualizacao opcional pela internet</Text>
            <TextInput value={menuUpdateUrl} onChangeText={(url) => { setMenuUpdateUrl(url); setMenuUpdateStatus('URL nao salva'); }} placeholder="URL do JSON do cardapio" placeholderTextColor="#8a8f98" style={styles.input} autoCapitalize="none" keyboardType="url" />
            <Text style={styles.mutedText}>{menuUpdateStatus || 'Ao abrir o app, a URL salva sera consultada automaticamente.'}</Text>
            <Pressable style={styles.secondaryWideButton} onPress={updateMenuFromUrl}><Text style={styles.secondaryButtonText}>Forcar atualizacao agora</Text></Pressable>
          </View>
        ) : screen === 'history' ? (
          <View><Text style={styles.sectionTitle}>Pedidos enviados</Text>{history.length === 0 ? <Text style={styles.emptyText}>Nenhuma comanda registrada neste aparelho.</Text> : history.map((order) => <View key={order.id} style={styles.historyCard}><View style={styles.productInfo}><Text style={styles.cardTitle}>Plaquinha {order.plate}</Text><Text style={styles.mutedText}>{order.customer || 'Cliente nao informado'}</Text><Text style={styles.mutedText}>{order.items.length} item(ns) - R$ {orderTotal(order.items).toFixed(2).replace('.', ',')}</Text></View><Pressable style={styles.addButton} onPress={() => printSavedOrder(order)}><Text style={styles.addButtonText}>Reimprimir</Text></Pressable></View>)}</View>
        ) : (
          <>
            <View style={styles.formCard}><Text style={styles.label}>Plaquinha</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plateList}>{PLATES.map((value) => <Pressable key={value} onPress={() => { setPlate(value); setCustomPlate(''); }} style={[styles.plate, value === plate && !customPlate && styles.selectedPlate]}><Text style={[styles.plateText, value === plate && !customPlate && styles.selectedPlateText]}>{value}</Text></Pressable>)}</ScrollView><TextInput value={customPlate} onChangeText={setCustomPlate} placeholder="Outra plaquinha (opcional)" placeholderTextColor="#8a8f98" style={styles.input} /><TextInput value={customer} onChangeText={setCustomer} placeholder="Nome do cliente (opcional)" placeholderTextColor="#8a8f98" style={styles.input} /></View>
            <Text style={styles.sectionTitle}>Cardapio</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{categories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.category, value === category && styles.selectedCategory]}><Text style={[styles.categoryText, value === category && styles.selectedCategoryText]}>{value}</Text></Pressable>)}</ScrollView>
            <Text style={styles.notice}>{menu.length === DEFAULT_MENU.length ? 'Cardapio inicial: configure os produtos antes de operar.' : 'Cardapio local'}</Text>
            {filteredMenu.map((product) => <Pressable key={product.id} style={styles.productCard} onPress={() => openProduct(product)}><View style={styles.productInfo}><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.mutedText}>{product.category} - R$ {product.price.toFixed(2).replace('.', ',')}</Text></View><Text style={styles.productArrow}>+</Text></Pressable>)}
            <View style={styles.orderHeader}><Text style={styles.sectionTitle}>Pedido atual</Text>{items.length > 0 && <Text style={styles.itemCount}>{items.length} item(ns)</Text>}</View>
            {items.length === 0 ? <Text style={styles.emptyText}>Toque em Adicionar para montar a comanda.</Text> : items.map((item) => <View key={item.id} style={styles.orderCard}><View style={styles.orderLine}><View style={styles.productInfo}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.mutedText}>{item.flavors?.join(' / ') || item.category}</Text><Text style={styles.mutedText}>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</Text></View><View style={styles.quantityControl}><Pressable onPress={() => changeQuantity(item.id, -1)} style={styles.quantityButton}><Text style={styles.quantityText}>-</Text></Pressable><Text style={styles.quantity}>{item.quantity}</Text><Pressable onPress={() => changeQuantity(item.id, 1)} style={styles.quantityButton}><Text style={styles.quantityText}>+</Text></Pressable></View></View><TextInput value={item.note} onChangeText={(note) => updateNote(item.id, note)} placeholder="Observacao do item" placeholderTextColor="#8a8f98" style={styles.noteInput} /><View style={styles.quickNotes}>{QUICK_NOTES.map((note) => <Pressable key={note} onPress={() => updateNote(item.id, item.note ? `${item.note}, ${note}` : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{note}</Text></Pressable>)}</View></View>)}
            {items.length > 0 && <Text style={styles.totalText}>Total: R$ {orderTotal(items).toFixed(2).replace('.', ',')}</Text>}
            <Pressable style={styles.sendButton} onPress={sendOrder}><Text style={styles.sendButtonText}>Enviar comanda</Text><Text style={styles.sendButtonHint}>Salva no aparelho e abre a impressao</Text></Pressable>
          </>
        )}
        <View style={styles.bottomNav}><Pressable style={[styles.bottomNavButton, screen === 'order' && styles.activeBottomNavButton]} onPress={() => setScreen('order')}><Text style={styles.bottomNavText}>Pedido</Text></Pressable><Pressable style={[styles.bottomNavButton, screen === 'menu' && styles.activeBottomNavButton]} onPress={() => setScreen('menu')}><Text style={styles.bottomNavText}>Cadastro</Text></Pressable><Pressable style={[styles.bottomNavButton, screen === 'history' && styles.activeBottomNavButton]} onPress={() => setScreen('history')}><Text style={styles.bottomNavText}>Historico</Text></Pressable><Pressable style={[styles.bottomNavButton, screen === 'printer' && styles.activeBottomNavButton]} onPress={() => setScreen('printer')}><Text style={styles.bottomNavText}>Configuracoes</Text></Pressable></View>
      </ScrollView>
      <Modal visible={selectedProduct !== null} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}><View style={styles.modalBackdrop}><View style={styles.productModal}><Text style={styles.modalTitle}>{selectedProduct?.name}</Text><Text style={styles.mutedText}>Observacao do produto (opcional)</Text><View style={styles.quickNotes}>{['Remover cebola', 'Adicionar ovos', 'Sem pimenta'].map((note) => <Pressable key={note} onPress={() => setProductNote((current) => current ? `${current}, ${note}` : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{note}</Text></Pressable>)}</View><TextInput value={productNote} onChangeText={setProductNote} placeholder="Ex.: bem passado, sem molho..." placeholderTextColor="#8a8f98" style={styles.modalInput} multiline />{selectedProduct?.kind === 'pizza' && <Pressable style={styles.secondaryWideButton} onPress={() => { addTwoFlavorPizza(selectedProduct); setSelectedProduct(null); }}><Text style={styles.secondaryButtonText}>Adicionar com dois sabores</Text></Pressable>}<View style={styles.modalActions}><Pressable style={styles.cancelButton} onPress={() => setSelectedProduct(null)}><Text style={styles.cancelButtonText}>Cancelar</Text></Pressable><Pressable style={styles.sendButton} onPress={addSelectedProduct}><Text style={styles.sendButtonText}>Adicionar ao pedido</Text></Pressable></View></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f2eb' }, content: { padding: 20, paddingTop: 58, paddingBottom: 42 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 26 }, logoButton: { alignItems: 'center', marginRight: 12 }, logoFrame: { alignItems: 'center', backgroundColor: '#e8b44f', borderColor: '#d35d32', borderRadius: 12, borderWidth: 2, height: 58, justifyContent: 'center', overflow: 'hidden', width: 58 }, logoImage: { height: '100%', width: '100%' }, logoPlaceholder: { color: '#202322', fontSize: 28, fontWeight: '400' }, logoHint: { color: '#777a76', fontSize: 9, marginTop: 3 }, headerTitle: { flex: 1 }, eyebrow: { color: '#d35d32', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, title: { color: '#202322', fontSize: 32, fontWeight: '800', marginTop: 4 }, backButton: { backgroundColor: '#202322', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, backButtonText: { color: '#fffaf0', fontSize: 12, fontWeight: '700' },
  headerActions: { alignItems: 'flex-end', gap: 6 }, historyButton: { backgroundColor: '#202322', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, historyButtonText: { color: '#fffaf0', fontSize: 12, fontWeight: '700' }, secondaryButton: { backgroundColor: '#e8b44f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }, secondaryButtonText: { color: '#202322', fontSize: 12, fontWeight: '700' }, homeIntro: { color: '#777a76', fontSize: 15, lineHeight: 22, marginBottom: 18 }, startButton: { backgroundColor: '#d35d32', borderRadius: 12, marginBottom: 22, padding: 20 }, startButtonText: { color: '#fffaf0', fontSize: 22, fontWeight: '800' }, startButtonHint: { color: '#ffe5d8', fontSize: 12, marginTop: 5 }, mainMenu: { gap: 10 }, mainMenuButton: { backgroundColor: '#fffaf0', borderColor: '#d9d3c9', borderRadius: 10, borderWidth: 1, padding: 16 }, activeMainMenuButton: { backgroundColor: '#f0e9dc', borderColor: '#d35d32', borderWidth: 2 }, mainMenuIcon: { color: '#d35d32', fontSize: 24, fontWeight: '800' }, mainMenuTitle: { color: '#202322', fontSize: 17, fontWeight: '800', marginTop: 5 }, mainMenuHint: { color: '#777a76', fontSize: 12, marginTop: 3 }, formCard: { backgroundColor: '#fffaf0', borderRadius: 12, padding: 16 }, label: { color: '#686b68', fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  plateList: { gap: 8, paddingBottom: 4 }, plate: { alignItems: 'center', borderColor: '#d9d3c9', borderRadius: 8, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 }, selectedPlate: { backgroundColor: '#d35d32', borderColor: '#d35d32' }, plateText: { color: '#424642', fontSize: 16, fontWeight: '800' }, selectedPlateText: { color: '#fffaf0' }, input: { borderBottomColor: '#d9d3c9', borderBottomWidth: 1, color: '#202322', fontSize: 15, marginTop: 15, paddingBottom: 8 },
  sectionTitle: { color: '#202322', fontSize: 20, fontWeight: '800', marginBottom: 12, marginTop: 25 }, categoryList: { gap: 8, paddingBottom: 14 }, category: { borderColor: '#d9d3c9', borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 9 }, selectedCategory: { backgroundColor: '#202322', borderColor: '#202322' }, categoryText: { color: '#686b68', fontSize: 13, fontWeight: '700' }, selectedCategoryText: { color: '#fffaf0' }, notice: { color: '#9a5b3c', fontSize: 12, marginBottom: 10 },
  settingsIntro: { color: '#777a76', fontSize: 14, lineHeight: 21, marginBottom: 20 }, connectionList: { gap: 8, marginBottom: 8 }, connectionOption: { backgroundColor: '#fffaf0', borderColor: '#d9d3c9', borderRadius: 8, borderWidth: 1, padding: 14 }, selectedConnection: { backgroundColor: '#202322', borderColor: '#202322' }, connectionText: { color: '#424642', fontSize: 14, fontWeight: '700' }, selectedConnectionText: { color: '#fffaf0' }, paperLabel: { marginTop: 22 }, paperOptions: { flexDirection: 'row', gap: 8, marginBottom: 10 }, paperOption: { alignItems: 'center', backgroundColor: '#fffaf0', borderColor: '#d9d3c9', borderRadius: 8, borderWidth: 1, flex: 1, padding: 14 }, menuEditCard: { backgroundColor: '#fffaf0', borderRadius: 10, marginBottom: 10, padding: 14 }, menuEditRow: { flexDirection: 'row', gap: 10 }, menuEditField: { flex: 1 }, menuEditActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }, removeButton: { backgroundColor: '#f5d8d0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 }, removeButtonText: { color: '#a53e2b', fontSize: 12, fontWeight: '700' }, secondaryWideButton: { alignItems: 'center', backgroundColor: '#e8b44f', borderRadius: 8, marginTop: 10, padding: 13 }, productCard: { alignItems: 'center', backgroundColor: '#fffaf0', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 15 }, productArrow: { backgroundColor: '#e8b44f', borderRadius: 16, color: '#202322', fontSize: 22, fontWeight: '700', height: 32, lineHeight: 29, textAlign: 'center', width: 32 }, productActions: { alignItems: 'flex-end', gap: 7 }, productInfo: { flex: 1 }, cardTitle: { color: '#202322', fontSize: 15, fontWeight: '800' }, mutedText: { color: '#777a76', fontSize: 12, marginTop: 4 }, addButton: { backgroundColor: '#e8b44f', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 9 }, addButtonText: { color: '#202322', fontSize: 12, fontWeight: '800' },
  orderHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' }, itemCount: { color: '#777a76', fontSize: 12 }, emptyText: { color: '#777a76', fontSize: 14, lineHeight: 21 }, orderCard: { backgroundColor: '#fffaf0', borderRadius: 10, marginBottom: 10, padding: 15 }, orderLine: { alignItems: 'center', flexDirection: 'row' }, quantityControl: { alignItems: 'center', flexDirection: 'row', gap: 8 }, quantityButton: { alignItems: 'center', backgroundColor: '#f0e9dc', borderRadius: 7, height: 30, justifyContent: 'center', width: 30 }, quantityText: { color: '#202322', fontSize: 18, fontWeight: '700' }, quantity: { color: '#202322', fontSize: 15, fontWeight: '800' },
  noteInput: { borderBottomColor: '#d9d3c9', borderBottomWidth: 1, color: '#202322', fontSize: 13, marginTop: 14, paddingBottom: 7 }, quickNotes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }, noteChip: { backgroundColor: '#f0e9dc', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 }, noteChipText: { color: '#686b68', fontSize: 11 }, modalBackdrop: { backgroundColor: 'rgba(32,35,34,0.45)', flex: 1, justifyContent: 'flex-end' }, productModal: { backgroundColor: '#fffaf0', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20 }, modalTitle: { color: '#202322', fontSize: 22, fontWeight: '800', marginBottom: 5 }, modalInput: { borderColor: '#d9d3c9', borderRadius: 8, borderWidth: 1, color: '#202322', minHeight: 72, marginTop: 14, padding: 12, textAlignVertical: 'top' }, modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 }, cancelButton: { alignItems: 'center', borderColor: '#d9d3c9', borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center', padding: 15 }, cancelButtonText: { color: '#686b68', fontSize: 14, fontWeight: '700' }, totalText: { color: '#202322', fontSize: 18, fontWeight: '800', marginTop: 8, textAlign: 'right' }, sendButton: { alignItems: 'center', backgroundColor: '#d35d32', borderRadius: 10, marginTop: 15, padding: 15 }, sendButtonText: { color: '#fffaf0', fontSize: 16, fontWeight: '800' }, sendButtonHint: { color: '#ffe5d8', fontSize: 11, marginTop: 4 }, bottomNav: { borderTopColor: '#d9d3c9', borderTopWidth: 1, flexDirection: 'row', gap: 6, marginTop: 28, paddingTop: 12 }, bottomNavButton: { alignItems: 'center', borderRadius: 8, flex: 1, paddingHorizontal: 4, paddingVertical: 10 }, activeBottomNavButton: { backgroundColor: '#202322' }, bottomNavText: { color: '#686b68', fontSize: 11, fontWeight: '700', textAlign: 'center' }, historyCard: { alignItems: 'center', backgroundColor: '#fffaf0', borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, padding: 15 },
});
