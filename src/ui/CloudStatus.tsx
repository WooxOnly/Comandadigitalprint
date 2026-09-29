import { useEffect, useState } from 'react';
import { Alert, AppState, Pressable, Text, View } from 'react-native';
import { cloud } from '../services/cloudStorage';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../state/AuthContext';
import { styles } from './theme';

export function CloudStatus() {
  const { t, locale } = useLanguage();
  const { logout } = useAuth();
  const [state, setState] = useState(cloud.status());
  useEffect(() => {
    const unsubscribe = cloud.subscribe(() => setState(cloud.status()));
    const interval = setInterval(() => { if (AppState.currentState === 'active') void cloud.sync(); }, 30000);
    const subscription = AppState.addEventListener('change', (value) => { if (value === 'active') void cloud.sync(); });
    void cloud.sync();
    return () => { unsubscribe(); clearInterval(interval); subscription.remove(); };
  }, []);
  const label = state.status === 'SYNCING' ? 'Sincronizando…' : state.status === 'SYNCED' ? 'Dados sincronizados' : state.status === 'CONFLICT' ? 'Alterações em conflito' : state.status === 'LOGIN_REQUIRED' ? 'Entre na nuvem para sincronizar' : state.status === 'STORAGE_ERROR' ? 'Falha no armazenamento local' : 'Pendente de sincronização';
  function action() {
    if (state.status === 'LOGIN_REQUIRED') {
      Alert.alert(t('Sincronização'), t('Entre novamente com internet para conectar este tablet. Os pedidos locais serão mantidos.'), [{ text: t('Cancelar') }, { text: t('Entrar'), onPress: logout }]); return;
    }
    const conflict = state.conflicts[0];
    if (conflict) {
      Alert.alert(t('Alterações em conflito'), conflict.key + '\n' + t('Este cadastro foi alterado em outro tablet. Escolha qual versão manter. Para pedidos, manter local preserva as duas comandas.'), [
        { text: t('Cancelar'), style: 'cancel' },
        { text: t('Usar servidor'), onPress: () => { void cloud.resolve(conflict.key, false).catch(() => Alert.alert(t('Falha ao salvar'))); } },
        { text: t('Manter local'), onPress: () => { void cloud.resolve(conflict.key, true).catch(() => Alert.alert(t('Falha ao salvar'))); } },
      ]); return;
    }
    void cloud.sync();
  }
  return <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
    <Pressable accessibilityRole="button" onPress={action}><Text style={styles.helperText}>{t(label)}{state.pending ? ` · ${state.pending}` : ''}</Text></Pressable>
    {state.lastSync && <Text style={styles.mutedText}>{t('Última sincronização')}: {new Date(state.lastSync).toLocaleString(locale)}</Text>}
  </View>;
}
