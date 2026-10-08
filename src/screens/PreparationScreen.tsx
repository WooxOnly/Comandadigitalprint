import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { cloud } from '../services/cloudStorage';
import { useApp } from '../state/AppContext';
import { useBusiness } from '../state/BusinessContext';
import { useLanguage } from '../i18n/LanguageContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { KeyboardPressable as Pressable, KeyboardTextInput as TextInput } from '../ui/KeyboardControls';
import { styles } from '../ui/theme';
import { agendaWindow, localDayText, shiftAgenda } from '../services/preorderAgenda';
import type { Preparation } from '../services/business';
import { describeExtra } from '../../orderItems';
import { orderNumberLabel } from '../services/orderNumber';
import { useKitchenAlerts } from '../ui/useKitchenAlerts';
import { preparationDurations } from '../../shared/preparation-times.mjs';
const statuses = ['received', 'preparing', 'ready', 'completed'] as const;
const labels = { received: 'Recebido', preparing: 'Em preparo', ready: 'Pronto', completed: 'Finalizado' };
export default function PreparationScreen() {
  const { modules, preparation, advancePreparation, busy } = useBusiness(), { history } = useApp(), { t, locale, language } = useLanguage();
  const [date, setDate] = useState(() => localDayText(new Date())), [now, setNow] = useState(Date.now), [showCompleted, setShowCompleted] = useState(false), [delay, setDelay] = useState('20');
  const today = agendaWindow(localDayText(new Date(now)), 'day');
  const alerts = useKitchenAlerts(modules.preparation, history.filter(order => Date.parse(order.createdAt) >= today.start && Date.parse(order.createdAt) < today.end));
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(interval); }, []);
  let window: ReturnType<typeof agendaWindow> | null = null; try { window = agendaWindow(date, 'day'); } catch {}
  if (!modules.preparation) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Módulo não habilitado para esta empresa.')}</Text></ScreenFrame>;
  const state = (id: string): Preparation['status'] => preparation.find(record => record.orderId === id)?.status ?? 'received';
  const orders = history.filter(order => window && Date.parse(order.createdAt) >= window.start && Date.parse(order.createdAt) < window.end && (showCompleted || state(order.id) !== 'completed')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return <ScreenFrame><View style={{ gap: 12 }}><Text style={styles.settingsIntro}>{t('Acompanhe o preparo das comandas sem alterar seus itens ou impressão.')}</Text>
    <View style={styles.quickNotes}><Pressable style={styles.noteChip} onPress={() => void alerts.toggleSound().catch(e => Alert.alert(t('Falha ao salvar'), t(e.message)))}><Text style={styles.noteChipText}>{t(alerts.sound ? 'Som de pedido novo: ligado' : 'Som de pedido novo: desligado')}</Text></Pressable><Pressable style={styles.noteChip} onPress={() => void alerts.testSound()}><Text style={styles.noteChipText}>{t('Testar som')}</Text></Pressable></View>
    <Text style={styles.helperText}>{t('Mantenha este painel aberto para receber avisos de novos pedidos.')}</Text>
    {alerts.unread.length > 0 && <Pressable style={styles.secondaryWideButton} onPress={() => { setDate(localDayText(new Date())); alerts.acknowledge(); }}><Text style={styles.secondaryButtonText}>{t('Novos pedidos')}: {alerts.unread.length} · {t('Ver e confirmar recebimento')}</Text></Pressable>}
    <TextInput value={date} onChangeText={setDate} maxLength={10} style={styles.input} accessibilityLabel={t('Data (AAAA-MM-DD)')} />
    <View style={styles.quickNotes}>{[-1, 1].map(step => <Pressable key={step} disabled={!window} style={styles.noteChip} onPress={() => setDate(shiftAgenda(date, step))}><Text style={styles.noteChipText}>{t(step < 0 ? 'Dia anterior' : 'Próximo dia')}</Text></Pressable>)}<Pressable style={styles.noteChip} onPress={() => setShowCompleted(!showCompleted)}><Text style={styles.noteChipText}>{t(showCompleted ? 'Ocultar finalizados' : 'Mostrar finalizados')}</Text></Pressable></View>
    {!window && <Text style={styles.errorText}>{t('Informe a data em AAAA-MM-DD.')}</Text>}
    <Text style={styles.fieldLabel}>{t('Destacar atraso após (minutos)')}</Text><TextInput value={delay} onChangeText={setDelay} maxLength={3} keyboardType="number-pad" style={styles.input} accessibilityLabel={t('Destacar atraso após (minutos)')} />
    <Pressable style={styles.secondaryWideButton} onPress={() => void cloud.sync()}><Text style={styles.secondaryButtonText}>{t('Atualizar pedidos')}</Text></Pressable>
    {orders.map(order => { const record = preparation.find(value => value.orderId === order.id), current = state(order.id), timing = preparationDurations(order, record), minutes = current === 'ready' || current === 'completed' ? timing.totalSeconds === null ? null : Math.floor(timing.totalSeconds / 60) : Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000)), late = ['received', 'preparing'].includes(current) && /^\d{1,3}$/.test(delay) && Number(delay) > 0 && minutes !== null && minutes >= Number(delay); const next = statuses[statuses.indexOf(current) + 1];
      return <View key={order.id} style={styles.historyCard}><Text style={late ? styles.errorText : styles.cardTitle}>{orderNumberLabel(order) || order.plate} · {t(labels[current])} · {minutes === null ? t('Tempo não registrado') : `${minutes} min`}{late ? ` · ${t('Atrasado')}` : ''}</Text><Text style={styles.mutedText}>{t('Mesa')} {order.plate} · {order.customer} · {new Date(order.createdAt).toLocaleTimeString(locale)}</Text>
        {alerts.unread.includes(order.id) && <Text style={styles.errorText}>{t('Pedido novo')}</Text>}
        {record && <Text style={styles.helperText}>{[record.startedAt && `${t('Início do preparo')}: ${new Date(record.startedAt).toLocaleTimeString(locale)}${record.startedBy ? ` (${record.startedBy})` : ''}`, record.readyAt && `${t('Pronto')}: ${new Date(record.readyAt).toLocaleTimeString(locale)}${record.readyBy ? ` (${record.readyBy})` : ''}`, record.completedAt && `${t('Finalizado')}: ${new Date(record.completedAt).toLocaleTimeString(locale)}${record.completedBy ? ` (${record.completedBy})` : ''}`].filter(Boolean).join(' · ')}</Text>}
        {timing.preparationSeconds !== null && <Text style={styles.helperText}>{t('Tempo de preparo')}: {(timing.preparationSeconds / 60).toLocaleString(locale, { maximumFractionDigits: 1 })} min · {t('Tempo até pronto')}: {timing.totalSeconds === null ? '—' : (timing.totalSeconds / 60).toLocaleString(locale, { maximumFractionDigits: 1 })} min</Text>}
        {order.items.map(item => <Text key={item.id} style={styles.cardTitle}>{item.quantity}x {item.name}{item.flavors ? '\n' + item.flavors.join(' / ') : ''}{item.extras?.length ? '\n' + item.extras.map(extra => '+ ' + describeExtra(extra, item.flavors, language)).join(', ') : ''}{item.note ? '\n' + item.note : ''}</Text>)}
        {next && <Pressable disabled={busy} style={styles.sendButton} onPress={() => Alert.alert(t('Alterar status'), t(labels[next]), [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void advancePreparation(order.id, next).then(() => alerts.acknowledge(order.id)).catch(e => Alert.alert(t('Falha ao salvar'), t(e.message))); } }])}><Text style={styles.sendButtonText}>{t(labels[next])}</Text></Pressable>}
        {cloud.pending('preparation:' + order.id) && <Text style={styles.helperText}>{t('Pendente de sincronização')}</Text>}
      </View>;
    })}
    {!orders.length && <Text style={styles.emptyText}>{t('Nenhuma comanda neste período.')}</Text>}
  </View></ScreenFrame>;
}
