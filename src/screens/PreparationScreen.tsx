import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { preparationQueue, PREPARATION_PAGE_SIZE } from '../services/preparationQueue';
const statuses = ['received', 'preparing', 'ready', 'completed'] as const;
const labels = { received: 'Recebido', preparing: 'Em preparo', ready: 'Pronto', completed: 'Finalizado' };
const accents = { received: '#DBA525', preparing: '#2684B1', ready: '#25734D', completed: '#718078' };
export default function PreparationScreen() {
  const { modules, preparation, advancePreparation, busy } = useBusiness();
  const { history, printSavedOrder, printing, sending, isReady } = useApp();
  const { currentUser } = useAuth(), { t, locale, language } = useLanguage();
  const settings = useSyncExternalStore(cloud.subscribe, cloud.preparationSettings);
  const { width, height, fontScale } = useWindowDimensions();
  const [date, setDate] = useState(() => localDayText(new Date())), [now, setNow] = useState(Date.now), [showCompleted, setShowCompleted] = useState(false), [delay, setDelay] = useState('20');
  const [filterDay, setFilterDay] = useState(false), [filters, setFilters] = useState(false), [page, setPage] = useState(0), [detailId, setDetailId] = useState<string | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const today = agendaWindow(localDayText(new Date(now)), 'day');
  const alerts = useKitchenAlerts(modules.preparation, history.filter(order => Date.parse(order.createdAt) >= today.start && Date.parse(order.createdAt) < today.end));
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(interval); }, []);
  let period: ReturnType<typeof agendaWindow> | null = null; try { if (filterDay) period = agendaWindow(date, 'day'); } catch {}
  if (!modules.preparation) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Módulo não habilitado para esta empresa.')}</Text></ScreenFrame>;
  const state = (id: string): Preparation['status'] => preparation.find(record => record.orderId === id)?.status ?? 'received';
  const orders = filterDay && !period ? [] : preparationQueue(history, preparation, showCompleted, period);
  const pages = Math.max(1, Math.ceil(orders.length / PREPARATION_PAGE_SIZE)), currentPage = Math.min(page, pages - 1);
  const visible = orders.slice(currentPage * PREPARATION_PAGE_SIZE, (currentPage + 1) * PREPARATION_PAGE_SIZE);
  const columns = width >= 780 && width > height ? 3 : width >= 600 ? 2 : 1, rows = columns === 2 ? 3 : 2;
  const contentWidth = Math.max(1, Math.min(area.width || width - 20, width - 20));
  const cardWidth = Math.max(1, (contentWidth - (columns - 1) * 8) / columns);
  const cardHeight = Math.max(148 * Math.max(1, fontScale), (area.height - (rows - 1) * 8) / rows);
  const canReprint = settings.allowReprint && cloud.allowed('reprint', currentUser);
  const detail = history.find(order => order.id === detailId);
  function advance(id: string) {
    const next = statuses[statuses.indexOf(state(id)) + 1]; if (!next) return;
    Alert.alert(t('Alterar status'), t(labels[next]), [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void advancePreparation(id, next).then(() => alerts.acknowledge(id)).catch(e => Alert.alert(t('Falha ao salvar'), t(e.message))); } }]);
  }
  function reprint(order: typeof history[number]) { void printSavedOrder(order, false, 'preparation'); }
  return <View style={board.screen} pointerEvents={sending || !isReady ? 'none' : 'auto'}>
    <View style={board.toolbar}>
      <View style={board.queueTitle}><Text style={board.title}>{t('Fila de preparo')} · {orders.length}</Text><Text style={board.caption}>{t('Ordem de emissão')}{filterDay ? ' · ' + date : ''}</Text></View>
      {alerts.unread.length > 0 && <Pressable accessibilityRole="button" style={board.newButton} onPress={() => { const first = orders.findIndex(order => alerts.unread.includes(order.id)); if (first >= 0) setPage(Math.floor(first / PREPARATION_PAGE_SIZE)); alerts.acknowledge(); }}><Text style={board.actionText}>{t('Novos pedidos')}: {alerts.unread.length}</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel={t('Filtros e avisos')} style={board.smallButton} onPress={() => setFilters(true)}><Text style={board.actionText}>{t('Filtros e avisos')}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Atualizar pedidos')} style={board.smallButton} onPress={() => void cloud.sync()}><Text style={board.actionText}>↻</Text></Pressable>
    </View>
    <View style={board.viewport} onLayout={event => { const { width, height } = event.nativeEvent.layout; setArea(current => current.width === width && current.height === height ? current : { width, height }); }}>
      <ScrollView style={styles.flex} contentContainerStyle={board.grid} showsVerticalScrollIndicator={true}>
        {visible.map(order => {
          const current = state(order.id), record = preparation.find(value => value.orderId === order.id), timing = preparationDurations(order, record);
          const minutes = current === 'ready' || current === 'completed' ? timing.totalSeconds === null ? null : Math.floor(timing.totalSeconds / 60) : Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000));
          const late = ['received', 'preparing'].includes(current) && /^\d{1,3}$/.test(delay) && Number(delay) > 0 && minutes !== null && minutes >= Number(delay);
          const next = statuses[statuses.indexOf(current) + 1], summaryCount = cardHeight > 230 ? 4 : 2;
          return <View testID={'preparation-card-' + order.id} key={order.id} style={[board.card, { width: cardWidth, height: cardHeight, borderTopColor: late ? '#AE4328' : accents[current] }]}>
            <View style={board.row}><Text numberOfLines={1} style={board.orderNumber}>{orderNumberLabel(order) || order.plate}</Text><Text style={[board.status, { color: late ? '#AE4328' : accents[current] }]}>{t(labels[current])} · {minutes === null ? '—' : minutes + ' min'}</Text></View>
            <Text numberOfLines={1} style={board.meta}>{late ? t('Atrasado') + ' · ' : ''}{localDayText(new Date(order.createdAt)) !== localDayText(new Date(now)) ? new Date(order.createdAt).toLocaleDateString(locale, { month: '2-digit', day: '2-digit' }) + ' ' : ''}{new Date(order.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · {t(order.serviceMode === 'takeout' ? 'Para levar' : order.serviceMode === 'dine_in' ? 'Para comer aqui' : 'Mesa')}{order.plate ? ' ' + order.plate : ''}{order.customer ? ' · ' + order.customer : ''}</Text>

            <View style={board.itemPreview}>{order.items.slice(0, summaryCount).map((item, index) => <Text key={item.id + '-' + index} numberOfLines={1} style={board.item}>{item.quantity}× {item.name}{item.note ? ' · ' + item.note : ''}</Text>)}
              {(order.items.length > summaryCount || order.items.some(item => item.note || item.flavors?.length || item.extras?.length)) && <Text numberOfLines={1} style={board.caption}>{t('Itens e observações nos detalhes')}</Text>}
            </View>
            <View style={board.actions}><Pressable accessibilityRole="button" accessibilityLabel={t('Detalhes do pedido') + ' ' + (orderNumberLabel(order) || order.plate)} style={board.action} onPress={() => setDetailId(order.id)}><Text style={board.actionText}>{t('Detalhes')}</Text></Pressable>
              {canReprint && <Pressable accessibilityRole="button" disabled={printing} style={[board.action, printing && styles.pressed]} onPress={() => reprint(order)}><Text style={board.actionText}>{t('Reimprimir')}</Text></Pressable>}
              {next && <Pressable accessibilityRole="button" disabled={busy} style={[board.action, board.advance, busy && styles.pressed]} onPress={() => advance(order.id)}><Text style={board.advanceText}>{t(next === 'preparing' ? 'Iniciar' : next === 'ready' ? 'Pronto' : 'Finalizar')}</Text></Pressable>}
            </View>
            {cloud.pending('preparation:' + order.id) && <Text numberOfLines={1} style={board.caption}>{t('Pendente de sincronização')}</Text>}
          </View>;
        })}
        {!orders.length && <Text style={styles.emptyText}>{t('Nenhuma comanda neste período.')}</Text>}
      </ScrollView>
    </View>
    <View style={board.pagination}><Pressable accessibilityRole="button" accessibilityLabel={t('Pedidos anteriores')} disabled={currentPage === 0} style={[board.smallButton, currentPage === 0 && styles.pressed]} onPress={() => setPage(currentPage - 1)}><Text style={board.actionText}>←</Text></Pressable><Text style={board.caption}>{orders.length ? currentPage * 6 + 1 : 0}–{Math.min((currentPage + 1) * 6, orders.length)} / {orders.length}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('Próximos pedidos')} disabled={currentPage >= pages - 1} style={[board.smallButton, currentPage >= pages - 1 && styles.pressed]} onPress={() => setPage(currentPage + 1)}><Text style={board.actionText}>→</Text></Pressable></View>
    <Modal visible={filters} transparent animationType="fade" onRequestClose={() => setFilters(false)}><View style={board.backdrop}><View style={board.modal}><View style={board.row}><Text style={board.title}>{t('Filtros e avisos')}</Text><Pressable accessibilityRole="button" style={board.smallButton} onPress={() => setFilters(false)}><Text style={board.actionText}>{t('Fechar')}</Text></Pressable></View><ScrollView>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: filterDay }} style={board.filterButton} onPress={() => { setFilterDay(!filterDay); setPage(0); }}><Text style={board.actionText}>{t(filterDay ? 'Filtrar por dia: ligado' : 'Filtrar por dia: desligado')}</Text></Pressable>
      {filterDay && <><TextInput value={date} onChangeText={value => { setDate(value); setPage(0); }} maxLength={10} style={styles.input} accessibilityLabel={t('Data (AAAA-MM-DD)')} /><View style={board.actions}>{[-1, 1].map(step => <Pressable key={step} style={board.filterButton} onPress={() => { try { setDate(shiftAgenda(date, step)); setPage(0); } catch {} }}><Text style={board.actionText}>{t(step < 0 ? 'Dia anterior' : 'Próximo dia')}</Text></Pressable>)}</View>{!period && <Text style={styles.errorText}>{t('Informe a data em AAAA-MM-DD.')}</Text>}</>}
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: showCompleted }} style={board.filterButton} onPress={() => { setShowCompleted(!showCompleted); setPage(0); }}><Text style={board.actionText}>{t(showCompleted ? 'Ocultar finalizados' : 'Mostrar finalizados')}</Text></Pressable>
      <Text style={styles.fieldLabel}>{t('Destacar atraso após (minutos)')}</Text><TextInput value={delay} onChangeText={setDelay} maxLength={3} keyboardType="number-pad" style={styles.input} accessibilityLabel={t('Destacar atraso após (minutos)')} />
      <Pressable accessibilityRole="button" style={board.filterButton} onPress={() => void alerts.toggleSound().catch(e => Alert.alert(t('Falha ao salvar'), t(e.message)))}><Text style={board.actionText}>{t(alerts.sound ? 'Som de pedido novo: ligado' : 'Som de pedido novo: desligado')}</Text></Pressable><Pressable accessibilityRole="button" style={board.filterButton} onPress={() => void alerts.testSound()}><Text style={board.actionText}>{t('Testar som')}</Text></Pressable>
      <Text style={styles.helperText}>{t('Mantenha este painel aberto para receber avisos de novos pedidos.')}</Text>
    </ScrollView></View></View></Modal>
    <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetailId(null)}><View style={board.backdrop}><View style={board.modal}><View style={board.row}><Text style={board.title}>{t('Detalhes do pedido')}</Text><Pressable accessibilityRole="button" style={board.smallButton} onPress={() => setDetailId(null)}><Text style={board.actionText}>{t('Fechar')}</Text></Pressable></View>{detail && <><ScrollView contentContainerStyle={board.detailItems}>
      <Text style={styles.cardTitle}>{orderNumberLabel(detail) || detail.plate} · {t(labels[state(detail.id)])}</Text><Text style={styles.mutedText}>{new Date(detail.createdAt).toLocaleString(locale)} · {t('Mesa')} {detail.plate} · {detail.customer}</Text>
      {detail.items.map((item, index) => <View key={item.id + '-' + index} style={board.detailItem}><Text style={styles.cardTitle}>{item.quantity}× {item.name}</Text>{item.flavors?.map((flavor, i) => <Text key={i} style={styles.mutedText}>{flavor}</Text>)}{item.extras?.map((extra, i) => <Text key={i} style={styles.mutedText}>+ {describeExtra(extra, item.flavors, language)}</Text>)}{!!item.note && <Text style={styles.cardTitle}>{item.note}</Text>}</View>)}
      {(() => { const record = preparation.find(value => value.orderId === detail.id), timing = preparationDurations(detail, record); return <View style={board.detailItems}>{record?.startedAt && <Text style={styles.helperText}>{t('Início do preparo')}: {new Date(record.startedAt).toLocaleString(locale)} · {record.startedBy}</Text>}{record?.readyAt && <Text style={styles.helperText}>{t('Pronto')}: {new Date(record.readyAt).toLocaleString(locale)} · {record.readyBy}</Text>}{record?.completedAt && <Text style={styles.helperText}>{t('Finalizado')}: {new Date(record.completedAt).toLocaleString(locale)} · {record.completedBy}</Text>}{timing.preparationSeconds !== null && <Text style={styles.helperText}>{t('Tempo de preparo')}: {(timing.preparationSeconds / 60).toLocaleString(locale, { maximumFractionDigits: 1 })} min</Text>}</View>; })()}
    </ScrollView><View style={board.actions}>{canReprint && <Pressable accessibilityRole="button" disabled={printing} style={board.action} onPress={() => { setDetailId(null); reprint(detail); }}><Text style={board.actionText}>{t('Reimprimir')}</Text></Pressable>}{state(detail.id) !== 'completed' && <Pressable accessibilityRole="button" disabled={busy} style={[board.action, board.advance]} onPress={() => advance(detail.id)}><Text style={board.advanceText}>{t('Alterar status')}</Text></Pressable>}</View></>}</View></View></Modal>
  </View>;
}
const board = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 10, paddingTop: 4, gap: 6 }, toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, queueTitle: { flex: 1, minWidth: 110 }, title: { color: COLORS.ink, fontSize: 16, fontWeight: '800', flexShrink: 1 }, caption: { color: COLORS.muted, fontSize: 11 }, viewport: { flex: 1, minHeight: 0 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' }, card: { borderWidth: 1, borderTopWidth: 5, borderColor: COLORS.border, borderRadius: 8, padding: 8, backgroundColor: COLORS.surface, gap: 4, overflow: 'hidden' }, row: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between' }, orderNumber: { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.ink }, status: { fontSize: 12, fontWeight: '700', flexShrink: 1 }, meta: { fontSize: 11, color: COLORS.muted }, itemPreview: { flex: 1, overflow: 'hidden', gap: 2 }, item: { fontSize: 13, color: COLORS.ink, fontWeight: '600' }, late: { color: '#AE4328', fontWeight: '700', fontSize: 11 }, actions: { flexDirection: 'row', gap: 4 }, action: { minHeight: 44, flex: 1, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.greenSoft, borderRadius: 6 }, actionText: { fontSize: 12, fontWeight: '700', color: COLORS.green, textAlign: 'center', flexShrink: 1 }, advance: { backgroundColor: COLORS.green }, advanceText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' }, smallButton: { minWidth: 44, minHeight: 44, paddingHorizontal: 9, borderRadius: 7, backgroundColor: COLORS.greenSoft, justifyContent: 'center', alignItems: 'center' }, newButton: { minHeight: 44, paddingHorizontal: 8, backgroundColor: '#FFE7A9', borderRadius: 7, justifyContent: 'center' }, pagination: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', paddingBottom: 4 }, backdrop: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0008' }, modal: { width: '100%', maxWidth: 760, maxHeight: '94%', backgroundColor: '#fff', padding: 16, borderRadius: 14, gap: 12 }, filterButton: { minHeight: 44, padding: 12, backgroundColor: COLORS.greenSoft, borderRadius: 8, marginVertical: 5, justifyContent: 'center' }, detailItems: { gap: 12 }, detailItem: { paddingBottom: 10, borderBottomWidth: 1, borderColor: COLORS.border, gap: 5 },
});
