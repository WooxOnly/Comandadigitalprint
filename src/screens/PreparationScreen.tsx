import { FilterIcon } from '../ui/FilterIcon';
import { ActionIcon } from '../ui/ActionIcon';
import { canUndoPreparation } from '../services/preparationUndo';
import { PasswordField } from '../ui/AccessGate';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Alert, Modal, PanResponder, ScrollView, StyleSheet, Text, useWindowDimensions, View } from '../ui/ThemedNative';
import { cloud } from '../services/cloudStorage';
import { useApp } from '../state/AppContext';
import { useBusiness } from '../state/BusinessContext';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { COLORS, styles } from '../ui/theme';
import { agendaWindow, localDayText, shiftAgenda } from '../services/preorderAgenda';
import type { Preparation } from '../services/business';
import { describeExtra } from '../../orderItems';
import { orderNumberLabel } from '../services/orderNumber';
import { useKitchenAlerts } from '../ui/useKitchenAlerts';
import { preparationDurations } from '../../shared/preparation-times.mjs';
import { preparationQueue, preparationPageSize, preparationStageMinutes } from '../services/preparationQueue';
const statuses = ['received', 'preparing', 'ready', 'completed'] as const;
const labels = { received: 'Recebido', preparing: 'Em preparo', ready: 'Pronto', completed: 'Finalizado' };
const accents = { received: '#DBA525', preparing: '#2684B1', ready: '#25734D', completed: '#718078' };
export default function PreparationScreen() {
  const { modules, preparation, advancePreparation, correctPreparation, busy } = useBusiness();
  const { history, printSavedOrder, printing, sending, isReady } = useApp();
  const { currentUser, service } = useAuth(), { t, locale, language } = useLanguage();
  const settings = useSyncExternalStore(cloud.subscribe, cloud.preparationSettings);
  const { width, height, fontScale } = useWindowDimensions();
  const [date, setDate] = useState(() => localDayText(new Date())), [now, setNow] = useState(Date.now), [showCompleted, setShowCompleted] = useState(false), [delay, setDelay] = useState('20');
  const [filterDay, setFilterDay] = useState(false), [filters, setFilters] = useState(false), [pageStart, setPageStart] = useState(0), [detailId, setDetailId] = useState<string | null>(null);
  const [correction, setCorrection] = useState<{ orderId: string; status: Preparation['status']; updatedAt: string } | null>(null);
  const [authorizers, setAuthorizers] = useState<{ username: string; role: string }[]>([]), [authorizer, setAuthorizer] = useState(''), [password, setPassword] = useState(''), [correctionError, setCorrectionError] = useState('');
  const [area, setArea] = useState({ width: 0, height: 0 });
  const today = agendaWindow(localDayText(new Date(now)), 'day');
  const alerts = useKitchenAlerts(modules.preparation, history.filter(order => Date.parse(order.createdAt) >= today.start && Date.parse(order.createdAt) < today.end));
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  let period: ReturnType<typeof agendaWindow> | null = null; try { if (filterDay) period = agendaWindow(date, 'day'); } catch {}
  const state = (id: string): Preparation['status'] => preparation.find(record => record.orderId === id)?.status ?? 'received';
  const orders = filterDay && !period ? [] : preparationQueue(history, preparation, showCompleted, period);
  const pageSize = preparationPageSize(width, height);
  const pages = Math.max(1, Math.ceil(orders.length / pageSize)), currentPage = Math.min(Math.floor(pageStart / pageSize), pages - 1);
  const visible = orders.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const columns = width >= 780 && width > height ? 4 : width >= 600 ? 2 : 1, rows = Math.ceil(pageSize / columns);
  const gestures = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_event, gesture) => gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) < 60 || Math.abs(gesture.dx) <= Math.abs(gesture.dy) * 1.6) return;
      const next = Math.max(0, Math.min(pages - 1, currentPage + (gesture.dx < 0 ? 1 : -1)));
      requestAnimationFrame(() => setPageStart(next * pageSize));
    },
  }), [currentPage, pages, pageSize]);
  const contentWidth = Math.max(1, Math.min(area.width || width - 20, width - 20));
  const cardWidth = Math.max(1, (contentWidth - (columns - 1) * 8) / columns);
  const maxCardHeight = 220 * Math.max(1, fontScale);
  const cardHeight = Math.max(148 * Math.max(1, fontScale), Math.min(maxCardHeight, (area.height - (rows - 1) * 8) / rows));
  const canReprint = settings.allowReprint && cloud.allowed('reprint', currentUser);
  const detail = history.find(order => order.id === detailId);
  if (!modules.preparation) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Módulo não habilitado para esta empresa.')}</Text></ScreenFrame>;
  function setPage(value: number) { setPageStart(value * pageSize); }
  function advance(id: string) {
    const next = statuses[statuses.indexOf(state(id)) + 1]; if (!next) return;
    Alert.alert(t('Alterar status'), t(labels[next]), [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void advancePreparation(id, next).then(() => alerts.acknowledge(id)).catch(e => Alert.alert(t('Falha ao salvar'), t(e.message))); } }]);
  }
  function closeCorrection() { if (busy) return; setCorrection(null); setPassword(''); setAuthorizer(''); setCorrectionError(''); }
  async function chooseCorrection(orderId: string, status: Preparation['status']) {
    const record = preparation.find(value => value.orderId === orderId); if (!record) return;
    try { await service.load(); } catch { Alert.alert(t('Falha ao salvar'),t('Não foi possível carregar os usuários deste tablet.'));return; }
    if (service.canCorrectPreparation()) {
      void correctPreparation(orderId,status,undefined,undefined,record.updatedAt).catch(error=>Alert.alert(t('Falha ao salvar'),t(error.message)));return;
    }
    setCorrection({ orderId, status, updatedAt: record.updatedAt }); setAuthorizer(''); setPassword(''); setCorrectionError('');
    try { setAuthorizers(service.preparationAuthorizers()); } catch { setAuthorizers([]); setCorrectionError('Não foi possível carregar os usuários deste tablet.'); }
  }
  async function authorizeCorrection() {
    if (!correction) return;
    const secret = password; setPassword(''); setCorrectionError('');
    try { await correctPreparation(correction.orderId, correction.status, authorizer, secret, correction.updatedAt); setCorrection(null); }
    catch (error) { setCorrectionError(error instanceof Error ? error.message : 'Não foi possível salvar a configuração.'); }
  }
  function reprint(order: typeof history[number]) { void printSavedOrder(order, false, 'preparation'); }
  return <View style={board.screen} pointerEvents={sending || !isReady ? 'none' : 'auto'}>
    <View style={board.toolbar}>
      <View style={board.queueTitle}><Text style={board.title}>{t('Fila de preparo')} · {orders.length}</Text><Text style={board.caption}>{t('Ordem de emissão')}{filterDay ? ' · ' + date : ''}</Text></View>
      {alerts.unread.length > 0 && <Pressable accessibilityRole="button" style={board.newButton} onPress={() => { const first = orders.findIndex(order => alerts.unread.includes(order.id)); if (first >= 0) setPage(Math.floor(first / pageSize)); alerts.acknowledge(); }}><Text style={board.actionText}>{t('Novos pedidos')}: {alerts.unread.length}</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel={t('Filtros e avisos')} accessibilityState={{ expanded: filters }} aria-expanded={filters} style={board.smallButton} onPress={() => setFilters(true)}><FilterIcon /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Atualizar pedidos')} style={board.smallButton} onPress={() => void cloud.sync()}><Text style={board.actionText}>↻</Text></Pressable>
    </View>
    <View testID='preparation-pages' {...gestures.panHandlers} style={[board.viewport, { maxHeight: rows * maxCardHeight + (rows - 1) * 8 }]} onLayout={event => { const { width, height } = event.nativeEvent.layout; setArea(current => current.width === width && current.height === height ? current : { width, height }); }}>
      <ScrollView style={styles.flex} contentContainerStyle={board.grid} showsVerticalScrollIndicator={true}>
        {visible.map(order => {
          const current = state(order.id), record = preparation.find(value => value.orderId === order.id);
          const minutes = preparationStageMinutes(order, record, now);
          const totalMinutes = Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000));
          const late = ['received', 'preparing'].includes(current) && /^\d{1,3}$/.test(delay) && Number(delay) > 0 && totalMinutes >= Number(delay);
          const heading = [order.serviceMode === 'takeout' ? t('Para levar') : t('Mesa') + (order.plate ? ' ' + order.plate : ''), order.customer?.trim()].filter(Boolean).join(' · ');
          const elapsed = minutes === null ? t(labels[current]) : t(labels[current]) + ' - ' + minutes.toLocaleString(locale) + 'm';
          const next = statuses[statuses.indexOf(current) + 1];
          return <View testID={'preparation-card-' + order.id} key={order.id} style={[board.card, { width: cardWidth, height: cardHeight, borderTopColor: late ? '#AE4328' : accents[current] }]}>
            <ScrollView testID={'preparation-items-' + order.id} style={board.itemPreview} contentContainerStyle={board.itemContent} nestedScrollEnabled persistentScrollbar showsVerticalScrollIndicator>
              <View style={[board.row, { alignItems: 'flex-start' }]}><Text style={board.orderNumber}>{heading}</Text><Text style={[board.status, { color: late ? '#AE4328' : accents[current] }]}>{elapsed}</Text></View>
              <Text style={board.meta}>{late ? t('Atrasado') + ' · ' : ''}{localDayText(new Date(order.createdAt)) !== localDayText(new Date(now)) ? new Date(order.createdAt).toLocaleDateString(locale, { month: '2-digit', day: '2-digit' }) + ' ' : ''}{new Date(order.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · {t('Pedido')} {orderNumberLabel(order) || order.plate}</Text>
              {order.items.map((item, index) => <View key={item.id + '-' + index} style={board.itemContent}><Text style={board.item}>{item.quantity}× {item.name}</Text>{!!item.note && <Text style={board.meta}>{item.note}</Text>}</View>)}
              {order.items.some(item => item.flavors?.length || item.extras?.length) && <Text style={board.caption}>{t('Itens e observações nos detalhes')}</Text>}
            </ScrollView>
            <View style={board.actions}><Pressable accessibilityRole="button" accessibilityLabel={t('Detalhes do pedido') + ' ' + (orderNumberLabel(order) || order.plate)} style={board.action} onPress={() => setDetailId(order.id)}><Text style={board.actionText}>{t('Detalhes')}</Text></Pressable>
              {canReprint && <Pressable accessibilityRole="button" accessibilityLabel={t('Reimprimir')} disabled={printing} style={[board.action, printing && styles.pressed]} onPress={() => reprint(order)}><ActionIcon kind="printer" /></Pressable>}
              {next && <Pressable accessibilityRole="button" disabled={busy} style={[board.action, board.advance, busy && styles.pressed]} onPress={() => advance(order.id)}><Text style={board.advanceText}>{t(next === 'preparing' ? 'Em preparo' : next === 'ready' || settings.useFinishButton === false ? 'Pronto' : 'Finalizar')}</Text></Pressable>}
            </View>
            {cloud.pending('preparation:' + order.id) && <Text style={board.caption}>{t('Pendente de sincronização')}</Text>}
          </View>;
        })}
        {!orders.length && <Text style={styles.emptyText}>{t('Nenhuma comanda neste período.')}</Text>}
      </ScrollView>
    </View>
    <View style={board.pagination}><Pressable accessibilityRole="button" accessibilityLabel={t('Pedidos anteriores')} disabled={currentPage === 0} style={[board.smallButton, currentPage === 0 && styles.pressed]} onPress={() => setPage(currentPage - 1)}><Text style={board.actionText}>←</Text></Pressable><Text style={board.caption}>{orders.length ? currentPage * pageSize + 1 : 0}–{Math.min((currentPage + 1) * pageSize, orders.length)} / {orders.length}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('Próximos pedidos')} disabled={currentPage >= pages - 1} style={[board.smallButton, currentPage >= pages - 1 && styles.pressed]} onPress={() => setPage(currentPage + 1)}><Text style={board.actionText}>→</Text></Pressable></View>
    <Modal visible={filters} transparent animationType="fade" onRequestClose={() => setFilters(false)}><View style={board.backdrop}><View style={board.modal}><View style={board.row}><Text style={board.title}>{t('Filtros e avisos')}</Text><Pressable accessibilityRole="button" style={board.smallButton} onPress={() => setFilters(false)}><Text style={board.actionText}>{t('Fechar')}</Text></Pressable></View><ScrollView>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: filterDay }} style={board.filterButton} onPress={() => { setFilterDay(!filterDay); setPage(0); }}><Text style={board.actionText}>{t(filterDay ? 'Filtrar por dia: ligado' : 'Filtrar por dia: desligado')}</Text></Pressable>
      {filterDay && <><TextInput value={date} onChangeText={value => { setDate(value); setPage(0); }} maxLength={10} style={styles.input} accessibilityLabel={t('Data (AAAA-MM-DD)')} /><View style={board.actions}>{[-1, 1].map(step => <Pressable key={step} style={board.filterButton} onPress={() => { try { setDate(shiftAgenda(date, step)); setPage(0); } catch {} }}><Text style={board.actionText}>{t(step < 0 ? 'Dia anterior' : 'Próximo dia')}</Text></Pressable>)}</View>{!period && <Text style={styles.errorText}>{t('Informe a data em AAAA-MM-DD.')}</Text>}</>}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: showCompleted }} style={board.filterButton} onPress={() => { setShowCompleted(!showCompleted); setPage(0); }}><Text style={board.actionText}>{t(showCompleted ? 'Ocultar finalizados' : 'Mostrar finalizados')}</Text></Pressable>
      <Text style={styles.fieldLabel}>{t('Destacar atraso após (minutos)')}</Text><TextInput value={delay} onChangeText={setDelay} maxLength={3} keyboardType="number-pad" style={styles.input} accessibilityLabel={t('Destacar atraso após (minutos)')} />
      <Pressable accessibilityRole="button" style={board.filterButton} onPress={() => void alerts.toggleSound().catch(e => Alert.alert(t('Falha ao salvar'), t(e.message)))}><Text style={board.actionText}>{t(alerts.sound ? 'Som de pedido novo: ligado' : 'Som de pedido novo: desligado')}</Text></Pressable><Pressable accessibilityRole="button" style={board.filterButton} onPress={() => void alerts.testSound()}><Text style={board.actionText}>{t('Testar som')}</Text></Pressable>
      <Text style={styles.helperText}>{t('Mantenha este painel aberto para receber avisos de novos pedidos.')}</Text>
    </ScrollView></View></View></Modal>
    <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetailId(null)}><View style={board.backdrop}><View testID='preparation-details' style={board.modal}><View style={board.row}><Text style={board.title}>{t('Detalhes do pedido')}</Text><Pressable accessibilityRole="button" style={board.smallButton} onPress={() => setDetailId(null)}><Text style={board.actionText}>{t('Fechar')}</Text></Pressable></View>{detail && <><ScrollView contentContainerStyle={board.detailItems}>
      <Text style={styles.cardTitle}>{orderNumberLabel(detail) || detail.plate} · {t(labels[state(detail.id)])}</Text><Text style={styles.mutedText}>{new Date(detail.createdAt).toLocaleString(locale)}{detail.plate ? ` · ${t('Mesa')} ${detail.plate}` : ` · ${t('Para levar')}`} · {detail.customer}</Text>
      {detail.items.map((item, index) => <View key={item.id + '-' + index} style={board.detailItem}><Text style={styles.cardTitle}>{item.quantity}× {item.name}</Text>{item.flavors?.map((flavor, i) => <Text key={i} style={styles.mutedText}>{flavor}</Text>)}{item.extras?.map((extra, i) => <Text key={i} style={styles.mutedText}>+ {describeExtra(extra, item.flavors, language)}</Text>)}{!!item.note && <Text style={styles.cardTitle}>{item.note}</Text>}</View>)}
      {(() => { const record = preparation.find(value => value.orderId === detail.id), timing = preparationDurations(detail, record); return <View style={board.detailItems}>{record?.startedAt && <Text style={styles.helperText}>{t('Início do preparo')}: {new Date(record.startedAt).toLocaleString(locale)} · {record.startedBy}</Text>}{record?.readyAt && <Text style={styles.helperText}>{t('Pronto')}: {new Date(record.readyAt).toLocaleString(locale)} · {record.readyBy}</Text>}{record?.completedAt && <Text style={styles.helperText}>{t('Finalizado')}: {new Date(record.completedAt).toLocaleString(locale)} · {record.completedBy}</Text>}{timing.preparationSeconds !== null && <Text style={styles.helperText}>{t('Tempo de preparo')}: {(timing.preparationSeconds / 60).toLocaleString(locale, { maximumFractionDigits: 1 })} min</Text>}</View>; })()}
      {(() => { const record = preparation.find(value => value.orderId === detail.id); if (!record || record.status === 'received') return null; return <View style={board.detailItems}>
        <Text style={styles.cardTitle}>{t('Corrigir etapa do preparo')}</Text>
        {canUndoPreparation(record, currentUser, now) && <Pressable accessibilityRole="button" disabled={busy} style={board.filterButton} onPress={() => { void correctPreparation(detail.id, undefined, undefined, undefined, record.updatedAt).catch(error => Alert.alert(t('Falha ao salvar'), t(error.message))); }}><Text style={board.actionText}>{t('Desfazer última alteração')}</Text></Pressable>}
        <Text style={styles.helperText}>{t('Após um minuto, quem tem permissão corrige diretamente. Os demais precisam de autorização local.')}</Text>
        {statuses.slice(0, statuses.indexOf(record.status)).map(status => <Pressable key={status} accessibilityRole="button" disabled={busy} style={board.filterButton} onPress={() => { void chooseCorrection(detail.id, status); }}><Text style={board.actionText}>{t('Voltar para {stage}').replace('{stage}', t(labels[status]))}</Text></Pressable>)}
        {record.correction && <Text style={styles.helperText}>{t('Última correção')}: {record.correction.requestedBy} · {record.correction.authorizedBy || t('Desfazer')} · {new Date(record.correction.at).toLocaleString(locale)}</Text>}
      </View>; })()}
    </ScrollView><View style={board.actions}>{canReprint && <Pressable accessibilityRole="button" accessibilityLabel={t('Reimprimir')} disabled={printing} style={board.action} onPress={() => { setDetailId(null); reprint(detail); }}><ActionIcon kind="printer" /></Pressable>}{state(detail.id) !== 'completed' && <Pressable accessibilityRole="button" disabled={busy} style={[board.action, board.advance]} onPress={() => advance(detail.id)}><Text style={board.advanceText}>{t('Alterar status')}</Text></Pressable>}</View></>}</View></View></Modal>
    <Modal visible={!!correction} transparent animationType="fade" onRequestClose={closeCorrection}><View style={board.backdrop}><View testID="preparation-correction" style={board.modal}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={board.detailItems}>
      <Text style={board.title}>{t('Autorizar correção do preparo')}</Text>
      {correction && <Text style={styles.helperText}>{t('Voltar para {stage}').replace('{stage}', t(labels[correction.status]))}</Text>}
      <Text style={styles.fieldLabel}>{t('Usuário autorizado')}</Text>
      {authorizers.map(user => <Pressable key={user.username} accessibilityRole="radio" accessibilityLabel={user.username} accessibilityState={{ checked: authorizer === user.username }} style={[board.filterButton, authorizer === user.username && styles.selectedCategory]} disabled={busy} onPress={() => { setAuthorizer(user.username); setPassword(''); }}><Text style={[board.actionText, authorizer === user.username && styles.selectedCategoryText]}>{user.username.replace(/^./, letter => letter.toUpperCase())}</Text></Pressable>)}
      <PasswordField label={t('Senha')} value={password} onChangeText={setPassword} />
      {!!correctionError && <Text role="alert" style={styles.errorText}>{t(correctionError)}</Text>}
      <Pressable accessibilityRole="button" disabled={busy || !authorizer || !password} style={[board.filterButton, (busy || !authorizer || !password) && styles.pressed]} onPress={() => { void authorizeCorrection(); }}><Text style={board.actionText}>{t('Confirmar correção')}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy} style={board.filterButton} onPress={closeCorrection}><Text style={board.actionText}>{t('Cancelar')}</Text></Pressable>
    </ScrollView></View></View></Modal>
  </View>;
}
const board = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 4, gap: 6 }, toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, queueTitle: { flex: 1, minWidth: 110 }, title: { color: COLORS.ink, fontSize: 16, fontWeight: '800', flexShrink: 1 }, caption: { color: COLORS.muted, fontSize: 11 }, viewport: { flex: 1, minHeight: 0 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' }, card: { borderWidth: 1, borderTopWidth: 5, borderColor: COLORS.border, borderRadius: 8, padding: 8, backgroundColor: COLORS.surface, gap: 4, overflow: 'hidden' }, row: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between' }, orderNumber: { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.ink }, status: { maxWidth: '55%', fontSize: 12, fontWeight: '700', flexShrink: 1 }, meta: { fontSize: 11, color: COLORS.muted }, itemPreview: { flex: 1, minHeight: 0 }, itemContent: { gap: 3 }, item: { fontSize: 13, color: COLORS.ink, fontWeight: '600' }, late: { color: '#AE4328', fontWeight: '700', fontSize: 11 }, actions: { flexDirection: 'row', gap: 4 }, action: { minHeight: 44, flex: 1, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.greenSoft, borderRadius: 6 }, actionText: { fontSize: 12, fontWeight: '700', color: COLORS.green, textAlign: 'center', flexShrink: 1 }, advance: { backgroundColor: COLORS.green }, advanceText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' }, smallButton: { minWidth: 44, minHeight: 44, paddingHorizontal: 9, borderRadius: 7, backgroundColor: COLORS.greenSoft, justifyContent: 'center', alignItems: 'center' }, newButton: { minHeight: 44, paddingHorizontal: 8, backgroundColor: '#FFE7A9', borderRadius: 7, justifyContent: 'center' }, pagination: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 }, backdrop: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0008' }, modal: { width: '100%', maxWidth: 760, maxHeight: '94%', backgroundColor: '#fff', padding: 16, borderRadius: 14, gap: 12 }, filterButton: { minHeight: 44, padding: 12, backgroundColor: COLORS.greenSoft, borderRadius: 8, marginVertical: 5, justifyContent: 'center' }, detailItems: { gap: 12 }, detailItem: { paddingBottom: 10, borderBottomWidth: 1, borderColor: COLORS.border, gap: 5 },
});
