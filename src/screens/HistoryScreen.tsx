import { Pressable, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles } from '../ui/theme';

export default function HistoryScreen() {
  const { history, printSavedOrder } = useApp();
  return <ScreenFrame><View>
                  <Text style={styles.settingsIntro}>Consulte suas comandas e reimprima quando precisar.</Text>
                  {history.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Seu histórico começa aqui</Text><Text style={styles.emptyText}>As comandas salvas aparecerão nesta tela.</Text></View> : history.map((order) => <View key={order.id} style={styles.historyCard}>
                    <View style={styles.productInfo}><Text style={styles.cardTitle}>Plaquinha {order.plate}</Text><Text style={styles.mutedText}>{order.customer || 'Cliente não informado'}</Text><Text style={styles.mutedText}>{new Date(order.createdAt).toLocaleString('pt-BR')}</Text><Text style={styles.priceText}>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</Text></View>
                    <Pressable style={styles.addButton} onPress={() => printSavedOrder(order)}><Text style={styles.addButtonText}>Reimprimir</Text></Pressable>
                  </View>)}
                </View></ScreenFrame>;
}
