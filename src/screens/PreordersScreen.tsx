import { cloud } from '../services/cloudStorage';
import { PasswordField } from '../ui/AccessGate';
import { ScheduledDateFields } from '../ui/ScheduledDateFields';
import { emptyDate, emptyTime, datePartsFromISO, datePartsISO, scheduledDate, usDateTime } from '../services/scheduledDate';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, View } from '../ui/ThemedNative';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { ScreenFrame } from '../ui/ScreenFrame';
import { agendaWindow, localDayText, preorderTiming, shiftAgenda } from '../services/preorderAgenda';
import { CustomerPicker } from '../ui/CustomerPicker';
import { BusinessItemsEditor } from '../ui/BusinessItemsEditor';
import { useBusiness } from '../state/BusinessContext';
import { useLanguage } from '../i18n/LanguageContext';
import { styles } from '../ui/theme';
import { formatMoney, parseMoney, type Delivery, type BusinessItem, type Preorder } from '../services/business';

const statusLabels = { scheduled: 'Agendada', preparing: 'Em preparo', ready: 'Pronta', completed: 'Concluída', cancelled: 'Cancelada' };
export default function PreordersScreen() {
  const { modules, preorders, customers, busy, savePreorder, setPreorderStatus, cancelPreorder } = useBusiness();
  const { t } = useLanguage();
  const [agendaMode, setAgendaMode] = useState<'all' | 'day' | 'week'>('all'), [agendaDate, setAgendaDate] = useState(() => localDayText(new Date())), [now, setNow] = useState(Date.now);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(interval); }, []);
  let period: ReturnType<typeof agendaWindow> | null = null; try { if (agendaMode !== 'all') period = agendaWindow(agendaDate, agendaMode); } catch {}
  const visible = preorders.filter(record => agendaMode === 'all' || (period && Date.parse(record.dueAt) >= period.start && Date.parse(record.dueAt) < period.end));
  const overdue = preorders.filter(record => preorderTiming(record.dueAt, record.status, now) === 'Atrasada').length;
  const upcoming = preorders.filter(record => preorderTiming(record.dueAt, record.status, now) === 'Próxima hora').length;
  const [creating, setCreating] = useState(false);
  const [customer, setCustomer] = useState(''), [contact, setContact] = useState(''), [address, setAddress] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [fee, setFee] = useState('0.00'), [driver, setDriver] = useState('');
  const [date, setDate] = useState(emptyDate), [time, setTime] = useState(emptyTime);
  const [submitted, setSubmitted] = useState(false);
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup');
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [authorizers, setAuthorizers] = useState<{ username: string; role: string }[]>([]);
  const [authorizer, setAuthorizer] = useState(''), [cancelPassword, setCancelPassword] = useState(''), [cancelError, setCancelError] = useState(''), [loadingAuthorizers, setLoadingAuthorizers] = useState(false);
  function openCancellation(id: string) { setCancelId(id); setAuthorizers([]); setAuthorizer(''); setCancelPassword(''); setCancelError(''); setLoadingAuthorizers(true); }
  function closeCancellation() { setCancelId(null); setCancelPassword(''); setCancelError(''); }
  useEffect(() => {
    if (!cancelId) return;
    let active = true;
    void cloud.cancellationUsers().then(result => { if (active) setAuthorizers(result.users); }).catch(() => { if (active) setCancelError('Conecte à internet para autorizar o cancelamento.'); }).finally(() => { if (active) setLoadingAuthorizers(false); });
    return () => { active = false; };
  }, [cancelId]);
  async function confirmCancellation() {
    if (!cancelId || !authorizer || !cancelPassword || busy) return;
    try { await cancelPreorder(cancelId, authorizer, cancelPassword); closeCancellation(); }
    catch (error) { setCancelPassword(''); setCancelError((error as Error).message); }
  }
  if (!modules.preorders) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Módulo não habilitado para esta empresa.')}</Text></ScreenFrame>;
  async function save() {
    setSubmitted(true);
    try {
      if (!customer.trim() || !contact.trim() || !items.length || (fulfillment === 'delivery' && !address.trim())) throw new Error('Informe cliente, contato, itens e endereço para entrega.');
      const scheduled = scheduledDate(date, time);
      await savePreorder({ customer: customer.trim(), ...(modules.customers && customerId ? { customerId } : {}), ...(fulfillment === 'delivery' ? { delivery: { feeCents: parseMoney(fee), driver: driver.trim(), status: 'pending' as const } } : {}), contact: contact.trim(), address: address.trim(), fulfillment, dueAt: scheduled.toISOString(), items });
      setCreating(false); setCustomer(''); setContact(''); setAddress(''); setDate(emptyDate()); setTime(emptyTime()); setSubmitted(false); setItems([]); setCustomerId(undefined); setFee('0.00'); setDriver(''); setError('');
    } catch (e) { setError((e as Error).message); }
  }
  return <ScreenFrame><View style={{ gap: 12 }}>
    <Text style={styles.settingsIntro}>{t('Agende retiradas e entregas sem alterar as comandas do dia.')}</Text>
    <View style={styles.panel}><Text style={styles.panelTitle}>{t('Agenda de encomendas')}</Text><Text style={overdue ? styles.errorText : styles.helperText}>{t('Atrasadas')}: {overdue} · {t('Próxima hora')}: {upcoming}</Text>
      <View style={styles.quickNotes}>{(['all', 'day', 'week'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: mode === agendaMode }} style={[styles.noteChip, mode === agendaMode && styles.selectedCategory]} onPress={() => setAgendaMode(mode)}><Text style={[styles.noteChipText, mode === agendaMode && styles.selectedCategoryText]}>{t(mode === 'all' ? 'Todas' : mode === 'day' ? 'Dia' : 'Semana')}</Text></Pressable>)}</View>
      {agendaMode !== 'all' && <><ScheduledDateFields filter date={datePartsFromISO(agendaDate)} onDate={value => setAgendaDate(datePartsISO(value) || `${value.year}-${value.month}-${value.day}`)} />
      <View style={styles.quickNotes}>{[-1, 1].map(direction => <Pressable key={direction} disabled={!period} style={styles.noteChip} onPress={() => setAgendaDate(shiftAgenda(agendaDate, direction * (agendaMode === 'week' ? 7 : 1)))}><Text style={styles.noteChipText}>{t(direction < 0 ? 'Anterior' : 'Próximo')}</Text></Pressable>)}</View>{!period && <Text style={styles.errorText}>{t('Confira a data da agenda.')}</Text>}</>}
    </View>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.sendButton} onPress={() => setCreating(!creating)}><Text style={styles.sendButtonText}>{t(creating ? 'Fechar cadastro' : 'Nova encomenda')}</Text></Pressable>
    {creating && <View style={styles.panel}>
      <CustomerPicker disabled={busy} selectedId={customerId} onSelect={record => { setCustomerId(record?.id); if (record) { setCustomer(record.name); setContact(record.phone || record.email); setAddress(record.addresses[0] || ''); } }} />
      {[[customer, setCustomer, 'Cliente', 500], [contact, setContact, 'Contato', 200]] .map(([value, setter, label, limit]) => <View key={label as string}><Text style={styles.fieldLabel}>{t(label as string)} *</Text><TextInput value={value as string} onChangeText={value => { setCustomerId(undefined); (setter as (text: string) => void)(value); }} editable={!busy} maxLength={limit as number} style={styles.input} accessibilityLabel={t(label as string)} />{submitted && !(value as string).trim() && <Text style={styles.errorText}>{t('Campo obrigatório.')}</Text>}</View>)}
      <ScheduledDateFields date={date} time={time} onDate={setDate} onTime={setTime} disabled={busy} submitted={submitted} />
      <View style={styles.quickNotes}>{(['pickup', 'delivery'] as const).map(value => <Pressable accessibilityRole="button" key={value} disabled={busy} style={[styles.noteChip, fulfillment === value && styles.selectedCategory]} onPress={() => setFulfillment(value)}><Text style={[styles.noteChipText, fulfillment === value && styles.selectedCategoryText]}>{t(value === 'pickup' ? 'Retirada' : 'Entrega')}</Text></Pressable>)}</View>
      {fulfillment === 'delivery' && <><Text style={styles.fieldLabel}>{t('Endereço de entrega')} *</Text><TextInput value={address} onChangeText={setAddress} editable={!busy} maxLength={1000} multiline style={styles.input} accessibilityLabel={t('Endereço de entrega')} />{submitted && !address.trim() && <Text style={styles.errorText}>{t('Campo obrigatório.')}</Text>}
        {modules.customers && customerId && <View style={styles.quickNotes}>{customers.find(record => record.id === customerId)?.addresses.map(value => <Pressable key={value} disabled={busy} style={[styles.noteChip, value === address && styles.selectedCategory]} onPress={() => setAddress(value)}><Text style={[styles.noteChipText, value === address && styles.selectedCategoryText]}>{value}</Text></Pressable>)}</View>}
        <Text style={styles.fieldLabel}>{t('Taxa de entrega (USD)')}</Text><TextInput value={fee} onChangeText={setFee} editable={!busy} keyboardType="decimal-pad" maxLength={11} style={styles.input} accessibilityLabel={t('Taxa de entrega (USD)')} />
        <Text style={styles.fieldLabel}>{t('Responsável pela entrega')}</Text><TextInput value={driver} onChangeText={setDriver} editable={!busy} maxLength={200} style={styles.input} accessibilityLabel={t('Responsável pela entrega')} /></>}
      {submitted && !items.length && <Text style={styles.errorText}>{t('Adicione ao menos um produto.')}</Text>}
      <BusinessItemsEditor items={items} onChange={setItems} priced={modules.cash} disabled={busy} />
      {!!error && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(error)}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} style={styles.sendButton} onPress={() => void save()}><Text style={styles.sendButtonText}>{t(busy ? 'Salvando…' : 'Salvar encomenda')}</Text></Pressable>
    </View>}
    {visible.map(record => <View key={record.id} style={styles.historyCard}>
      <Text style={styles.cardTitle}>{record.customer}{preorderTiming(record.dueAt, record.status, now) ? ` · ${t(preorderTiming(record.dueAt, record.status, now))}` : ''} · {t(statusLabels[record.status])}</Text>
      <Text style={styles.mutedText}>{usDateTime(record.dueAt)} · {t(record.fulfillment === 'pickup' ? 'Retirada' : 'Entrega')}</Text>
      <Text style={styles.mutedText}>{record.contact}{record.fulfillment === 'delivery' ? `\n${record.address}` : ''}</Text>
      {record.fulfillment === 'delivery' && <DeliveryPanel record={record} />}
      {record.cancellation && <Text style={styles.mutedText}>{t('Cancelamento autorizado por')}: {record.cancellation.authorizedBy} · {usDateTime(record.cancellation.at)} · {t('Solicitado por')}: {record.cancellation.requestedBy}</Text>}
      {record.items.map(item => <Text key={item.id} style={styles.cardTitle}>{item.quantity}x {item.name}{item.note ? `\n${item.note}` : ''}</Text>)}
      {!['completed', 'cancelled'].includes(record.status) && <View style={styles.quickNotes}>{(['preparing', 'ready', 'completed', 'cancelled'] as Preorder['status'][]).filter(status => status !== record.status && (status !== 'completed' || !record.delivery || record.delivery.status === 'delivered')).map(status => <Pressable accessibilityRole="button" key={status} disabled={busy} style={styles.noteChip} onPress={() => status === 'cancelled' ? openCancellation(record.id) : Alert.alert(t('Alterar status'), t(statusLabels[status]), [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void setPreorderStatus(record.id, status).catch(e => Alert.alert(t('Falha ao salvar'), t(e.message))); } }])}><Text style={styles.noteChipText}>{t(status === 'cancelled' ? 'Cancelar encomenda' : statusLabels[status])}</Text></Pressable>)}</View>}
    </View>)}
    {!visible.length && <Text style={styles.emptyText}>{t('Nenhuma encomenda cadastrada.')}</Text>}
    <Modal visible={!!cancelId} transparent animationType="fade" onRequestClose={() => { if (!busy) closeCancellation(); }}><View style={[styles.modalBackdrop, styles.modalBackdropWide]}><View style={[styles.productModal, styles.modalContent, { maxWidth: 460, maxHeight: '85%' }]}><ScrollView keyboardShouldPersistTaps="handled"><Text style={styles.panelTitle}>{t('Cancelar encomenda')}</Text><Text style={styles.helperText}>{t('Selecione quem autoriza e informe a senha desse usuário.')}</Text>{loadingAuthorizers && <Text style={styles.helperText}>{t('Carregando…')}</Text>}{authorizers.map(user => <Pressable key={user.username} accessibilityRole="radio" accessibilityState={{ checked: user.username === authorizer }} disabled={busy} style={[styles.noteChip, user.username === authorizer && styles.selectedCategory]} onPress={() => { setAuthorizer(user.username); setCancelPassword(''); setCancelError(''); }}><Text style={[styles.noteChipText, styles.usernameText, user.username === authorizer && styles.selectedCategoryText]}>{user.username}</Text></Pressable>)}<PasswordField label={t('Senha')} value={cancelPassword} onChangeText={setCancelPassword} />{!!cancelError && <Text accessibilityLiveRegion="polite" style={styles.errorText}>{t(cancelError)}</Text>}<Pressable accessibilityRole="button" disabled={busy || !authorizer || !cancelPassword || loadingAuthorizers} style={[styles.sendButton, (busy || !authorizer || !cancelPassword || loadingAuthorizers) && styles.pressed]} onPress={() => void confirmCancellation()}><Text style={styles.sendButtonText}>{t('Confirmar cancelamento')}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} style={styles.cancelButton} onPress={closeCancellation}><Text style={styles.cancelButtonText}>{t('Voltar')}</Text></Pressable></ScrollView></View></View></Modal>
  </View></ScreenFrame>;
}

