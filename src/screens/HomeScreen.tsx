import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../state/AuthContext';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, TABS, ROUTES } from '../ui/theme';

export default function HomeScreen() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const { history, isWide } = useApp();
  return <ScreenFrame><View>
                  <View style={[styles.hero, isWide && styles.heroWide]}>
                    <Text style={styles.heroEyebrow}>{t("BOM ATENDIMENTO COMEÇA AQUI")}</Text>
                    <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>{t("Tudo pronto para o próximo pedido.")}</Text>
                    <Text style={styles.heroDescription}>{t("Monte a comanda, confira os detalhes e envie para a cozinha.")}</Text>
                    <Pressable onPress={() => router.navigate('/order')} accessibilityRole="button" style={({ pressed }) => [styles.heroButton, isWide && styles.heroButtonWide, pressed && styles.pressed]}>
                      <Text style={styles.heroButtonText}>{t("Iniciar pedido")}</Text><Text style={styles.heroArrow}>→</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>{t("Acesso rápido")}</Text>
                  <View style={styles.mainMenu}>
                    {TABS.filter((tab) => tab.screen !== 'home').map((tab) => (
                      <Pressable key={tab.screen} onPress={() => router.navigate(ROUTES[tab.screen])} accessibilityRole="button" style={({ pressed }) => [styles.mainMenuButton, isWide && styles.mainMenuButtonWide, pressed && styles.pressed]}>
                        <View style={[styles.menuIconBadge, isWide && styles.menuIconBadgeWide]}><Text style={[styles.mainMenuIcon, isWide && styles.mainMenuIconWide]}>{tab.icon}</Text></View>
                        <Text style={styles.mainMenuTitle}>{tab.screen === 'printer' ? t("Configurações") : t(tab.label)}</Text>
                        <Text style={styles.mainMenuHint}>{tab.screen === 'history' ? history.length + (history.length === 1 ? t(" pedido salvo") : t(" pedidos salvos")) : t(tab.hint)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.homeFooter}><Text style={styles.homeFooterText}>{t("Seu cardápio e seu histórico ficam salvos neste aparelho.")}</Text></View>
                  <Pressable style={styles.cancelButton} onPress={logout}><Text style={styles.cancelButtonText}>{t('Sair do sistema')}</Text></Pressable>
                </View></ScreenFrame>;
}
