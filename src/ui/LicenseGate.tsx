import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, ActivityIndicator, ScrollView, SafeAreaView, Text, View } from './ThemedNative';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { tabletLicenseService } from '../services/licenseRuntime';
import { useLanguage } from '../i18n/LanguageContext';
import { AppearanceSelector } from './AppearanceSelector';
import { LanguageSelector } from './LanguageSelector';
import { styles } from './theme';

export function LicenseGate({ children }: { children: ReactNode }) {
  const [service] = useState(tabletLicenseService), { t, language, locale, setLanguage } = useLanguage();
  const value = useSyncExternalStore(service.subscribe, service.snapshot, service.snapshot);
  const [code, setCode] = useState(''), [error, setError] = useState(false), [saving, setSaving] = useState(false);
  useEffect(() => {
    const check = () => { if (AppState.currentState === 'active') void service.refresh().catch(() => {}); };
    check();
    const timer = setInterval(check, 60000), listener = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [service]);
  // Keep the operational tree mounted so expiration never discards a draft.
  const allowed = value.status === 'active';
  return <View style={styles.flex}><View style={[styles.flex, !allowed && { display: 'none' }]} pointerEvents={allowed ? 'auto' : 'none'} accessibilityElementsHidden={!allowed} importantForAccessibility={allowed ? 'auto' : 'no-hide-descendants'}>{children}</View>{!allowed && <SafeAreaProvider><SafeAreaView testID="license-surface" style={styles.container}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 18 }}><View style={[styles.panel, { width: '100%', maxWidth: 480 }]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 8 }}><AppearanceSelector language={language} /><LanguageSelector language={language} onChange={value => { void setLanguage(value); }} /></View>
    <Text style={styles.eyebrow}>BistroHub</Text><Text style={styles.helperText}>{t('Do caixa à cozinha.')}</Text>
    <Text style={styles.panelTitle}>{t('Licença do aplicativo')}</Text>
    <Text style={styles.settingsIntro}>{t(value.status === 'loading' ? 'Verificando licença…' : value.status === 'blocked' ? 'Licença bloqueada pelo administrador.' : value.status === 'expired' ? 'A licença deste cliente venceu.' : value.status === 'storage-error' ? 'Não foi possível ler a licença neste aparelho.' : value.status === 'clock-error' ? 'Confira a data e a hora deste tablet para validar a licença.' : 'Este tablet ainda não verificou a licença.')}</Text>
    {!!value.expiresAt && <Text style={styles.settingsIntro}>{t('Válida até')}: {new Date(value.expiresAt).toLocaleString(locale)}</Text>}
    <Text style={styles.fieldLabel}>{t('Identificador do tablet')}</Text><Text selectable style={styles.settingsIntro}>{value.deviceId}</Text>
    <Text style={styles.settingsIntro}>{t('Conecte à internet ou solicite ao administrador um código temporário para este tablet.')}</Text>
    <Pressable disabled={value.checking || saving} onPress={() => { void service.refresh(true).catch(() => {}); }} style={[styles.sendButton, value.checking && styles.pressed]}>{value.checking ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>{t('Verificar agora')}</Text>}</Pressable>
    {value.error && <Text role="alert" style={styles.errorText}>{t('Não foi possível consultar a licença. A última validade recebida continua valendo.')}</Text>}
    <Text style={styles.fieldLabel}>{t('Código temporário')}</Text><TextInput accessibilityLabel={t('Código temporário')} multiline maxLength={4096} value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} editable={!saving} style={[styles.input, { minHeight: 88 }]} />
    <Pressable disabled={!code.trim() || saving || value.checking} style={[styles.sendButton, (!code.trim() || saving || value.checking) && styles.pressed]} onPress={() => { setSaving(true); setError(false); void service.applyCode(code).then(() => setCode(''), () => setError(true)).finally(() => setSaving(false)); }}><Text style={styles.sendButtonText}>{t('Aplicar código temporário')}</Text></Pressable>
    {error && <Text role="alert" style={styles.errorText}>{t('Código inválido, vencido ou destinado a outro tablet.')}</Text>}
  </View></ScrollView></SafeAreaView></SafeAreaProvider>}</View>;
}
