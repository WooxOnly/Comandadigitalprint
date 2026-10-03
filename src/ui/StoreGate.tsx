import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';
import { bindStoreId, loadStoreId, validStoreId } from '../config/store';
import { appStorage } from '../services/cloudStorage';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { styles, COLORS } from './theme';

type Language = 'pt' | 'en' | 'es';
type StoreOption = { id: string; name: string; code: number };
const copy = {
  pt: { title: 'Vincular este tablet à loja', hint: 'Entre com a conta do painel administrativo para escolher a loja. Isso é necessário apenas no primeiro acesso.', username: 'Usuário ou e-mail do painel', password: 'Senha do painel', enter: 'Ver lojas', choose: 'Escolha a loja deste tablet', bind: 'Vincular tablet', retry: 'Tentar novamente', required: 'Informe o usuário e a senha do painel.', select: 'Escolha uma loja antes de vincular.', invalid: 'Usuário ou senha incorretos.', blocked: 'Muitas tentativas. Aguarde 15 minutos.', empty: 'Nenhuma loja ativa foi encontrada.', network: 'Conecte à internet para vincular este tablet pela primeira vez.', storage: 'Não foi possível ler ou salvar o vínculo da loja neste aparelho.' },
  en: { title: 'Link this tablet to a store', hint: 'Sign in with the admin portal account to choose a store. This is only needed the first time.', username: 'Portal username or email', password: 'Portal password', enter: 'View stores', choose: 'Choose this tablet’s store', bind: 'Link tablet', retry: 'Try again', required: 'Enter the portal username and password.', select: 'Choose a store before linking.', invalid: 'Incorrect username or password.', blocked: 'Too many attempts. Wait 15 minutes.', empty: 'No active stores were found.', network: 'Connect to the internet to link this tablet for the first time.', storage: 'Could not read or save this tablet’s store binding.' },
  es: { title: 'Vincular esta tableta a una tienda', hint: 'Ingrese con la cuenta del portal administrativo para elegir una tienda. Solo se necesita la primera vez.', username: 'Usuario o correo del portal', password: 'Contraseña del portal', enter: 'Ver tiendas', choose: 'Elija la tienda de esta tableta', bind: 'Vincular tableta', retry: 'Intentar de nuevo', required: 'Ingrese el usuario y la contraseña del portal.', select: 'Elija una tienda antes de vincular.', invalid: 'Usuario o contraseña incorrectos.', blocked: 'Demasiados intentos. Espere 15 minutos.', empty: 'No se encontraron tiendas activas.', network: 'Conéctese a internet para vincular esta tableta por primera vez.', storage: 'No se pudo leer o guardar la vinculación de esta tableta.' },
};
const PROVISION_ENDPOINT = ADMIN_CREDENTIAL_ENDPOINT.replace('/auth/admin', '/cloud/provision');

