import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ADMIN_CREDENTIAL_ENDPOINT } from '../config/auth';
import { bindStoreId, LEGACY_STORE_ID, loadStoreId, validStoreId } from '../config/store';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { styles, COLORS } from './theme';

type Language = 'pt' | 'en' | 'es';
const copy = {
  pt: { title: 'Vincular este tablet à loja', hint: 'Informe o código da loja. Esta escolha mantém pedidos, usuários e cardápio separados dos demais estabelecimentos.', label: 'Código da loja', button: 'Vincular loja', retry: 'Tentar novamente', invalid: 'Informe um código de loja válido.', missing: 'Loja não encontrada ou inativa.', network: 'Conecte à internet para vincular este tablet pela primeira vez.', storage: 'Não foi possível ler o vínculo da loja neste aparelho.' },
  en: { title: 'Link this tablet to a store', hint: 'Enter the store code. This keeps orders, users and menu separate from other locations.', label: 'Store code', button: 'Link store', retry: 'Try again', invalid: 'Enter a valid store code.', missing: 'Store not found or inactive.', network: 'Connect to the internet to link this tablet for the first time.', storage: 'Could not read this tablet’s store binding.' },
  es: { title: 'Vincular esta tableta a una tienda', hint: 'Ingrese el código de la tienda. Así se separan los pedidos, usuarios y menú de otros locales.', label: 'Código de la tienda', button: 'Vincular tienda', retry: 'Intentar de nuevo', invalid: 'Ingrese un código de tienda válido.', missing: 'Tienda no encontrada o inactiva.', network: 'Conéctese a internet para vincular esta tableta por primera vez.', storage: 'No se pudo leer la vinculación de esta tableta.' },
};
const STORE_LOOKUP_ENDPOINT = ADMIN_CREDENTIAL_ENDPOINT.replace('/auth/admin', '/cloud/store');

export function StoreGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'loading' | 'select' | 'ready' | 'error'>('loading');
  const [language, setLanguage] = useState<Language>('pt');
  const [storeId, setStoreId] = useState(LEGACY_STORE_ID);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
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

  async function bind() {
    if (busy) return;
    const id = storeId.trim().toLowerCase();
    if (!validStoreId(id)) { setMessage(words.invalid); return; }
    setBusy(true); setMessage('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(STORE_LOOKUP_ENDPOINT + '?storeId=' + encodeURIComponent(id), { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) { setMessage(response.status === 404 ? words.missing : words.network); return; }
      const data = await response.json();
      if (data?.storeId !== id) { setMessage(words.missing); return; }
      try { await bindStoreId(id); setMode('ready'); }
      catch { setMessage(words.storage); }
    } catch { setMessage(words.network); }
    finally { clearTimeout(timeout); setBusy(false); }
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
            <Text style={styles.fieldLabel}>{words.label}</Text>
            <TextInput value={storeId} onChangeText={setStoreId} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={40} accessibilityLabel={words.label} style={styles.input} />
            {!!message && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{message}</Text>}
            <Pressable disabled={busy} onPress={() => void bind()} style={[styles.sendButton, busy && styles.pressed]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>{words.button}</Text>}</Pressable>
          </>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView></SafeAreaProvider>;
}
