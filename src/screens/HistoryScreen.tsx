import { useLanguage } from '../i18n/LanguageContext';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles } from '../ui/theme';

export default function HistoryScreen() {
  const { t, locale } = useLanguage();
  const { history, printSavedOrder } = useApp();
  return <ScreenFrame><View>
                  <Text style={styles.settingsIntro}>{t("Consulte suas comandas e reimprima quando precisar.")}</Text>
                  {history.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>{t("Seu histórico começa aqui")}</Text><Text style={styles.emptyText}>{t("As comandas salvas aparecerão nesta tela.")}</Text></View> : history.map((order) => <View key={order.id} style={styles.historyCard}>
                    <View style={styles.productInfo}><Text style={styles.cardTitle}>{t("Plaquinha")} {order.plate}</Text><Text style={styles.mutedText}>{order.customer || t("Cliente não informado")}</Text><Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleString(locale)}</Text><Text style={styles.priceText}>{order.items.length} {order.items.length === 1 ? t("item") : t("itens")}</Text></View>
                    <Pressable style={styles.addButton} onPress={() => printSavedOrder(order)}><Text style={styles.addButtonText}>{t("Reimprimir")}</Text></Pressable>
                  </View>)}
                </View></ScreenFrame>;
}
