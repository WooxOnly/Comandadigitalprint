import { useAppRole } from '../ui/useAppRole';
import { useStoreModules } from '../ui/useStoreModules';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../state/AuthContext';
import { Text, useWindowDimensions, View } from 'react-native';
import { KeyboardPressable as Pressable } from '../ui/KeyboardControls';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { NavigationIcon } from '../ui/NavigationIcon';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, navigationTabs, ROUTES, COLORS } from '../ui/theme';

export default function HomeScreen() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const { width, fontScale } = useWindowDimensions();
  const { history, isWide } = useApp();
  const modules = useStoreModules();
  const role = useAppRole();
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
                    {navigationTabs(modules, role).filter((tab) => tab.screen !== 'home').map((tab) => (
                      <Pressable testID={'home-module-' + tab.screen} key={tab.screen} onPress={() => router.navigate(ROUTES[tab.screen])} accessibilityRole="button" style={({ pressed }) => [styles.mainMenuButton, isWide && styles.mainMenuButtonWide, (width < 360 || fontScale >= 1.4) && styles.mainMenuButtonCompact, pressed && styles.pressed]}>
                        <View style={[styles.menuIconBadge, isWide && styles.menuIconBadgeWide]}><NavigationIcon icon={tab.icon} size={isWide ? 22 : 25} color={COLORS.primary} /></View>
                        <Text style={styles.mainMenuTitle}>{tab.screen === 'printer' ? t("Configurações") : t(['preparation', 'customers'].includes(tab.screen) ? tab.title : tab.label)}</Text>
                        <Text style={styles.mainMenuHint}>{tab.screen === 'history' ? history.length + (history.length === 1 ? t(" pedido salvo") : t(" pedidos salvos")) : t(tab.hint)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.homeFooter}><Text style={styles.homeFooterText}>{t("Seu cardápio e seu histórico ficam salvos neste aparelho.")}</Text></View>
                  <Pressable style={styles.cancelButton} onPress={logout}><Text style={styles.cancelButtonText}>{t('Sair do sistema')}</Text></Pressable>
                </View></ScreenFrame>;
}
