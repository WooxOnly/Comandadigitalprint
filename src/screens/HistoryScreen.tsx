import { useLanguage } from '../i18n/LanguageContext';
import { useCallback, useState } from 'react';
import { historyDateRange, historyInRange, type HistoryPeriod } from '../services/historyDates';
import { HistoryDateFilter } from '../ui/HistoryDateFilter';
import { router, useFocusEffect } from 'expo-router';
import { Text, useWindowDimensions, View } from '../ui/ThemedNative';
import { KeyboardPressable as Pressable } from '../ui/KeyboardControls';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles } from '../ui/theme';
import { orderNumberLabel } from '../services/orderNumber';
import { useBusiness } from '../state/BusinessContext';
import { historyPreparation } from '../services/historyPreparation';
import { HistoryPreparationBadge } from '../ui/HistoryPreparation';
import { useAccess } from '../ui/useAccess';

export default function HistoryScreen() {
  const { t, locale } = useLanguage();
  const { history, printSavedOrder } = useApp();
  const { preparation, modules } = useBusiness();
  const records = new Map(preparation.map(record => [record.orderId, record]));
  const [range, setRange] = useState(() => ({ period: 'today' as HistoryPeriod, ...historyDateRange('today') }));
  useFocusEffect(useCallback(() => { setRange({ period: 'today', ...historyDateRange('today') }); }, []));
  const filteredHistory = history.filter(order => historyInRange(order.createdAt, range));
  const canReprint = useAccess('reprint');
  const { width, fontScale } = useWindowDimensions();
  const compact = width / fontScale < 680;
  return <ScreenFrame><View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <Text style={[styles.settingsIntro, { flex: 1, marginBottom: 0 }]}>{t("Consulte suas comandas e reimprima quando precisar.")}</Text>
                    <HistoryDateFilter range={range} onApply={setRange} />
                  </View>
                  {history.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t("Seu histórico começa aqui")}</Text><Text style={styles.emptyText}>{t("As comandas salvas aparecerão nesta tela.")}</Text></View> : filteredHistory.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t('Nenhum pedido neste período.')}</Text><Text style={styles.emptyText}>{t('Altere o filtro de data para consultar outros pedidos.')}</Text></View> : filteredHistory.map((order) => {
                    const summary = historyPreparation(order.createdAt, records.get(order.id), modules.preparation);
                    return <View key={order.id} testID="history-order" style={styles.historyCard}>
                    <View style={styles.historySummary}>
                      <View style={[styles.historyPrimary, { gap: 5 }]}><Text style={styles.cardTitle} numberOfLines={1}>{orderNumberLabel(order) ? `${t('Pedido nº')} ${orderNumberLabel(order)}` : order.plate ? `${t('Mesa')} ${order.plate}` : t('Para levar')}</Text><Text style={styles.mutedText} numberOfLines={1}>{orderNumberLabel(order) ? (order.plate ? `${t('Mesa')} ${order.plate} · ` : `${t('Para levar')} · `) : ''}{order.customer || t("Cliente não informado")}{compact ? ` · ${order.items.length} ${order.items.length === 1 ? t('item') : t('itens')}` : ''}</Text>{summary && <HistoryPreparationBadge summary={summary} />}</View>
                      {!compact && <Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleString(locale)}</Text>}
                      {!compact && <Text style={styles.historyCount}>{order.items.length} {order.items.length === 1 ? t("item") : t("itens")}</Text>}
                      <View style={styles.historyInlineActions}>
                        <Pressable accessibilityRole="button" accessibilityLabel={t('Ver detalhes')} style={[styles.addButton, compact && styles.historyIconButton]} onPress={() => router.push({ pathname: '/history/[id]', params: { id: order.id } })}><Text style={[styles.addButtonText, compact && styles.historyIconText]}>{compact ? '⋯' : t('Ver detalhes')}</Text></Pressable>
                        <Pressable accessibilityRole="button" accessibilityLabel={t('Reimprimir')} disabled={!canReprint} accessibilityState={{ disabled: !canReprint }} style={[styles.addButton, compact && styles.historyIconButton, !canReprint && styles.pressed]} onPress={() => printSavedOrder(order)}><Text style={[styles.addButtonText, compact && styles.historyIconText]}>{compact ? '↻' : t('Reimprimir')}</Text></Pressable>
                      </View>
                    </View>
                  </View>; })}
                </View></ScreenFrame>;
}
