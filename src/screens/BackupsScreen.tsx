import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { cloud, ensureLocalBackup, listVerifiedBackups, recoverLocalBackup } from '../services/cloudStorage';
import { useAccess } from '../ui/useAccess';
import { ScreenFrame } from '../ui/ScreenFrame';
import { KeyboardPressable as Pressable } from '../ui/KeyboardControls';
import { styles } from '../ui/theme';
import { useLanguage } from '../i18n/LanguageContext';
export default function BackupsScreen() {
  const allowed = useAccess('restore'), { t, locale } = useLanguage();
  const [backups, setBackups] = useState<Awaited<ReturnType<typeof listVerifiedBackups>>>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState(''); const lock = useRef(false);
  async function run(action: () => Promise<void>) { if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); try { await action(); } catch (e) { const code = (e as { code?: string }).code; const labels: Record<string, string> = { ACCESS_DENIED: 'Usuário sem permissão para esta ação.', CASH_PENDING: 'Consulte a operação pendente no Caixa antes de recuperar dados.', LOGIN_REQUIRED: 'Entre na nuvem antes de recuperar dados.', UNAVAILABLE: 'Não foi possível recuperar agora. Confira conexão e armazenamento.', STORAGE_ERROR: 'Não foi possível recuperar agora. Confira conexão e armazenamento.' }; setMessage(t(labels[code || ''] || (e as Error).message)); } finally { lock.current = false; setBusy(false); } }
  if (!allowed) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Usuário sem permissão para esta ação.')}</Text></ScreenFrame>;
  return <ScreenFrame><View style={{ gap: 12 }}><Text style={styles.panelTitle}>{t('Recuperação de dados')}</Text>
    <View style={styles.panel}><Text style={styles.sectionTitle}>{t('1. Tablet substituto ou dados da nuvem')}</Text><Text style={styles.helperText}>{t('Vincule o novo tablet à mesma empresa e entre na nuvem. Recupere os registros sincronizados mantendo a identidade e as preferências deste aparelho.')}</Text>
      <Pressable disabled={busy} style={styles.sendButton} onPress={() => Alert.alert(t('Recuperar da nuvem'), t('A recuperação mantém dados atuais e operações pendentes.'), [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => void run(async () => { await cloud.recoverFromCloud(); setMessage(t('Dados da nuvem consultados. Confira o histórico e as pendências.')); }) }])}><Text style={styles.sendButtonText}>{t('Recuperar da nuvem')}</Text></Pressable>
    </View>
    <View style={styles.panel}><Text style={styles.sectionTitle}>{t('2. Verificar cópias locais')}</Text><Text style={styles.helperText}>{t('As cópias locais são criptografadas e pertencem a este tablet. A verificação testa leitura, integridade e fila. No tablet substituto, use os dados da nuvem; cópias locais não sincronizadas continuam no aparelho original.')}</Text>
      <Pressable disabled={busy} style={styles.secondaryWideButton} onPress={() => void run(async () => { await ensureLocalBackup(); setBackups(await listVerifiedBackups()); })}><Text style={styles.secondaryButtonText}>{t('Verificar backups')}</Text></Pressable>
      {backups.map(backup => <View key={backup.name} style={styles.historyCard}><Text style={backup.valid ? styles.cardTitle : styles.errorText}>{new Date(backup.createdAt).toLocaleString(locale)} · {t(backup.valid ? 'Backup verificado' : 'Backup indisponível')}</Text>
        {backup.valid && <><Text style={styles.mutedText}>{t('Registros')}: {backup.records} · {t('Pedidos')}: {backup.orders} · {t('Pendências')}: {backup.pending}{backup.pendingCash ? ` · ${t('Operação de caixa pendente')}` : ''}</Text><Pressable disabled={busy} style={styles.noteChip} onPress={() => Alert.alert(t('Recuperar registros ausentes'), t('Os registros atuais prevalecem. Operações financeiras pendentes recuperadas exigem consulta do resultado no Caixa.'), [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => void run(async () => { const recovered = await recoverLocalBackup(backup.name); setMessage(`${t('Registros recuperados')}: ${recovered}`); setBackups(await listVerifiedBackups()); }) }])}><Text style={styles.noteChipText}>{t('Recuperar registros ausentes')}</Text></Pressable></>}
      </View>)}
    </View>{!!message && <Text style={styles.helperText} accessibilityLiveRegion="polite">{message}</Text>}
  </View></ScreenFrame>;
}
