import { useLanguage } from '../i18n/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { printOrder, printPrinterTest, type PrinterSettings } from '../../printerService';
import { DEFAULT_MENU, isDemoMenu, type Product } from '../../menuData';
import { createOrderItem, type OrderItem, type PizzaMode, type Extra } from '../../orderItems';
import { isValidMenu } from '../../shared/menu-validation.mjs';
import { DEFAULT_PRINTER_SETTINGS } from '../ui/theme';
import { MENU_ENDPOINT } from '../config/menu';
import { ORDER_SETTINGS_KEY, DEFAULT_ORDER_SETTINGS, parseOrderSettings, customerValidationMessage } from '../services/orderSettings';
import { applyMenuUpdate } from '../services/menuUpdate';
import { createOrderSubmitter } from '../services/orderSubmission';
import { persistSettings, normalizeMenuUrl, PRINTER_SETTINGS_KEY } from '../services/settings';

type SavedOrder = { id: string; plate: string; customer: string; items: OrderItem[]; createdAt: string };
const STORAGE_KEY = '@comandadigitalprint/orders';
const MENU_KEY = '@comandadigitalprint/menu';
const LOGO_KEY = '@comandadigitalprint/restaurant-logo';

function useAppState() {
  const { t, language } = useLanguage();
  const [category, setCategory] = useState('Todos');
  const [plate, setPlate] = useState('1');
  const [customPlate, setCustomPlate] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [orderSettings, setOrderSettings] = useState(DEFAULT_ORDER_SETTINGS);
  const [savingOrderSettings, setSavingOrderSettings] = useState(false);
  const orderSettingsLock = useRef(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [history, setHistory] = useState<SavedOrder[]>([]);
  const [menu, setMenu] = useState<Product[]>(DEFAULT_MENU);
  const [updatingMenu, setUpdatingMenu] = useState(false);
  const [menuUpdateStatus, setMenuUpdateStatus] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
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
  const [isReady, setIsReady] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitter] = useState(createOrderSubmitter<SavedOrder>);
  const menuRef = useRef(menu);
  const menuUpdateLock = useRef(false);
  useEffect(() => { menuRef.current = menu; }, [menu]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(PRINTER_SETTINGS_KEY), AsyncStorage.getItem(MENU_KEY), AsyncStorage.getItem(LOGO_KEY), AsyncStorage.getItem(ORDER_SETTINGS_KEY)]).then(([storedOrders, storedPrinter, storedMenu, storedLogo, storedOrderSettings]) => {
      setOrderSettings(parseOrderSettings(storedOrderSettings));
      if (storedOrders) {
        const saved = JSON.parse(storedOrders) as SavedOrder[];
        if (!Array.isArray(saved)) throw new Error('Histórico inválido');
        setHistory(saved);
      }
      if (storedPrinter) setPrinterSettings({ ...DEFAULT_PRINTER_SETTINGS, ...JSON.parse(storedPrinter) as Partial<PrinterSettings> });
      if (storedMenu) {
        const saved = JSON.parse(storedMenu) as Product[];
        if (!isValidMenu(saved)) throw new Error('Cardápio inválido');
        menuRef.current = isDemoMenu(saved) ? DEFAULT_MENU : saved;
        setMenu(menuRef.current);
      }
      if (storedLogo) setLogoUri(storedLogo);
      setIsReady(true);
      void updateMenu(false);
    }).catch(() => Alert.alert(t('Dados indisponíveis'), t('Não foi possível carregar os dados salvos. Feche e abra o aplicativo para tentar novamente. O envio ficará bloqueado para proteger o histórico.')));
  // Hydrate once; changing the display language must not overwrite an active order.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMenu = useMemo(() => category === 'Todos' ? menu : menu.filter((item) => item.category === category), [category, menu]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(menu.map((item) => item.category).filter(Boolean)))], [menu]);
  const pizzaMenu = useMemo(() => menu.filter((item) => item.kind === 'pizza'), [menu]);

  function openProduct(product: Product) {
    if (submitter.busy) return;
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
      Alert.alert(t('Confira a pizza'), t(error instanceof Error ? error.message : 'Confira os sabores.'));
    }
  }

  function changeQuantity(id: string, delta: number) {
    if (submitter.busy) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }

  function updateNote(id: string, note: string) {
    if (submitter.busy) return;
    setItems((current) => current.map((item) => item.id === id ? { ...item, note } : item));
  }

  function updatePrinterSettings(change: Partial<PrinterSettings>) {
    setPrinterSettings((current) => ({ ...current, ...change }));
  }

  function changeCustomer(value: string) {
    setCustomer(value);
    if (customerError) setCustomerError(customerValidationMessage(value, orderSettings.requireCustomer));
  }

  async function setRequireCustomer(required: boolean) {
    if (orderSettingsLock.current) return;
    orderSettingsLock.current = true;
    setSavingOrderSettings(true);
    try {
      const next = { requireCustomer: required };
      await AsyncStorage.setItem(ORDER_SETTINGS_KEY, JSON.stringify(next));
      setOrderSettings(next);
      setCustomerError('');
    } catch {
      Alert.alert(t('Falha ao salvar'), t('Não foi possível salvar a regra do cliente. Tente novamente.'));
    } finally {
      orderSettingsLock.current = false;
      setSavingOrderSettings(false);
    }
  }

  async function chooseLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('Permissão necessária'), t('Permita o acesso às fotos para escolher o logotipo do restaurante.'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setLogoUri(uri);
      await AsyncStorage.setItem(LOGO_KEY, uri);
    }
  }

  async function saveMenu() {
    try {
      if (!isValidMenu(menu)) throw new Error('Confira nomes, categorias e identificadores do cardápio.');
      await AsyncStorage.setItem(MENU_KEY, JSON.stringify(menu));
      Alert.alert(t('Cardápio salvo'), t('Os produtos foram salvos neste aparelho.'));
    } catch (error) {
      Alert.alert(t('Falha ao salvar'), t(error instanceof Error ? error.message : 'Não foi possível salvar o cardápio.'));
    }
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

  async function updateMenu(manual = false) {
    if (menuUpdateLock.current) return;
    menuUpdateLock.current = true;
    setUpdatingMenu(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const url = normalizeMenuUrl(MENU_ENDPOINT);
      if (!url) throw new Error('Serviço ainda não publicado');
      setMenuUpdateStatus('Verificando atualizações…');
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error('Resposta inválida');
      const remoteMenu: unknown = await response.json();
      const changed = await applyMenuUpdate(menuRef.current, remoteMenu, (next) => AsyncStorage.setItem(MENU_KEY, JSON.stringify(next)));
      if (changed) {
        menuRef.current = remoteMenu as Product[];
        setMenu(menuRef.current);
        setCategory('Todos');
        setMenuUpdateStatus('Cardápio atualizado com sucesso');
        Alert.alert(t('Cardápio atualizado'), t('Cardápio atualizado com sucesso.'));
      } else {
        setMenuUpdateStatus('Seu cardápio já está atualizado');
        if (manual) Alert.alert(t('Cardápio em dia'), t('Seu cardápio já está atualizado.'));
      }
    } catch {
      setMenuUpdateStatus('Cardápio salvo disponível');
      if (manual) Alert.alert(t('Atualização indisponível'), t('Não foi possível verificar atualizações agora. O cardápio salvo continua disponível.'));
    } finally {
      clearTimeout(timeout);
      menuUpdateLock.current = false;
      setUpdatingMenu(false);
    }
  }

  async function savePrinterSettings() {
    try {
      await persistSettings(AsyncStorage, printerSettings);
      Alert.alert(t('Configuração salva'), t('As preferências da impressora foram salvas neste aparelho.'));
    } catch (error) {
      Alert.alert(t('Falha ao salvar'), t(error instanceof Error ? error.message : 'Não foi possível salvar a configuração.'));
    }
  }

  function showFeedback(title: string, message: string, tone: 'success' | 'error') {
    setFeedback({ title, message, tone });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function printSavedOrder(order: SavedOrder) {
    try {
      await printOrder(order, printerSettings, language);
      showFeedback('Impressão aberta', 'Confirme o envio na janela de impressão.', 'success');
    } catch (error) {
      showFeedback('Impressão indisponível', error instanceof Error ? error.message : 'Não foi possível iniciar a impressão.', 'error');
    }
  }

  async function testPrinter() {
    try {
      await printPrinterTest(printerSettings, language);
      showFeedback('Teste de impressão aberto', 'Selecione a impressora e confirme o envio na janela de impressão.', 'success');
    } catch (error) {
      showFeedback('Teste não iniciado', error instanceof Error ? error.message : 'Não foi possível iniciar o teste de impressão.', 'error');
    }
  }

  async function sendOrder() {
    if (!isReady || submitter.busy || orderSettingsLock.current) return;
    if (items.length === 0) {
      Alert.alert(t('Comanda vazia'), t('Adicione pelo menos um item antes de enviar.'));
      return;
    }
    const validation = customerValidationMessage(customer, orderSettings.requireCustomer);
    setCustomerError(validation);
    if (validation) {
      Alert.alert(t('Cliente obrigatório'), t(validation));
      return;
    }
    const order: SavedOrder = { id: `${Date.now()}`, plate: customPlate.trim() || plate, customer: customer.trim(), items, createdAt: new Date().toISOString() };
    try {
      await submitter.submit(order, history, {
        persist: (next) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)),
        onSaved: (next) => { setHistory(next); setItems([]); setCustomer(''); setCustomPlate(''); },
        print: printSavedOrder,
        onBusy: setSending,
      });
    } catch {
      Alert.alert(t('Falha ao salvar'), t('Seu pedido foi mantido. Tente enviar novamente. A impressão não foi iniciada.'));
    }
  }


  return { orderSettings, setRequireCustomer, savingOrderSettings, customerError, changeCustomer, category, setCategory, plate, setPlate, customPlate, setCustomPlate, customer, setCustomer, items, setItems, history, setHistory, menu, setMenu, updatingMenu, menuUpdateStatus, setMenuUpdateStatus, logoUri, setLogoUri, selectedProduct, setSelectedProduct, productNote, setProductNote, pizzaMode, setPizzaMode, secondFlavor, setSecondFlavor, extras, setExtras, extraPlacement, setExtraPlacement, printerSettings, setPrinterSettings, feedback, setFeedback, isReady, sending, isWide, filteredMenu, categories, pizzaMenu, openProduct, addSelectedProduct, changeQuantity, updateNote, updatePrinterSettings, chooseLogo, saveMenu, addMenuProduct, updateMenuProduct, removeMenuProduct, savePrinterSettings, updateMenu, showFeedback, printSavedOrder, testPrinter, sendOrder };
}
const AppContext = createContext<ReturnType<typeof useAppState> | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}
export function useApp() {
  const state = useContext(AppContext);
  if (!state) throw new Error('AppProvider ausente');
  return state;
}
