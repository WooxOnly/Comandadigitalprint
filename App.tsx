import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { printOrder, type PrinterConnection, type PrinterSettings } from './printerService';
import { DEFAULT_MENU, TOPPINGS, isDemoMenu, type Product } from './menuData';
import { createOrderItem, describeExtra, type OrderItem, type PizzaMode, type Extra } from './orderItems';

type SavedOrder = { id: string; plate: string; customer: string; items: OrderItem[]; createdAt: string };
type AppScreen = 'home' | 'order' | 'menu' | 'history' | 'printer';

const STORAGE_KEY = '@comandadigitalprint/orders';
const PRINTER_SETTINGS_KEY = '@comandadigitalprint/printer-settings';
const MENU_KEY = '@comandadigitalprint/menu';
const MENU_UPDATE_URL_KEY = '@comandadigitalprint/menu-update-url';
const LOGO_KEY = '@comandadigitalprint/restaurant-logo';
const PLATES = Array.from({ length: 10 }, (_, index) => String(index + 1));
const CONNECTIONS: { value: PrinterConnection; label: string }[] = [
  { value: 'system', label: Platform.OS === 'ios' ? 'Sistema iOS (AirPrint)' : 'Sistema Android' },
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'wifi', label: 'Wi-Fi / rede' },
  { value: 'usb', label: 'USB / OTG' },
];
const DEFAULT_PRINTER_SETTINGS: PrinterSettings = { connection: 'system', name: '', address: '', port: '9100', paperWidth: '80' };
const QUICK_NOTES = ['Sem cebola', 'Pouco sal', 'Bem passado'];

const TABS: { screen: AppScreen; label: string; title: string; icon: string; hint: string }[] = [
  { screen: 'home', label: 'Início', title: 'Início', icon: '⌂', hint: 'Visão geral' },
  { screen: 'order', label: 'Pedido', title: 'Novo pedido', icon: '+', hint: 'Montar uma comanda' },
  { screen: 'menu', label: 'Cardápio', title: 'Cardápio', icon: '≡', hint: 'Produtos e categorias' },
  { screen: 'history', label: 'Histórico', title: 'Histórico', icon: '◷', hint: 'Consultar e reimprimir' },
  { screen: 'printer', label: 'Ajustes', title: 'Configurações', icon: '⚙', hint: 'Impressora e atualização' },
];

