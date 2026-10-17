import { type AppRole, ROLE_LABELS } from '../../shared/app-roles.mjs';
import { UserRolePicker } from './UserRolePicker';
import { useEffect, useState } from 'react';
import { logError } from '../services/diagnostics';
import { cloud } from '../services/cloudStorage';
import { Alert, Keyboard, Switch, Text, View } from './ThemedNative';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from './KeyboardControls';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { PasswordField } from './AccessGate';
import { styles, COLORS } from './theme';

export function UserSettings() {
  const { service, changeOwnPassword } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState(() => service.listUsers());
  const [role,setRole] = useState<AppRole>('cashier');
  const [cancelPreorders, setCancelPreorders] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'manage' | 'create'>('manage');
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (busy) return; void service.load().then(() => { if (active) { setUsers(service.listUsers()); setLoadError(false); } }).catch(error => { if (active) setLoadError(true); logError('users.load_failed', error); }); };
    refresh(); const stop = cloud.subscribe(refresh);
    return () => { active = false; stop(); };
  }, [service, busy]);
  async function change(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try { await action(); await service.load(); setUsers(service.listUsers()); setTab('manage'); setPassword(''); setConfirmation(''); setUsername(''); setEditing(null); }
    catch (error) { logError('users.save_failed', error); Alert.alert(t('Falha ao salvar'), t(error instanceof Error ? error.message : 'Não foi possível salvar a configuração.')); }
    finally { setBusy(false); }
  }
  async function saveOwnPassword() {
    if (busy) return;
    setBusy(true);
    try {
      const synced = await changeOwnPassword(currentPassword, password, confirmation);
      setCurrentPassword(''); setPassword(''); setConfirmation('');
      Alert.alert(t('Senha alterada'), t(synced ? 'Sua nova senha já está disponível nos tablets sincronizados.' : 'Sua nova senha foi salva neste tablet. A sincronização está pendente.'));
    } catch (error) {
      logError('users.own_password_failed', error);
      Alert.alert(t('Falha ao salvar'), t(error instanceof Error ? error.message : 'Não foi possível salvar a configuração.'));
    } finally { setBusy(false); }
  }
  if (service.currentRole() !== 'admin') return <View style={styles.panel}>
    <Text style={styles.panelTitle}>{t('Alterar minha senha')}</Text>
    <Text style={styles.helperText}>{t('Você só pode alterar sua própria senha.')}</Text>
    <PasswordField label={t('Senha atual')} value={currentPassword} onChangeText={setCurrentPassword} />
    <PasswordField label={t('Nova senha')} value={password} onChangeText={setPassword} />
    <PasswordField label={t('Confirmar senha')} value={confirmation} onChangeText={setConfirmation} />
    <Text style={styles.helperText}>{t('Informe uma senha e confirme a mesma senha.')}</Text>
    <Pressable disabled={busy} style={[styles.sendButton, busy && styles.pressed]} onPress={saveOwnPassword}><Text style={styles.sendButtonText}>{t(busy ? 'Salvando…' : 'Salvar nova senha')}</Text></Pressable>
  </View>;
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>{t('Gerenciar usuários')}</Text>
    <View style={styles.orderLine}>{(['manage', 'create'] as const).map(value => <Pressable key={value} style={[styles.noteChip, tab === value && styles.selectedCategory]} onPress={() => { setTab(value); setEditing(null); setRole('cashier'); setCancelPreorders(false); setUsername(''); setPassword(''); setConfirmation(''); }} disabled={busy}><Text style={[styles.noteChipText, tab === value && styles.selectedCategoryText]}>{t(value === 'manage' ? 'Usuários cadastrados' : 'Cadastrar usuário')}</Text></Pressable>)}</View>
    {loadError && <Text style={styles.helperText}>{t('Não foi possível carregar os usuários. Reabra os ajustes para tentar novamente.')}</Text>}
    <Text style={styles.helperText}>{t('Usuários são compartilhados entre tablets após sincronizar. Offline, ficam disponíveis os acessos já recebidos neste aparelho.')}</Text>
    {tab === 'manage' && <View>
    <View style={styles.orderCard}><Text style={[styles.cardTitle, styles.usernameText]}>admin</Text><Text style={styles.helperText}>{t('Administrador protegido. Senha semanal gerenciada pelo painel online.')}</Text></View>
    {users.length === 0 && <Text style={styles.helperText}>{t('Nenhum usuário adicional cadastrado.')}</Text>}
    {users.map((user) => <View key={user.username} style={styles.orderCard}>
      <View style={styles.orderLine}><Text style={[styles.cardTitle, styles.usernameText]}>{user.username} · {t(ROLE_LABELS[user.role])}</Text><Text style={styles.helperText}>{t(user.active ? 'Ativo' : 'Inativo')}</Text><Switch accessibilityLabel={t('Usuário ativo') + ': ' + user.username} value={user.active} disabled={busy} onValueChange={(active) => { Keyboard.dismiss(); change(() => service.updateUser(user.username, active)); }} trackColor={{ false: COLORS.border, true: COLORS.green }} /></View>
      <Pressable disabled={busy} style={styles.secondaryWideButton} onPress={() => { setTab('create'); setEditing(user.username); setRole(user.role); setCancelPreorders(user.cancelPreorders === true); setUsername(user.username); setPassword(''); setConfirmation(''); }}><Text style={styles.secondaryButtonText}>{t('Editar usuário')}</Text></Pressable>
    </View>)}
    </View>}
    {tab === 'create' && <View>
    <Text style={styles.sectionTitle}>{t(editing ? 'Editar usuário' : 'Cadastrar usuário')}</Text>
    <TextInput accessibilityLabel={t('Usuário')} placeholder={t('Usuário')} placeholderTextColor={COLORS.placeholder} value={username} onChangeText={setUsername} editable={!editing && !busy} autoCapitalize="none" autoCorrect={false} maxLength={24} style={[styles.input, styles.usernameText]} />
    <UserRolePicker value={role} onChange={setRole} disabled={busy} />
    {role === 'cashier' && <View style={styles.orderLine}><Text style={styles.fieldLabel}>{t('Cancelar encomendas')}</Text><Switch accessibilityLabel={t('Cancelar encomendas')} disabled={busy} value={cancelPreorders} onValueChange={setCancelPreorders} /></View>}
    <Text style={styles.helperText}>{t('Admin e Gerente sempre podem autorizar cancelamentos de encomendas.')}</Text>
    <PasswordField label={t('Senha')} value={password} onChangeText={setPassword} />
    <PasswordField label={t('Confirmar senha')} value={confirmation} onChangeText={setConfirmation} />
    <Text style={styles.helperText}>{t('Informe uma senha e confirme a mesma senha.')}</Text>
    <Pressable disabled={busy} style={[styles.sendButton, busy && styles.pressed]} onPress={() => change(() => editing ? service.updateUser(editing, users.find((u) => u.username === editing)!.active, password || undefined, password ? confirmation : undefined, role, cancelPreorders) : service.createUser(username, password, confirmation, role, cancelPreorders))}><Text style={styles.sendButtonText}>{t(busy ? 'Salvando…' : 'Salvar usuário')}</Text></Pressable>
    {editing && <Pressable disabled={busy} style={styles.cancelButton} onPress={() => { setEditing(null); setRole('cashier'); setCancelPreorders(false); setUsername(''); setPassword(''); setConfirmation(''); }}><Text style={styles.cancelButtonText}>{t('Cancelar')}</Text></Pressable>}
    </View>}
  </View>;
}
