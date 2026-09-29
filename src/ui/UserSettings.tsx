import { useEffect, useState } from 'react';
import { cloud } from '../services/cloudStorage';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PasswordField } from './AccessGate';
import { styles, COLORS } from './theme';

export function UserSettings() {
  const { service, currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState(() => service.listUsers());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => { void service.load().then(() => { if (active) setUsers(service.listUsers()); }).catch(() => {}); };
    refresh(); const stop = cloud.subscribe(refresh);
    return () => { active = false; stop(); };
  }, [service]);
  async function change(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await action(); setUsers(service.listUsers()); setPassword(''); setConfirmation(''); setUsername(''); setEditing(null); }
    catch (error) { Alert.alert(t('Falha ao salvar'), t(error instanceof Error ? error.message : 'Não foi possível salvar a configuração.')); }
    finally { setBusy(false); }
  }
  if (currentUser !== 'admin') return <View style={styles.panel}><Text style={styles.helperText}>{t('Entre como admin para gerenciar os usuários compartilhados.')}</Text></View>;
  return <View style={[styles.panel, { marginTop: 20 }]}>
    <Text style={styles.panelTitle}>{t('Usuários')}</Text>
    <Text style={styles.helperText}>{t('Usuários são compartilhados entre tablets após sincronizar. Offline, ficam disponíveis os acessos já recebidos neste aparelho.')}</Text>
    {users.map((user) => <View key={user.username} style={styles.orderCard}>
      <View style={styles.orderLine}><Text style={styles.cardTitle}>{user.username}</Text><Switch accessibilityLabel={t('Usuário ativo') + ': ' + user.username} value={user.active} disabled={busy} onValueChange={(active) => change(() => service.updateUser(user.username, active))} trackColor={{ false: COLORS.border, true: COLORS.green }} /></View>
      <Pressable disabled={busy} style={styles.secondaryWideButton} onPress={() => { setEditing(user.username); setUsername(user.username); setPassword(''); setConfirmation(''); }}><Text style={styles.secondaryButtonText}>{t('Redefinir senha')}</Text></Pressable>
    </View>)}
    <Text style={styles.sectionTitle}>{t(editing ? 'Redefinir senha' : 'Cadastrar usuário')}</Text>
    <TextInput accessibilityLabel={t('Usuário')} placeholder={t('Usuário')} placeholderTextColor={COLORS.placeholder} value={username} onChangeText={setUsername} editable={!editing && !busy} autoCapitalize="none" autoCorrect={false} maxLength={24} style={styles.input} />
    <PasswordField label={t('Senha')} value={password} onChangeText={setPassword} />
    <PasswordField label={t('Confirmar senha')} value={confirmation} onChangeText={setConfirmation} />
    <Text style={styles.helperText}>{t('Use uma senha de 4 a 6 caracteres e confirme a mesma senha.')}</Text>
    <Pressable disabled={busy} style={[styles.sendButton, busy && styles.pressed]} onPress={() => change(() => editing ? service.updateUser(editing, users.find((u) => u.username === editing)!.active, password, confirmation) : service.createUser(username, password, confirmation))}><Text style={styles.sendButtonText}>{t(busy ? 'Salvando…' : 'Salvar usuário')}</Text></Pressable>
    {editing && <Pressable disabled={busy} style={styles.cancelButton} onPress={() => { setEditing(null); setUsername(''); setPassword(''); setConfirmation(''); }}><Text style={styles.cancelButtonText}>{t('Cancelar')}</Text></Pressable>}
  </View>;
}
