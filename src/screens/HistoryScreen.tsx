import { useLanguage } from '../i18n/LanguageContext';
import { useState } from 'react';
import { itemName, translatedNote } from '../i18n/translations';
import { describeExtra } from '../../orderItems';
import { cloud } from '../services/cloudStorage';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles } from '../ui/theme';

export default function HistoryScreen() {
  const { t, locale, language } = useLanguage();
  const { history, printSavedOrder } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return <ScreenFrame><View>
                  <Text style={styles.settingsIntro}>{t("Consulte suas comandas e reimprima quando precisar.")}</Text>
                  {history.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t("Seu histórico começa aqui")}</Text><Text style={styles.emptyText}>{t("As comandas salvas aparecerão nesta tela.")}</Text></View> : history.map((order) => <View key={order.id} style={styles.historyCard}>
                    <View style={styles.historySummary}>
                      <View style={styles.historyPrimary}><Text style={styles.cardTitle}>{t("Plaquinha")} {order.plate}</Text><Text style={styles.mutedText} numberOfLines={1}>{order.customer || t("Cliente não informado")}</Text></View>
                      <Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleString(locale)}</Text>
                      <Text style={styles.historyCount}>{order.items.length} {order.items.length === 1 ? t("item") : t("itens")}</Text>
                      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedId === order.id }} style={styles.addButton} onPress={() => setExpandedId(expandedId === order.id ? null : order.id)}><Text style={styles.addButtonText}>{t(expandedId === order.id ? 'Ocultar detalhes' : 'Ver detalhes')}</Text></Pressable>
                    </View>
                    {expandedId === order.id && <View style={styles.historyDetails}>
                      <Text style={styles.mutedText}>{t('Cliente')}: {order.customer || t('Cliente não informado')}</Text>
                      <View style={styles.historyMeta}><Text style={styles.helperText}>{t(cloud.pending('order:' + order.id) ? 'Pendente de sincronização' : 'Salvo no servidor')}</Text>{order.tabletId && <Text style={styles.helperText}>{t('Tablet')}: {order.tabletId.slice(0, 8)}</Text>}</View>
                      {order.items.map((item, index) => <View key={`${item.id}-${index}`} style={{ gap: 4 }}>
                        <Text style={styles.cardTitle}>{item.quantity} × {itemName(item.name, language)}</Text>
                        {item.flavors?.map((flavor, flavorIndex) => <Text key={flavorIndex} style={styles.mutedText}>{item.flavors!.length > 1 ? '½ ' : ''}{flavor}</Text>)}
                        {item.extras?.map((extra, extraIndex) => <Text key={extraIndex} style={styles.mutedText}>+ {describeExtra(extra, item.flavors, language)}</Text>)}
                        {!!item.note && <Text style={styles.mutedText}>{t('Observações')}: {translatedNote(item.note, language)}</Text>}
                      </View>)}
                    <View style={styles.historyActions}>
                      <Pressable style={styles.addButton} onPress={() => printSavedOrder(order)}><Text style={styles.addButtonText}>{t("Reimprimir")}</Text></Pressable>
                    </View>
                    </View>}
                  </View>)}
                </View></ScreenFrame>;
}