export function StoreGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'loading' | 'select' | 'ready' | 'error'>('loading');
  const [language, setLanguage] = useState<Language>('pt');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [stores, setStores] = useState<StoreOption[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const requestInFlight = useRef(false);
  const words = copy[language];

  useEffect(() => {
    let mounted = true;
    void loadStoreId().then((id) => { if (mounted) setMode(id ? 'ready' : 'select'); }, () => { if (mounted) setMode('error'); });
    return () => { mounted = false; };
  }, []);

  function retry() {
    setMode('loading');
    void loadStoreId().then((id) => setMode(id ? 'ready' : 'select'), () => setMode('error'));
  }

  async function authorize() {
    if (requestInFlight.current) return;
    if (!username.trim() || !password) { setMessage(words.required); return; }
    requestInFlight.current = true;
    setBusy(true);
    setMessage('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(PROVISION_ENDPOINT, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
      if (!response.ok) { setMessage(response.status === 401 ? words.invalid : response.status === 429 ? words.blocked : words.network); return; }
      const data = await response.json();
      if (!Array.isArray(data?.stores)) { setMessage(words.network); return; }
      const options = data.stores.filter((store: StoreOption) => store && typeof store.id === 'string' && validStoreId(store.id) && typeof store.name === 'string' && Number.isSafeInteger(store.code) && store.code > 0);
      if (!options.length) { setMessage(words.empty); return; }
      setPassword('');
      setSelectedId('');
      setStores(options);
      Keyboard.dismiss();
    } catch { setMessage(words.network); }
    finally { clearTimeout(timeout); setBusy(false); requestInFlight.current = false; }
  }

  async function bind() {
    if (requestInFlight.current) return;
    const selected = stores?.find((store) => store.id === selectedId);
    if (!selected) { setMessage(words.select); return; }
    requestInFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      await bindStoreId(selected.id);
      await appStorage.setItem('@comandadigitalprint/language', language);
      setMode('ready');
    }
    catch { setMessage(words.storage); }
    finally { setBusy(false); requestInFlight.current = false; }
  }

  if (mode === 'ready') return children;
  return <SafeAreaProvider><SafeAreaView style={styles.container}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={[styles.panel, { width: '100%', maxWidth: 460 }]}>
          <Image source={require('../../assets/chef-icon.png')} style={{ width: 64, height: 64, alignSelf: 'center', borderRadius: 16, marginBottom: 12 }} />
          <Text style={[styles.eyebrow, { textAlign: 'center', marginBottom: 18 }]}>BistroHub</Text>
          {mode === 'loading' ? <ActivityIndicator color={COLORS.green} /> : mode === 'error' ? <>
            <Text style={styles.errorText}>{words.storage}</Text>
            <Pressable onPress={retry} style={styles.sendButton}><Text style={styles.sendButtonText}>{words.retry}</Text></Pressable>
          </> : <>
            <Text style={styles.panelTitle}>{words.title}</Text>
            <Text style={styles.settingsIntro}>{words.hint}</Text>
            <View style={styles.quickNotes}>{(['pt', 'en', 'es'] as const).map((value) => <Pressable key={value} onPress={() => { setLanguage(value); setMessage(''); }} accessibilityRole="radio" accessibilityState={{ checked: language === value }} style={[styles.noteChip, language === value && styles.selectedCategory]}><Text style={[styles.noteChipText, language === value && styles.selectedCategoryText]}>{value === 'pt' ? 'Português' : value === 'en' ? 'English' : 'Español'}</Text></Pressable>)}</View>
            {stores ? <>
              <Text style={styles.fieldLabel}>{words.choose}</Text>
              {stores.map((store) => <Pressable key={store.id} onPress={() => { setSelectedId(store.id); setMessage(''); }} accessibilityRole="radio" accessibilityState={{ checked: selectedId === store.id }} style={[styles.noteChip, { marginBottom: 8, alignSelf: 'stretch' }, selectedId === store.id && styles.selectedCategory]}><Text style={[styles.noteChipText, selectedId === store.id && styles.selectedCategoryText]}>{String(store.code).padStart(3, '0')} · {store.name}</Text></Pressable>)}
            </> : <>
              <Text style={styles.fieldLabel}>{words.username}</Text>
              <TextInput value={username} onChangeText={setUsername} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={120} accessibilityLabel={words.username} style={styles.input} />
              <Text style={styles.fieldLabel}>{words.password}</Text>
              <TextInput value={password} onChangeText={setPassword} editable={!busy} autoCapitalize="none" autoCorrect={false} secureTextEntry maxLength={256} accessibilityLabel={words.password} style={styles.input} onSubmitEditing={() => void authorize()} />
            </>}
            {!!message && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{message}</Text>}
            <Pressable disabled={busy} onPress={() => void (stores ? bind() : authorize())} style={[styles.sendButton, busy && styles.pressed]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>{stores ? words.bind : words.enter}</Text>}</Pressable>
          </>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView></SafeAreaProvider>;
}
