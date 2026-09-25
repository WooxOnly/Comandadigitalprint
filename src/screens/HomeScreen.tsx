import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, TABS, ROUTES } from '../ui/theme';

export default function HomeScreen() {
  const { history, isWide } = useApp();
  return <ScreenFrame><View>
                  <View style={styles.hero}>
                    <Text style={styles.heroEyebrow}>BOM ATENDIMENTO COMEÇA AQUI</Text>
                    <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>Tudo pronto para o próximo pedido.</Text>
                    <Text style={styles.heroDescription}>Monte a comanda, confira os detalhes e envie para a cozinha.</Text>
                    <Pressable onPress={() => router.navigate('/order')} accessibilityRole="button" style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
                      <Text style={styles.heroButtonText}>Iniciar pedido</Text><Text style={styles.heroArrow}>→</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.sectionTitle}>Acesso rápido</Text>
                  <View style={styles.mainMenu}>
                    {TABS.filter((tab) => tab.screen !== 'home').map((tab) => (
                      <Pressable key={tab.screen} onPress={() => router.navigate(ROUTES[tab.screen])} accessibilityRole="button" style={({ pressed }) => [styles.mainMenuButton, isWide && styles.mainMenuButtonWide, pressed && styles.pressed]}>
                        <View style={styles.menuIconBadge}><Text style={styles.mainMenuIcon}>{tab.icon}</Text></View>
                        <Text style={styles.mainMenuTitle}>{tab.screen === 'printer' ? 'Configurações' : tab.label}</Text>
                        <Text style={styles.mainMenuHint}>{tab.screen === 'history' ? history.length + (history.length === 1 ? ' pedido salvo' : ' pedidos salvos') : tab.hint}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.homeFooter}><Text style={styles.homeFooterText}>Seu cardápio e seu histórico ficam salvos neste aparelho.</Text></View>
                </View></ScreenFrame>;
}
