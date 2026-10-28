import { useAppearance } from '../ui/AppearanceContext';
import { useAppRole } from '../ui/useAppRole';
import { useState } from 'react';
import { useStoreModules } from '../ui/useStoreModules';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../state/AuthContext';
import { Text, useWindowDimensions, View } from '../ui/ThemedNative';
import { KeyboardPressable as Pressable } from '../ui/KeyboardControls';
import { router } from 'expo-router';
import { useApp } from '../state/AppContext';
import { NavigationIcon } from '../ui/NavigationIcon';
import { ScreenFrame } from '../ui/ScreenFrame';
import { styles, navigationTabs, ROUTES, COLORS } from '../ui/theme';

export default function HomeScreen() {
  const { theme } = useAppearance();
  const { logout } = useAuth();
  const { t, language } = useLanguage();
  const { width, height, fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(0);
  const { history, isWide } = useApp();
  const modules = useStoreModules();
  const role = useAppRole();
  const large = width >= 1000 && height >= 700, tablet = width >= 700 && height >= 600;
  const shortcutSize = width > height ? large ? 32 : tablet ? 28 : 25 : isWide ? 22 : 25;
  const badgeSize = width > height ? large ? 56 : tablet ? 48 : 40 : isWide ? 32 : 40;
  const columns = width < 360 || fontScale >= 1.4 ? 1 : isWide ? 4 : 2;
  const tileWidth = gridWidth ? Math.floor((gridWidth - 12 * (columns - 1)) / columns * 100) / 100 : undefined;
  const layoutKey = `${tileWidth}:${fontScale}:${language}:${isWide}:${shortcutSize}`;
  const [tileContent, setTileContent] = useState({ key: '', height: 0 });
  // Measure natural content, rather than the stretched card, so every row uses
  // the same height without clipping translations or enlarged system text.
  const tileHeight = tileContent.key === layoutKey ? tileContent.height + (isWide ? 26 : 30) : undefined;
  return <ScreenFrame><View>
                  <View style={[styles.hero, isWide && styles.heroWide, theme === 'dark' && { backgroundColor: 'transparent' }]}>
                    <Text style={styles.heroEyebrow}>{t("BOM ATENDIMENTO COMEÇA AQUI")}</Text>
                    <Text style={[styles.heroTitle, isWide && styles.heroTitleWide]}>{t("Tudo pronto para o próximo pedido.")}</Text>
                    <Text style={styles.heroDescription}>{t("Monte a comanda, confira os detalhes e envie para a cozinha.")}</Text>
                    <Pressable onPress={() => router.navigate('/order')} accessibilityRole="button" style={({ pressed }) => [styles.heroButton, isWide && styles.heroButtonWide, pressed && styles.pressed]}>
                      <Text style={styles.heroButtonText}>{t("Iniciar pedido")}</Text><Text style={styles.heroArrow}>→</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.sectionTitle, isWide && styles.sectionTitleWide]}>{t("Acesso rápido")}</Text>
                  <View style={styles.mainMenu} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
                    {navigationTabs(modules, role).filter((tab) => tab.screen !== 'home').map((tab) => (
                      <Pressable testID={'home-module-' + tab.screen} key={tab.screen} onPress={() => router.navigate(ROUTES[tab.screen])} accessibilityRole="button" style={({ pressed }) => [styles.mainMenuButton, isWide && styles.mainMenuButtonWide, columns === 1 && styles.mainMenuButtonCompact, tileWidth !== undefined && { flexBasis: tileWidth, flexGrow: 0 }, { minHeight: tileHeight }, pressed && styles.pressed]}>
                        <View key={layoutKey} onLayout={event => {
                          const height = Math.ceil(event.nativeEvent.layout.height);
                          setTileContent(previous => previous.key === layoutKey && previous.height >= height ? previous : { key: layoutKey, height: Math.max(height, previous.key === layoutKey ? previous.height : 0) });
                        }}>
                        <View style={[styles.menuIconBadge, isWide && styles.menuIconBadgeWide, { width: badgeSize, height: badgeSize }]}><NavigationIcon variant="shortcut" icon={tab.icon} size={shortcutSize} color={COLORS.primary} /></View>
                        <Text style={styles.mainMenuTitle}>{tab.screen === 'printer' ? t("Configurações") : t(['preparation', 'customers'].includes(tab.screen) ? tab.title : tab.label)}</Text>
                        <Text style={styles.mainMenuHint}>{tab.screen === 'history' ? history.length + (history.length === 1 ? t(" pedido salvo") : t(" pedidos salvos")) : t(tab.hint)}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.homeFooter}><Text style={styles.homeFooterText}>{t("Seu cardápio e seu histórico ficam salvos neste aparelho.")}</Text></View>
                  <Pressable style={styles.cancelButton} onPress={logout}><Text style={styles.cancelButtonText}>{t('Sair do sistema')}</Text></Pressable>
                </View></ScreenFrame>;
}