const COLORS = {
  background: '#F5F3EF', surface: '#FFFFFF', ink: '#223B35', muted: '#62716B',
  border: '#DBE2DC', green: '#214B40', greenSoft: '#E8F1EC',
  primary: '#AE4328', primarySoft: '#FCEBE3', placeholder: '#6C7771',
};

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
  const [pizzaMode, setPizzaMode] = useState<PizzaMode | null>(null);
  const [secondFlavor, setSecondFlavor] = useState<Product | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extraPlacement, setExtraPlacement] = useState<Extra['placement']>('whole');
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(DEFAULT_PRINTER_SETTINGS);
  const [feedback, setFeedback] = useState<{ title: string; message: string; tone: 'success' | 'error' } | null>(null);
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const isWide = windowWidth >= 760 && fontScale < 1.4;
  const currentTab = TABS.find((tab) => tab.screen === screen)!;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedProduct) {
        setSelectedProduct(null);
        return true;
      }
      if (screen !== 'home') {
        setScreen('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [screen, selectedProduct]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(PRINTER_SETTINGS_KEY), AsyncStorage.getItem(MENU_KEY), AsyncStorage.getItem(MENU_UPDATE_URL_KEY), AsyncStorage.getItem(LOGO_KEY)]).then(async ([storedOrders, storedPrinter, storedMenu, storedUrl, storedLogo]) => {
      if (storedOrders) setHistory(JSON.parse(storedOrders) as SavedOrder[]);
      if (storedPrinter) setPrinterSettings({ ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(storedPrinter) as Partial<PrinterSettings> });
      if (storedMenu) {
        const saved = JSON.parse(storedMenu) as Product[];
        setMenu(isDemoMenu(saved) ? DEFAULT_MENU : saved);
      }
      if (storedUrl) {
        setMenuUpdateUrl(storedUrl);
        await refreshMenuFromUrl(storedUrl, false);
      }
      if (storedLogo) setLogoUri(storedLogo);
    }).catch(() => Alert.alert('Dados indisponíveis', 'Não foi possível carregar os dados salvos.'));
  }, []);

  const filteredMenu = useMemo(() => category === 'Todos' ? menu : menu.filter((item) => item.category === category), [category, menu]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(menu.map((item) => item.category).filter(Boolean)))], [menu]);
  const pizzaMenu = useMemo(() => menu.filter((item) => item.kind === 'pizza'), [menu]);

  function openProduct(product: Product) {
    setSelectedProduct(product);
    setProductNote('');
    setPizzaMode(product.allowsExtras === false ? 'whole' : null);
    setSecondFlavor(null);
    setExtras([]);
    setExtraPlacement('whole');
  }

  function addSelectedProduct() {
    if (!selectedProduct) return;
    try {
      const item = createOrderItem(selectedProduct, productNote, pizzaMode, secondFlavor, extras);
      setItems((current) => [...current, item]);
      setSelectedProduct(null);
    } catch (error) {
      Alert.alert('Confira a pizza', error instanceof Error ? error.message : 'Confira os sabores.');
    }
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
      Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher o logotipo do restaurante.');
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
    AsyncStorage.multiSet([[MENU_KEY, JSON.stringify(menu)], [MENU_UPDATE_URL_KEY, menuUpdateUrl.trim()]]).then(() => Alert.alert('Cardápio salvo', 'O cardápio e o endereço de atualização foram salvos neste aparelho.')).catch(() => Alert.alert('Falha ao salvar', 'Não foi possível salvar o cardápio.'));
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
      if (!response.ok) throw new Error('Resposta inválida');
      const remoteMenu = await response.json() as Product[];
      if (!Array.isArray(remoteMenu) || remoteMenu.some((item) => !item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.category !== 'string' || typeof item.price !== 'number' || !Number.isFinite(item.price) || (item.kind !== undefined && item.kind !== 'pizza') || (item.description !== undefined && typeof item.description !== 'string') || (item.allowsExtras !== undefined && typeof item.allowsExtras !== 'boolean'))) throw new Error('Formato inválido');
      if (isDemoMenu(remoteMenu)) throw new Error('Cardápio online ainda contém exemplos');
      setMenu(remoteMenu);
      setCategory('Todos');
      setMenuUpdateStatus(`Atualizado em ${new Date().toLocaleTimeString('pt-BR')}`);
      await AsyncStorage.multiSet([[MENU_KEY, JSON.stringify(remoteMenu)], [MENU_UPDATE_URL_KEY, url]]);
      if (showFeedback) Alert.alert('Cardápio atualizado', 'Os produtos foram atualizados neste aparelho.');
    } catch {
      setMenuUpdateStatus('Usando cardápio local');
      if (showFeedback) Alert.alert('Atualização indisponível', 'Não foi possível atualizar agora. O cardápio local continua disponível.');
    }
  }

  async function updateMenuFromUrl() {
    const url = menuUpdateUrl.trim();
    if (!url) {
      Alert.alert('Endereço ausente', 'Informe o endereço do cardápio online.');
      return;
    }
    await refreshMenuFromUrl(url, true);
  }

  function savePrinterSettings() {
    AsyncStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(printerSettings)).then(() => {
      Alert.alert('Configuração salva', 'As preferências da impressora foram salvas neste aparelho.');
    }).catch(() => Alert.alert('Falha ao salvar', 'Não foi possível salvar a configuração da impressora.'));
  }

  function showFeedback(title: string, message: string, tone: 'success' | 'error') {
    setFeedback({ title, message, tone });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function printSavedOrder(order: SavedOrder) {
    try {
      await printOrder(order, printerSettings);
      showFeedback('Impressão aberta', 'Confirme o envio na janela de impressão.', 'success');
    } catch (error) {
      showFeedback('Impressão indisponível', error instanceof Error ? error.message : 'Não foi possível iniciar a impressão.', 'error');
    }
  }

  async function testPrinter() {
    await printSavedOrder({ id: 'printer-test', plate: 'TESTE', customer: 'Teste de impressão', items: [{ id: 'printer-test-item', name: 'Comanda de teste', category: 'Teste', quantity: 1, note: '' }], createdAt: new Date().toISOString() });
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
      Alert.alert('Falha ao salvar', 'Não foi possível salvar a comanda. A impressão não foi iniciada.');
    }
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable onPress={chooseLogo} accessibilityRole="button" accessibilityLabel="Escolher logotipo do restaurante" style={({ pressed }) => [styles.logoButton, pressed && styles.pressed]}>
              <Image source={logoUri ? { uri: logoUri } : require('./assets/chef-icon.png')} style={styles.logoImage} />
            </Pressable>
            <View style={styles.headerTitle}>
              <Text style={styles.eyebrow}>COMANDA DIGITAL</Text>
              <Text style={styles.title}>{currentTab.title}</Text>
            </View>
            {isWide && <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>Do pedido à cozinha</Text></View>}
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.contentFrame}>
              {screen === 'home' ? (
                <View>
                  <View style={styles.hero}>
                    <Text style={styles.heroEyebrow}>BOM ATENDIMENTO COMEÇA AQUI</Text>
                    <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>Tudo pronto para o próximo pedido.</Text>
                    <Text style={styles.heroDescription}>Monte a comanda, confira os detalhes e envie para a cozinha.</Text>
                    <Pressable onPress={() => setScreen('order')} accessibilityRole="button" style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
                      <Text style={styles.heroButtonText}>Iniciar pedido</Text><Text style={styles.heroArrow}>→</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.sectionTitle}>Acesso rápido</Text>
                  <View style={styles.mainMenu}>
                    {TABS.filter((tab) => tab.screen !== 'home').map((tab) => (
                      <Pressable key={tab.screen} onPress={() => setScreen(tab.screen)} accessibilityRole="button" style={({ pressed }) => [styles.mainMenuButton, isWide && styles.mainMenuButtonWide, pressed && styles.pressed]}>
                        <View style={styles.menuIconBadge}><Text style={styles.mainMenuIcon}>{tab.icon}</Text></View>
                        <Text style={styles.mainMenuTitle}>{tab.screen === 'printer' ? 'Configurações' : tab.label}</Text>
                        <Text style={styles.mainMenuHint}>{tab.screen === 'history' ? history.length + (history.length === 1 ? ' pedido salvo' : ' pedidos salvos') : tab.hint}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.homeFooter}><Text style={styles.homeFooterText}>Seu cardápio e seu histórico ficam salvos neste aparelho.</Text></View>
                </View>
              ) : screen === 'printer' ? (
                <View style={[styles.columns, isWide && styles.columnsWide]}>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <Text style={styles.panelTitle}>Impressora</Text>
                    <Text style={styles.settingsIntro}>Escolha a conexão e a largura do papel para suas comandas.</Text>
                    <Text style={styles.label}>Método de conexão</Text>
                    <View style={styles.connectionList}>
                      {CONNECTIONS.map((option) => <Pressable key={option.value} onPress={() => updatePrinterSettings({ connection: option.value })} accessibilityRole="radio" accessibilityState={{ checked: option.value === printerSettings.connection }} style={[styles.connectionOption, option.value === printerSettings.connection && styles.selectedConnection]}>
                        <Text style={[styles.connectionText, option.value === printerSettings.connection && styles.selectedConnectionText]}>{option.label}</Text>
                        {option.value === printerSettings.connection && <Text style={styles.selectedConnectionText}>✓</Text>}
                      </Pressable>)}
                    </View>
                    <Text style={styles.fieldLabel}>Nome da impressora</Text>
                    <TextInput value={printerSettings.name} onChangeText={(name) => updatePrinterSettings({ name })} accessibilityLabel="Nome da impressora" placeholder="Opcional" placeholderTextColor={COLORS.placeholder} style={styles.input} />
                    <Text style={styles.fieldLabel}>Endereço ou identificador</Text>
                    <TextInput value={printerSettings.address} onChangeText={(address) => updatePrinterSettings({ address })} accessibilityLabel="Endereço da impressora" placeholder={printerSettings.connection === 'wifi' ? 'Endereço IP da impressora' : 'Endereço, MAC ou identificador'} placeholderTextColor={COLORS.placeholder} style={styles.input} autoCapitalize="none" />
                    <Text style={styles.fieldLabel}>Porta de rede</Text>
                    <TextInput value={printerSettings.port} onChangeText={(port) => updatePrinterSettings({ port })} accessibilityLabel="Porta de rede" placeholder="9100" placeholderTextColor={COLORS.placeholder} style={styles.input} keyboardType="number-pad" />
                    <Text style={styles.fieldLabel}>Largura do papel</Text>
                    <View style={styles.paperOptions}>{(['58', '80'] as const).map((width) => <Pressable key={width} onPress={() => updatePrinterSettings({ paperWidth: width })} accessibilityRole="radio" accessibilityState={{ checked: width === printerSettings.paperWidth }} style={[styles.paperOption, width === printerSettings.paperWidth && styles.selectedConnection]}><Text style={[styles.connectionText, width === printerSettings.paperWidth && styles.selectedConnectionText]}>{width} mm</Text></Pressable>)}</View>
                    <Pressable style={styles.sendButton} onPress={savePrinterSettings}><Text style={styles.sendButtonText}>Salvar configuração</Text></Pressable>
                    <Pressable style={styles.secondaryWideButton} onPress={testPrinter}><Text style={styles.secondaryButtonText}>Testar impressora</Text></Pressable>
                  </View>
                  <View style={[styles.panel, styles.column, isWide && styles.columnWide]}>
                    <Text style={styles.panelTitle}>Cardápio online</Text>
                    <Text style={styles.settingsIntro}>Atualize os produtos a partir do endereço do seu cardápio.</Text>
                    <Text style={styles.fieldLabel}>Endereço do cardápio</Text>
                    <TextInput value={menuUpdateUrl} onChangeText={(url) => { setMenuUpdateUrl(url); setMenuUpdateStatus('Endereço ainda não salvo'); }} accessibilityLabel="Endereço do cardápio online" placeholder="https://seu-servidor.com/menu" placeholderTextColor={COLORS.placeholder} style={styles.input} autoCapitalize="none" keyboardType="url" />
                    <Text style={styles.helperText}>{menuUpdateStatus || 'O endereço salvo será consultado ao abrir o aplicativo.'}</Text>
                    <Pressable style={styles.secondaryWideButton} onPress={updateMenuFromUrl}><Text style={styles.secondaryButtonText}>Atualizar cardápio agora</Text></Pressable>
                  </View>
                </View>
              ) : screen === 'menu' ? (
                <View>
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
                </View>
              ) : screen === 'history' ? (
                <View>
                  <Text style={styles.settingsIntro}>Consulte suas comandas e reimprima quando precisar.</Text>
                  {history.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Seu histórico começa aqui</Text><Text style={styles.emptyText}>As comandas salvas aparecerão nesta tela.</Text></View> : history.map((order) => <View key={order.id} style={styles.historyCard}>
                    <View style={styles.productInfo}><Text style={styles.cardTitle}>Plaquinha {order.plate}</Text><Text style={styles.mutedText}>{order.customer || 'Cliente não informado'}</Text><Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleString('pt-BR')}</Text><Text style={styles.priceText}>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</Text></View>
                    <Pressable style={styles.addButton} onPress={() => printSavedOrder(order)}><Text style={styles.addButtonText}>Reimprimir</Text></Pressable>
                  </View>)}
                </View>
              ) : (
                <View style={[styles.columns, isWide && styles.columnsWide]}>
                  <View style={[styles.column, isWide && styles.columnWide]}>
                    <View style={styles.panel}>
                      <Text style={styles.panelTitle}>Identificação</Text>
                      <Text style={styles.fieldLabel}>Plaquinha</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.plateList}>{PLATES.map((value) => <Pressable key={value} onPress={() => { setPlate(value); setCustomPlate(''); }} accessibilityRole="radio" accessibilityLabel={'Plaquinha ' + value} accessibilityState={{ checked: value === plate && !customPlate }} style={[styles.plate, value === plate && !customPlate && styles.selectedPlate]}><Text style={[styles.plateText, value === plate && !customPlate && styles.selectedPlateText]}>{value}</Text></Pressable>)}</ScrollView>
                      <TextInput value={customPlate} onChangeText={setCustomPlate} accessibilityLabel="Outra plaquinha" placeholder="Outra plaquinha (opcional)" placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} />
                      <TextInput value={customer} onChangeText={setCustomer} accessibilityLabel="Nome do cliente" placeholder="Nome do cliente (opcional)" placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} />
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
                      <TextInput value={item.note} onChangeText={(note) => updateNote(item.id, note)} accessibilityLabel={'Observação de ' + item.name} placeholder="Observação do item" placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.spacedInput]} multiline />
                      <View style={styles.quickNotes}>{QUICK_NOTES.map((note) => <Pressable key={note} onPress={() => updateNote(item.id, item.note ? item.note + ', ' + note : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{note}</Text></Pressable>)}</View>
                    </View>)}
                    <Pressable style={styles.sendButton} onPress={sendOrder}><Text style={styles.sendButtonText}>Enviar comanda</Text><Text style={styles.sendButtonHint}>Salvar e abrir a impressão</Text></Pressable>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {feedback && <View accessibilityLiveRegion="polite" style={[styles.feedbackToast, feedback.tone === 'error' ? styles.feedbackError : styles.feedbackSuccess]}><Text style={styles.feedbackTitle}>{feedback.title}</Text><Text style={styles.feedbackMessage}>{feedback.message}</Text></View>}

          <View style={styles.navBackground}><View style={styles.bottomNav}>
            {TABS.map((tab) => <Pressable key={tab.screen} accessibilityRole="tab" accessibilityLabel={tab.title} accessibilityState={{ selected: screen === tab.screen }} onPress={() => setScreen(tab.screen)} style={({ pressed }) => [styles.bottomNavButton, screen === tab.screen && styles.activeBottomNavButton, pressed && styles.pressed]}>
              <Text style={[styles.bottomNavIcon, screen === tab.screen && styles.activeBottomNavText]}>{tab.icon}</Text>
              <Text style={[styles.bottomNavText, screen === tab.screen && styles.activeBottomNavText]}>{tab.label}</Text>
            </Pressable>)}
          </View></View>
        </KeyboardAvoidingView>

        <Modal visible={selectedProduct !== null} transparent animationType={isWide ? 'fade' : 'slide'} onRequestClose={() => setSelectedProduct(null)}>
          <SafeAreaProvider><KeyboardAvoidingView style={[styles.modalBackdrop, isWide && styles.modalBackdropWide]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <SafeAreaView edges={['bottom']} style={[styles.productModal, isWide && styles.productModalWide]}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
                <Text style={styles.modalEyebrow}>ADICIONAR AO PEDIDO</Text>
                <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                <Text style={styles.settingsIntro}>{selectedProduct?.description || 'Como você quer este produto?'}</Text>
                {selectedProduct?.kind === 'pizza' && <>
                  {selectedProduct.allowsExtras === false ? <Text style={styles.helperText}>Pizza promocional: somente inteira e sem adicionais.</Text> : <>
                    <Text style={styles.fieldLabel}>1. Inteira ou dois sabores?</Text>
                    <View style={styles.quickNotes}>{([{ value: 'whole', label: 'Inteira' }, { value: 'halves', label: 'Dois sabores' }] as const).map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: pizzaMode === option.value }} onPress={() => { if (pizzaMode === option.value) return; setPizzaMode(option.value); setSecondFlavor(null); setExtras([]); setExtraPlacement('whole'); }} style={[styles.noteChip, pizzaMode === option.value && styles.selectedCategory]}><Text style={[styles.noteChipText, pizzaMode === option.value && styles.selectedCategoryText]}>{option.label}</Text></Pressable>)}</View>
                  </>}
                  {pizzaMode === 'halves' && <>
                    <Text style={styles.fieldLabel}>2. Qual é o outro sabor?</Text>
                    <Text style={styles.helperText}>1ª metade: {selectedProduct.name}</Text>
                    <View style={styles.quickNotes}>{pizzaMenu.filter((pizza) => pizza.id !== selectedProduct.id && pizza.allowsExtras !== false).map((pizza) => <Pressable key={pizza.id} accessibilityRole="radio" accessibilityState={{ checked: secondFlavor?.id === pizza.id }} onPress={() => setSecondFlavor(pizza)} style={[styles.noteChip, secondFlavor?.id === pizza.id && styles.selectedCategory]}><Text style={[styles.noteChipText, secondFlavor?.id === pizza.id && styles.selectedCategoryText]}>{pizza.name}</Text></Pressable>)}</View>
                  </>}
                  {selectedProduct.allowsExtras !== false && pizzaMode && (pizzaMode === 'whole' || secondFlavor) && <>
                    <Text style={styles.fieldLabel}>Extras (opcional)</Text>
                    {pizzaMode === 'halves' && <View style={styles.quickNotes}>{([{ value: 'whole', label: 'Pizza inteira' }, { value: 'first', label: '1ª metade: ' + selectedProduct.name }, { value: 'second', label: '2ª metade: ' + secondFlavor?.name }] as const).map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: extraPlacement === option.value }} onPress={() => setExtraPlacement(option.value)} style={[styles.noteChip, extraPlacement === option.value && styles.selectedCategory]}><Text style={[styles.noteChipText, extraPlacement === option.value && styles.selectedCategoryText]}>{option.label}</Text></Pressable>)}</View>}
                    <View style={styles.quickNotes}>{TOPPINGS.map((name) => {
                      const checked = extras.some((extra) => extra.name === name && extra.placement === extraPlacement);
                      return <Pressable key={name} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setExtras((current) => checked ? current.filter((extra) => !(extra.name === name && extra.placement === extraPlacement)) : [...current.filter((extra) => extra.name !== name || (extra.placement !== 'whole' && extraPlacement !== 'whole')), { name, placement: extraPlacement }])} style={[styles.noteChip, checked && styles.selectedCategory]}><Text style={[styles.noteChipText, checked && styles.selectedCategoryText]}>{checked ? '✓ ' : '+ '}{name}</Text></Pressable>;
                    })}</View>
                    {extras.length > 0 && <Text style={styles.helperText}>{extras.map((extra) => '+ ' + describeExtra(extra, [selectedProduct.name, secondFlavor?.name || ''])).join('\n')}</Text>}
                  </>}
                </>}
                <Text style={styles.fieldLabel}>Observação (opcional)</Text>
                <TextInput value={productNote} onChangeText={setProductNote} accessibilityLabel="Observação do produto" placeholder="Ex.: bem passado, sem molho..." placeholderTextColor={COLORS.placeholder} style={[styles.input, styles.modalInput]} multiline />
                <View style={styles.quickNotes}>{['Sem cebola', 'Sem pimenta', 'Bem passado'].map((note) => <Pressable key={note} onPress={() => setProductNote((current) => current ? current + ', ' + note : note)} style={styles.noteChip}><Text style={styles.noteChipText}>{note}</Text></Pressable>)}</View>
                <Pressable disabled={selectedProduct?.kind === 'pizza' && (!pizzaMode || (pizzaMode === 'halves' && !secondFlavor))} style={[styles.sendButton, selectedProduct?.kind === 'pizza' && (!pizzaMode || (pizzaMode === 'halves' && !secondFlavor)) && styles.pressed]} onPress={addSelectedProduct}><Text style={styles.sendButtonText}>Adicionar ao pedido</Text></Pressable>
                <Pressable style={styles.cancelButton} onPress={() => setSelectedProduct(null)}><Text style={styles.cancelButtonText}>Cancelar</Text></Pressable>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView></SafeAreaProvider>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  pressed: { opacity: 0.7 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, width: '100%', maxWidth: 1160, alignSelf: 'center' },
  logoButton: { borderRadius: 16, overflow: 'hidden', width: 56, height: 56 },
  logoImage: { width: '100%', height: '100%' },
  headerTitle: { flex: 1, minWidth: 0 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 4 },
  title: { color: COLORS.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.6 },
  headerBadge: { backgroundColor: COLORS.greenSoft, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  headerBadgeText: { color: COLORS.green, fontSize: 12, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, alignItems: 'center' },
  contentFrame: { width: '100%', maxWidth: 1120 },
  hero: { backgroundColor: COLORS.green, borderRadius: 24, padding: 24 },
  heroEyebrow: { color: '#BDD5CA', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 14 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 36, fontWeight: '800', maxWidth: 460, letterSpacing: -0.8 },
  heroTitleWide: { fontSize: 38, lineHeight: 45, maxWidth: 620 },
  heroDescription: { color: '#DFEBE4', fontSize: 14, lineHeight: 22, marginTop: 12, maxWidth: 440 },
  heroButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 15, marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 400 },
  heroButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  heroArrow: { color: '#FFFFFF', fontSize: 24 },
  sectionTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '800', marginTop: 26, marginBottom: 14 },
  mainMenu: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mainMenuButton: { flexBasis: '45%', flexGrow: 1, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, padding: 16 },
  mainMenuButtonWide: { flexBasis: '22%' },
  menuIconBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  mainMenuIcon: { color: COLORS.primary, fontSize: 25, fontWeight: '600' },
  mainMenuTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  mainMenuHint: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  homeFooter: { paddingVertical: 22, paddingHorizontal: 12 },
  homeFooterText: { color: COLORS.muted, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  columns: { gap: 20 },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { minWidth: 0 },
  columnWide: { flex: 1 },
  panel: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 18 },
  panelTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  settingsIntro: { color: COLORS.muted, fontSize: 14, lineHeight: 22, marginTop: 8, marginBottom: 20 },
  label: { color: COLORS.ink, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  fieldLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: '#F8FAF8', borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, color: COLORS.ink, fontSize: 15, minHeight: 48, paddingHorizontal: 12, paddingVertical: 12 },
  spacedInput: { marginTop: 12 },
  helperText: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 10 },
  connectionList: { gap: 8 },
  connectionOption: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14 },
  selectedConnection: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  connectionText: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  selectedConnectionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  paperOptions: { flexDirection: 'row', gap: 10 },
  paperOption: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  menuEditCard: { width: '100%', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16 },
  menuEditCardWide: { width: '48%', flexGrow: 1, flexBasis: '46%' },
  menuEditRow: { flexDirection: 'row', gap: 12 },
  menuEditField: { flex: 1, minWidth: 0 },
  priceField: { flex: 0.65, minWidth: 82 },
  menuEditActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 16 },
  removeButton: { backgroundColor: '#FCECE8', borderRadius: 10, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  removeButtonText: { color: '#A33024', fontSize: 13, fontWeight: '700' },
  sendButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, minHeight: 52, marginTop: 18, padding: 16 },
  sendButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sendButtonHint: { color: '#FFE8DE', fontSize: 12, marginTop: 5, textAlign: 'center' },
  secondaryWideButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.greenSoft, borderColor: '#D2E3D8', borderWidth: 1, borderRadius: 14, minHeight: 50, marginTop: 12, padding: 14 },
  secondaryButtonText: { color: COLORS.green, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  plateList: { gap: 8, paddingBottom: 4 },
  plate: { alignItems: 'center', justifyContent: 'center', borderColor: COLORS.border, borderWidth: 1, borderRadius: 12, minHeight: 46, minWidth: 46, padding: 10 },
  selectedPlate: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  plateText: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  selectedPlateText: { color: '#FFFFFF' },
  categoryList: { gap: 8, paddingBottom: 14 },
  category: { borderColor: COLORS.border, borderWidth: 1, borderRadius: 22, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.surface },
  selectedCategory: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  categoryText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  selectedCategoryText: { color: '#FFFFFF' },
  productCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 16, marginBottom: 10, padding: 16 },
  productInfo: { flex: 1, minWidth: 0 },
  cardTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '700', lineHeight: 23 },
  mutedText: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  priceText: { color: COLORS.green, fontSize: 15, fontWeight: '800', marginTop: 8 },
  productArrow: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  productArrowText: { color: COLORS.primary, fontSize: 25, fontWeight: '700' },
  orderHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
  itemCount: { backgroundColor: COLORS.greenSoft, color: COLORS.green, borderRadius: 12, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  emptyCard: { backgroundColor: '#F5F8F5', borderRadius: 14, padding: 22 },
  emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: COLORS.muted, fontSize: 14, lineHeight: 22 },
  orderCard: { borderBottomColor: COLORS.border, borderBottomWidth: 1, paddingBottom: 20, marginBottom: 18 },
  orderLine: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quantityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.greenSoft },
  quantityText: { color: COLORS.green, fontSize: 22, fontWeight: '700' },
  quantity: { color: COLORS.ink, fontSize: 16, fontWeight: '800', minWidth: 22, textAlign: 'center' },
  quickNotes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  noteChip: { backgroundColor: COLORS.greenSoft, borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  noteChipText: { color: COLORS.green, fontSize: 12, fontWeight: '600' },
  totalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 4 },
  totalLabel: { color: COLORS.muted, fontSize: 14 },
  totalText: { color: COLORS.ink, fontSize: 22, fontWeight: '800' },
  historyCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, marginBottom: 12, padding: 18 },
  addButton: { backgroundColor: COLORS.greenSoft, borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  addButtonText: { color: COLORS.green, fontSize: 13, fontWeight: '700' },
  navBackground: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1 },
  bottomNav: { flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 8, width: '100%', maxWidth: 760, alignSelf: 'center' },
  bottomNavButton: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 58, borderRadius: 14, paddingVertical: 7, paddingHorizontal: 2 },
  activeBottomNavButton: { backgroundColor: COLORS.primarySoft },
  bottomNavIcon: { color: COLORS.muted, fontSize: 23, fontWeight: '600', marginBottom: 3 },
  bottomNavText: { color: COLORS.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  activeBottomNavText: { color: COLORS.primary },
  feedbackToast: { marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  feedbackSuccess: { backgroundColor: '#E6F2E9', borderColor: '#9CBDA8' },
  feedbackError: { backgroundColor: '#FCECE8', borderColor: '#DFA699' },
  feedbackTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  feedbackMessage: { color: COLORS.ink, fontSize: 13, lineHeight: 19, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(18,35,29,0.55)', justifyContent: 'flex-end' },
  modalBackdropWide: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  productModal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%' },
  productModalWide: { maxWidth: 560, borderRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 24 },
  modalEyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  modalTitle: { color: COLORS.ink, fontSize: 24, fontWeight: '800', lineHeight: 31 },
  modalInput: { minHeight: 100, textAlignVertical: 'top' },
  cancelButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 8 },
  cancelButtonText: { color: COLORS.muted, fontSize: 14, fontWeight: '700' },
});
