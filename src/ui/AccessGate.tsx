import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, AppState, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { styles } from './theme';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { useStoreName } from './useStoreName';

export function PasswordField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} style={styles.input} /></>;
}
function AccessForm({ settings = false, onUnlock }: { settings?: boolean; onUnlock?: () => void }) {
  const { t } = useLanguage();
  const auth = useAuth();
  const storeName = useStoreName();
  const [username, setUsername] = useState('admin');
  const [showUsers, setShowUsers] = useState(false);
  const [password, setPassword] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const offline = offlineMode && !settings && !auth.exists;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const active = useRef(true);
  const loginUsers = auth.ready ? auth.service.loginUsers() : ['admin'];
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (settings) { await auth.service.verify('settings', password); if (active.current) onUnlock?.(); else auth.service.lockSettings(); }
      else if (offline) await auth.recoverOffline(recoveryCode, password, confirmation);
      else await auth.login(username, password);
    } catch (e) { if (active.current) { setError((e as Error).message); setPassword(''); } }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
      <View style={[styles.panel, { width: '100%', maxWidth: 440, alignSelf: 'center' }]}>
        <Image source={require('../../assets/chef-icon.png')} style={{ width: 64, height: 64, alignSelf: 'center', marginBottom: 16, borderRadius: 16 }} />
        <Text style={[styles.eyebrow, { textAlign: 'center', marginBottom: 16 }]}>BistroHub</Text>
        {!settings && <Text style={[styles.mutedText, { textAlign: 'center', marginBottom: 16 }]}>{t('Loja')}: {storeName}</Text>}
        <Text style={styles.panelTitle}>{t(settings ? 'Acesso protegido' : 'Entrar')}</Text>
        {!auth.ready ? <><Text style={styles.errorText}>{t(auth.error || 'Carregando dados salvos…')}</Text>{auth.error && <Pressable style={styles.secondaryWideButton} onPress={auth.load}><Text style={styles.secondaryButtonText}>{t('Tente novamente')}</Text></Pressable>}</> : <>
          {settings ? <Text style={styles.settingsIntro}>{t('Digite a senha de Configurações para continuar.')}</Text> : <>
            <Text style={styles.fieldLabel}>{t('Usuário')}</Text>
            <View style={styles.userInputRow}>
              <TextInput style={[styles.input, styles.userInput]} accessibilityLabel={t('Usuário')} value={username} onChangeText={(value) => { setUsername(value); setShowUsers(false); }} editable={!offline} autoCapitalize="none" autoCorrect={false} maxLength={24} />
              {!offline && loginUsers.length > 1 && <Pressable style={styles.userPickerButton} accessibilityRole="button" accessibilityLabel={t('Selecionar usuário')} accessibilityState={{ expanded: showUsers }} onPress={() => { Keyboard.dismiss(); setShowUsers((open) => !open); }}><Text style={styles.userPickerArrow}>{showUsers ? '▴' : '▾'}</Text></Pressable>}
            </View>
            {showUsers && !offline && <ScrollView style={styles.userPickerList} nestedScrollEnabled keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {loginUsers.map((name) => <Pressable key={name} style={styles.userPickerItem} accessibilityRole="button" accessibilityLabel={name} onPress={() => { setUsername(name); setPassword(''); setError(''); setShowUsers(false); }}><Text style={styles.connectionText}>{name}</Text></Pressable>)}
            </ScrollView>}
          </>}
          {offline && <><Text style={styles.helperText}>{t('Informe a chave de recuperação guardada fora do aparelho e crie uma senha temporária de 4 a 6 caracteres. Ao conectar, o admin voltará a usar a senha semanal. Pedidos e usuários apagados não serão recuperados.')}</Text><PasswordField label={t('Chave de recuperação')} value={recoveryCode} onChangeText={setRecoveryCode} /></>}
          <PasswordField label={t(settings ? 'Senha de Configurações' : offline ? 'Senha temporária' : 'Senha')} value={password} onChangeText={setPassword} />
          {offline && <PasswordField label={t('Confirmar senha')} value={confirmation} onChangeText={setConfirmation} />}
          {!settings && !auth.exists && !offline && <><Text style={styles.helperText}>{t('Acesso do admin não encontrado. Recupere pela internet ou use sua chave de recuperação offline.')}</Text><Pressable disabled={auth.recovering || busy} style={styles.secondaryWideButton} onPress={auth.recover}><Text style={styles.secondaryButtonText}>{t(auth.recovering ? 'Verificando…' : 'Recuperar acesso do admin')}</Text></Pressable>{!!auth.recoveryError && <Text style={styles.errorText}>{t(auth.recoveryError)}</Text>}</>}
          {!settings && !auth.exists && <Pressable disabled={busy} style={styles.secondaryWideButton} onPress={() => { setOfflineMode(!offlineMode); setShowUsers(false); setUsername('admin'); setPassword(''); setConfirmation(''); setRecoveryCode(''); setError(''); }}><Text style={styles.secondaryButtonText}>{t(offline ? 'Voltar' : 'Recuperar sem internet')}</Text></Pressable>}
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(error)}</Text>}
          <Pressable disabled={busy} onPress={submit} style={[styles.sendButton, busy && styles.pressed]}>{busy ? <ActivityIndicator color={'#fff'} /> : <Text style={styles.sendButtonText}>{t(settings ? 'Desbloquear' : offline ? 'Ativar acesso offline' : 'Entrar')}</Text>}</Pressable>
          {settings && <Pressable style={styles.cancelButton} onPress={() => router.replace('/')}><Text style={styles.cancelButtonText}>{t('Voltar')}</Text></Pressable>}
        </>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
export function LoginGate({ children }: { children: ReactNode }) {
  const { signedIn } = useAuth();
  return signedIn ? children : <SafeAreaProvider><SafeAreaView style={styles.container}><AccessForm /></SafeAreaView></SafeAreaProvider>;
}
export function SettingsGate({ children }: { children: ReactNode }) {
  const { service } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [generation, setGeneration] = useState(0);
  useFocusEffect(useCallback(() => {
    function lock() { service.lockSettings(); setUnlocked(false); setGeneration((value) => value + 1); }
    lock();
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') lock(); });
    return () => { subscription.remove(); lock(); };
  }, [service]));
  return unlocked ? children : <AccessForm key={generation} settings onUnlock={() => setUnlocked(true)} />;
}
