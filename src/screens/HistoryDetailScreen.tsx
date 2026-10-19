import { router, useLocalSearchParams } from 'expo-router';
import { Text, View, useWindowDimensions } from '../ui/ThemedNative';
import { KeyboardPressable as Pressable } from '../ui/KeyboardControls';
import { describeExtra } from '../../orderItems';
import { useLanguage } from '../i18n/LanguageContext';
import { itemName, translatedNote } from '../i18n/translations';
import { cloud } from '../services/cloudStorage';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles } from '../ui/theme';
import { useBusiness } from '../state/BusinessContext';
import { historyPreparation } from '../services/historyPreparation';
import { HistoryPreparationTimeline } from '../ui/HistoryPreparation';
import { orderNumberLabel } from '../services/orderNumber';

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history } = useApp();
  const { t, locale, language } = useLanguage();
  const { preparation, modules } = useBusiness();
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = width / fontScale >= 850;
  const order = history.find((entry) => entry.id === id);
  const summary = order && historyPreparation(order.createdAt, preparation.find(record => record.orderId === order.id), modules.preparation);
  return <ScreenFrame><View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 12 }}>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/history')} style={styles.addButton}><Text style={styles.addButtonText}>← {t('Voltar')}</Text></Pressable>
    {!order ? <View style={styles.panel}><Text style={styles.mutedText}>{t('Pedido não encontrado.')}</Text></View> : <View style={[styles.panel, { gap: 10 }]}>
      <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: 20 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <Text style={styles.panelTitle}>{orderNumberLabel(order) ? `${t('Pedido nº')} ${orderNumberLabel(order)}` : `${t('Mesa')} ${order.plate}`}</Text>
          {orderNumberLabel(order) && <Text style={styles.cardTitle}>{t('Mesa')} {order.plate}</Text>}
          <Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleString(locale)} · {order.items.length} {order.items.length === 1 ? t('item') : t('itens')}</Text>
          {order.serviceMode && <Text style={styles.cardTitle}>{t('Tipo de pedido')}: {t(order.serviceMode === 'dine_in' ? 'Para comer aqui' : 'Para levar')}</Text>}
          <Text style={styles.mutedText}>{t('Cliente')}: {order.customer || t('Cliente não informado')}</Text>
          <View style={styles.historyMeta}><Text style={styles.helperText}>{t(cloud.pending('order:' + order.id) ? 'Pendente de sincronização' : 'Salvo no servidor')}</Text>{order.tabletId && <Text style={styles.helperText}>{t('Tablet')}: {order.tabletId.slice(0, 8)}</Text>}</View>
        </View>
        {summary && <View style={{ flex: sideBySide ? 1 : undefined, minWidth: 0 }}><HistoryPreparationTimeline summary={summary} /></View>}
      </View>
      {order.items.map((item, index) => <View key={`${item.id}-${index}`} style={styles.historyDetailItem}>
        <Text style={styles.cardTitle}>{item.quantity} × {itemName(item.name, language)}</Text>
        {item.flavors?.map((flavor, flavorIndex) => <Text key={flavorIndex} style={styles.mutedText}>{item.flavors!.length > 1 ? '½ ' : ''}{flavor}</Text>)}
        {item.extras?.map((extra, extraIndex) => <Text key={extraIndex} style={styles.mutedText}>+ {describeExtra(extra, item.flavors, language)}</Text>)}
        {!!item.note && <Text style={styles.mutedText}>{t('Observações')}: {translatedNote(item.note, language)}</Text>}
      </View>)}
    </View>}
  </View></ScreenFrame>;
}
