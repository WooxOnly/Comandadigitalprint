import { useState } from 'react';
import { Alert } from 'react-native';
import { Text, View } from '../ui/ThemedNative';
import { KeyboardPressable as Pressable } from '../ui/KeyboardControls';
import { ScreenFrame } from '../ui/ScreenFrame';
import { COLORS, styles } from '../ui/theme';
import { useOnlineOrders, type OnlineRequest } from '../state/OnlineOrdersContext';
import { useLanguage } from '../i18n/LanguageContext';
import { formatMoney } from '../services/business';
export default function OnlineOrdersScreen() {
 const online = useOnlineOrders(), { t, language } = useLanguage(), [busy, setBusy] = useState<string | null>(null), [message, setMessage] = useState('');
 const locale = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[language];
 const date = (value: string, timeZone?: string) => new Date(value).toLocaleString(locale, { ...(timeZone ? { timeZone } : {}) });
 async function decide(request: OnlineRequest, status: 'accepted' | 'declined') {
  if (!online || busy) return;
  const execute = async () => { setBusy(request.id); setMessage(''); try { await online.decide(request.id, status); } catch { setMessage(t('Não foi possível atualizar o pedido. Atualize a lista e tente novamente.')); } finally { setBusy(null); } };
  Alert.alert(t(status === 'accepted' ? 'Aceitar pedido' : 'Recusar pedido'), t(status === 'accepted' ? 'Confirmar aceite deste pedido?' : 'Recusar este pedido?'), [{ text: t('Cancelar'), style: 'cancel' }, { text: t('Confirmar'), onPress: () => void execute() }]);
 }
 return <ScreenFrame><View style={styles.contentFrame}>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><Text style={styles.sectionTitle}>{t('Pedidos online')} · {online?.pending || 0}</Text><Pressable accessibilityRole="button" style={styles.cancelButton} disabled={online?.loading} onPress={() => void online?.refresh()}><Text style={styles.cancelButtonText}>{t('Atualizar')}</Text></Pressable></View>
  <Text style={styles.helperText}>{t('Recebimento e aceite em teste. Aceitar não inicia preparo nem registra pagamento.')}</Text>
  {!online?.receiving && <Text style={styles.helperText}>{t('Novos pedidos automáticos estão desativados. O histórico foi preservado.')}</Text>}
  {!!online?.error && <Text accessibilityRole="alert" style={{ color: COLORS.primary, marginVertical: 8 }}>{t('Não foi possível consultar pedidos online. Confira a conexão e entre novamente na nuvem se necessário.')}</Text>}
  {!!message && <Text accessibilityRole="alert" style={{ color: COLORS.primary }}>{message}</Text>}
  {!online?.requests.length && !online?.loading && <Text style={styles.helperText}>{t('Nenhum pedido online recebido.')}</Text>}
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
   {online?.requests.map(request => <View key={request.id} testID={'online-request-' + request.id} style={[styles.panel, { flexBasis: 320, flexGrow: 1, minWidth: 0, maxWidth: '100%', marginBottom: 0 }]}>
    <Text style={styles.panelTitle}>{request.customer} · {request.id.slice(0, 8)}</Text><Text style={styles.helperText}>{t({ pending: 'Aguardando aceite', accepted: 'Aceito', declined: 'Recusado' }[request.status])}</Text>
    <Text style={styles.helperText}>{date(request.createdAt)}</Text><Text style={styles.helperText}>{request.contact}</Text>{request.paymentMethod && <Text style={styles.helperText}>{t('Forma de pagamento')}: {t({ cash: 'Dinheiro', credit: 'Cartão de crédito', debit: 'Cartão de débito' }[request.paymentMethod])}</Text>}
    <Text style={styles.fieldLabel}>{t({ table: 'Na mesa', pickup: 'Retirada', delivery: 'Entrega' }[request.fulfillment])}{request.table ? ' · ' + t('Mesa') + ' ' + request.table : ''}</Text>
    {!!request.address && <Text style={styles.helperText}>{request.address}</Text>}
    <Text style={styles.helperText}>{request.scheduledFor ? t('Agendado para') + ' ' + date(request.scheduledFor, request.timeZone) + ' · ' + request.timeZone : t('Para agora')}</Text>
    {request.items.map((item, index) => <View key={index} style={{ marginVertical: 8 }}><Text style={{ color: COLORS.ink, fontSize: 14 }}>{item.quantity} × {item.name}{item.flavors ? ' / ' + item.flavors[1] : ''}</Text><Text style={styles.helperText}>{formatMoney(item.quantity * item.unitPriceCents, locale)}</Text>{!!item.note && <Text style={styles.helperText}>{item.note}</Text>}</View>)}
    <Text style={styles.fieldLabel}>{t('Subtotal dos produtos')}: {formatMoney(request.subtotalCents, locale)}</Text>{!!request.notes && <Text style={styles.helperText}>{request.notes}</Text>}
    {request.status === 'pending' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}><Pressable accessibilityRole="button" style={styles.sendButton} disabled={!!busy} onPress={() => void decide(request, 'accepted')}><Text style={styles.sendButtonText}>{t('Aceitar pedido')}</Text></Pressable><Pressable accessibilityRole="button" style={styles.cancelButton} disabled={!!busy} onPress={() => void decide(request, 'declined')}><Text style={styles.cancelButtonText}>{t('Recusar pedido')}</Text></Pressable></View>}
   </View>)}
  </View>
 </View></ScreenFrame>;
}