function DeliveryPanel({ record }: { record: Preorder }) {
  const { busy, updateDelivery } = useBusiness(), { t, locale } = useLanguage();
  const [driver, setDriver] = useState(record.delivery?.driver ?? '');
  const [fee, setFee] = useState(((record.delivery?.feeCents ?? 0) / 100).toFixed(2));
  const current = record.delivery?.status ?? 'pending';
  const terminal = ['completed', 'cancelled'].includes(record.status) || current === 'delivered';
  const labels = { pending: 'Aguardando entrega', out: 'Saiu para entrega', delivered: 'Entregue' };
  async function update(status: Delivery['status']) {
    try { await updateDelivery(record.id, { ...record.delivery, driver: driver.trim(), feeCents: parseMoney(fee), status }); }
    catch (e) { Alert.alert(t('Falha ao salvar'), t((e as Error).message)); }
  }
  return <View style={{ gap: 8 }}><Text style={styles.cardTitle}>{t(labels[current])} · {t('Taxa de entrega')}: {formatMoney(record.delivery?.feeCents ?? 0, locale)}</Text>
    {record.delivery?.driver && <Text style={styles.mutedText}>{t('Responsável pela entrega')}: {record.delivery.driver}</Text>}
    {record.delivery?.dispatchedAt && <Text style={styles.mutedText}>{t('Saiu para entrega')}: {usDateTime(record.delivery.dispatchedAt)}</Text>}
    {record.delivery?.deliveredAt && <Text style={styles.mutedText}>{t('Entregue')}: {usDateTime(record.delivery.deliveredAt)}</Text>}
    {!terminal && <><TextInput value={driver} onChangeText={setDriver} editable={!busy} maxLength={200} style={styles.input} accessibilityLabel={t('Responsável pela entrega')} placeholder={t('Responsável pela entrega')} />
      <TextInput value={fee} onChangeText={setFee} editable={!busy} keyboardType="decimal-pad" maxLength={11} style={styles.input} accessibilityLabel={t('Taxa de entrega (USD)')} />
      <View style={styles.quickNotes}><Pressable disabled={busy} style={styles.noteChip} onPress={() => void update(current)}><Text style={styles.noteChipText}>{t('Salvar entrega')}</Text></Pressable>
      <Pressable disabled={busy || !driver.trim()} style={styles.noteChip} onPress={() => Alert.alert(t(current === 'pending' ? 'Saiu para entrega' : 'Entregue'), driver, [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => void update(current === 'pending' ? 'out' : 'delivered') }])}><Text style={styles.noteChipText}>{t(current === 'pending' ? 'Saiu para entrega' : 'Entregue')}</Text></Pressable></View></>}
  </View>;
}
