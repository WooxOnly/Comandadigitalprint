import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { styles } from './theme';

export function PasswordField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} style={styles.input} /></>;
}
function AccessForm({ settings = false, onUnlock }: { settings?: boolean; onUnlock?: () => void }) {
  const { t } = useLanguage();
  const auth = useAuth();
  const username = 'admin';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function submit() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (settings) { await auth.service.verify('settings', password); if (active.current) onUnlock?.(); else auth.service.lockSettings(); }
      else await auth.login(username, password, confirmation);
    } catch (e) { if (active.current) { setError((e as Error).message); setPassword(''); setConfirmation(''); } }
    finally { lock.current = false; if (active.current) setBusy(false); }
  }
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
      <View style={[styles.panel, { width: '100%', maxWidth: 440, alignSelf: 'center' }]}>
        <Image source={require('../../assets/chef-icon.png')} style={{ width: 64, height: 64, alignSelf: 'center', marginBottom: 16, borderRadius: 16 }} />
        <Text style={styles.panelTitle}>{t(settings ? 'Acesso protegido' : auth.exists ? 'Entrar' : 'Primeiro acesso')}</Text>
        {!auth.ready ? <><Text style={styles.errorText}>{t(auth.error || 'Carregando dados salvos…')}</Text>{auth.error && <Pressable style={styles.secondaryWideButton} onPress={auth.load}><Text style={styles.secondaryButtonText}>{t('Tente novamente')}</Text></Pressable>}</> : <>
          {settings ? <Text style={styles.settingsIntro}>{t('Digite a senha de Configurações para continuar.')}</Text> : <><Text style={styles.fieldLabel}>{t('Usuário')}</Text><TextInput style={styles.input} accessibilityLabel={t('Usuário')} value={username} editable={false} /></>}
          <PasswordField label={t(settings ? 'Senha de Configurações' : 'Senha')} value={password} onChangeText={setPassword} />
          {!settings && !auth.exists && <><PasswordField label={t('Confirmar senha')} value={confirmation} onChangeText={setConfirmation} /><Text style={styles.helperText}>{t('Guarde suas senhas. Não há recuperação por e-mail para o acesso local.')}</Text></>}
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(error)}</Text>}
          <Pressable disabled={busy} onPress={submit} style={[styles.sendButton, busy && styles.pressed]}>{busy ? <ActivityIndicator color={'#fff'} /> : <Text style={styles.sendButtonText}>{t(settings ? 'Desbloquear' : auth.exists ? 'Entrar' : 'Criar acesso')}</Text>}</Pressable>
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
