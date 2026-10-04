import { useLanguage } from '../i18n/LanguageContext';
import { router } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';
import { KeyboardPressable as Pressable } from '../ui/KeyboardControls';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles } from '../ui/theme';
import { orderNumberLabel } from '../services/orderNumber';

export default function HistoryScreen() {
  const { t, locale } = useLanguage();
  const { history, printSavedOrder } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  return <ScreenFrame><View>
                  <Text style={styles.settingsIntro}>{t("Consulte suas comandas e reimprima quando precisar.")}</Text>
                  {history.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t("Seu histórico começa aqui")}</Text><Text style={styles.emptyText}>{t("As comandas salvas aparecerão nesta tela.")}</Text></View> : history.map((order) => <View key={order.id} style={styles.historyCard}>
                    <View style={styles.historySummary}>
                      <View style={styles.historyPrimary}><Text style={styles.cardTitle} numberOfLines={1}>{orderNumberLabel(order) ? `${t('Pedido nº')} ${orderNumberLabel(order)}` : `${t('Mesa')} ${order.plate}`}</Text><Text style={styles.mutedText} numberOfLines={1}>{orderNumberLabel(order) ? `${t('Mesa')} ${order.plate} · ` : ''}{order.customer || t("Cliente não informado")}{compact ? ` · ${order.items.length} ${order.items.length === 1 ? t('item') : t('itens')}` : ''}</Text></View>
                      {!compact && <Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleString(locale)}</Text>}
                      {!compact && <Text style={styles.historyCount}>{order.items.length} {order.items.length === 1 ? t("item") : t("itens")}</Text>}
                      <View style={styles.historyInlineActions}>
                        <Pressable accessibilityRole="button" accessibilityLabel={t('Ver detalhes')} style={[styles.addButton, compact && styles.historyIconButton]} onPress={() => router.push({ pathname: '/history/[id]', params: { id: order.id } })}><Text style={[styles.addButtonText, compact && styles.historyIconText]}>{compact ? '⋯' : t('Ver detalhes')}</Text></Pressable>
                        <Pressable accessibilityRole="button" accessibilityLabel={t('Reimprimir')} style={[styles.addButton, compact && styles.historyIconButton]} onPress={() => printSavedOrder(order)}><Text style={[styles.addButtonText, compact && styles.historyIconText]}>{compact ? '↻' : t('Reimprimir')}</Text></Pressable>
                      </View>
                    </View>
                  </View>)}
                </View></ScreenFrame>;
}
