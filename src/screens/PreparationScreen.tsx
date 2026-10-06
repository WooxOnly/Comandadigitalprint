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
const statuses = ['received', 'preparing', 'ready', 'completed'] as const;
const labels = { received: 'Recebido', preparing: 'Em preparo', ready: 'Pronto', completed: 'Finalizado' };
export default function PreparationScreen() {
  const { modules, preparation, advancePreparation, busy } = useBusiness(), { history } = useApp(), { t, locale, language } = useLanguage();
  const [date, setDate] = useState(() => localDayText(new Date())), [now, setNow] = useState(Date.now), [showCompleted, setShowCompleted] = useState(false), [delay, setDelay] = useState('20');
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(interval); }, []);
  let window: ReturnType<typeof agendaWindow> | null = null; try { window = agendaWindow(date, 'day'); } catch {}
  if (!modules.preparation) return <ScreenFrame><Text style={styles.settingsIntro}>{t('Módulo não habilitado para esta empresa.')}</Text></ScreenFrame>;
  const state = (id: string): Preparation['status'] => preparation.find(record => record.orderId === id)?.status ?? 'received';
  const orders = history.filter(order => window && Date.parse(order.createdAt) >= window.start && Date.parse(order.createdAt) < window.end && (showCompleted || state(order.id) !== 'completed')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return <ScreenFrame><View style={{ gap: 12 }}><Text style={styles.settingsIntro}>{t('Acompanhe o preparo das comandas sem alterar seus itens ou impressão.')}</Text>
    <TextInput value={date} onChangeText={setDate} maxLength={10} style={styles.input} accessibilityLabel={t('Data (AAAA-MM-DD)')} />
    <View style={styles.quickNotes}>{[-1, 1].map(step => <Pressable key={step} disabled={!window} style={styles.noteChip} onPress={() => setDate(shiftAgenda(date, step))}><Text style={styles.noteChipText}>{t(step < 0 ? 'Dia anterior' : 'Próximo dia')}</Text></Pressable>)}<Pressable style={styles.noteChip} onPress={() => setShowCompleted(!showCompleted)}><Text style={styles.noteChipText}>{t(showCompleted ? 'Ocultar finalizados' : 'Mostrar finalizados')}</Text></Pressable></View>
    {!window && <Text style={styles.errorText}>{t('Informe a data em AAAA-MM-DD.')}</Text>}
    <Text style={styles.fieldLabel}>{t('Destacar atraso após (minutos)')}</Text><TextInput value={delay} onChangeText={setDelay} maxLength={3} keyboardType="number-pad" style={styles.input} accessibilityLabel={t('Destacar atraso após (minutos)')} />
    <Pressable style={styles.secondaryWideButton} onPress={() => void cloud.sync()}><Text style={styles.secondaryButtonText}>{t('Atualizar pedidos')}</Text></Pressable>
    {orders.map(order => { const current = state(order.id), minutes = Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60000)), late = ['received', 'preparing'].includes(current) && /^\d{1,3}$/.test(delay) && Number(delay) > 0 && minutes >= Number(delay); const next = statuses[statuses.indexOf(current) + 1];
      return <View key={order.id} style={styles.historyCard}><Text style={late ? styles.errorText : styles.cardTitle}>{orderNumberLabel(order) || order.plate} · {t(labels[current])} · {minutes} min{late ? ` · ${t('Atrasado')}` : ''}</Text><Text style={styles.mutedText}>{t('Mesa')} {order.plate} · {order.customer} · {new Date(order.createdAt).toLocaleTimeString(locale)}</Text>
        {order.items.map(item => <Text key={item.id} style={styles.cardTitle}>{item.quantity}x {item.name}{item.flavors ? '\n' + item.flavors.join(' / ') : ''}{item.extras?.length ? '\n' + item.extras.map(extra => '+ ' + describeExtra(extra, item.flavors, language)).join(', ') : ''}{item.note ? '\n' + item.note : ''}</Text>)}
        {next && <Pressable disabled={busy} style={styles.sendButton} onPress={() => Alert.alert(t('Alterar status'), t(labels[next]), [{ text: t('Cancelar') }, { text: t('Confirmar'), onPress: () => { void advancePreparation(order.id, next).catch(e => Alert.alert(t('Falha ao salvar'), t(e.message))); } }])}><Text style={styles.sendButtonText}>{t(labels[next])}</Text></Pressable>}
        {cloud.pending('preparation:' + order.id) && <Text style={styles.helperText}>{t('Pendente de sincronização')}</Text>}
      </View>;
    })}
    {!orders.length && <Text style={styles.emptyText}>{t('Nenhuma comanda neste período.')}</Text>}
  </View></ScreenFrame>;
}
