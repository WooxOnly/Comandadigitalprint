import { LanguageProvider, useLanguage } from '../i18n/LanguageContext';
import { AuthProvider } from '../state/AuthContext';
import { LoginGate } from '../ui/AccessGate';
import { Tabs } from 'expo-router';
import { AppProvider } from '../state/AppContext';
import { AppShell } from '../ui/AppShell';
import { COLORS } from '../ui/theme';

export default function RootLayout() {
  return <LanguageProvider><AuthProvider><AppProvider><LoginGate><Navigation /></LoginGate></AppProvider></AuthProvider></LanguageProvider>;
}
function Navigation() {
  const { t } = useLanguage();
  return <AppShell>
    <Tabs initialRouteName="index" backBehavior="initialRoute" tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.background } }}>
      <Tabs.Screen name="index" options={{ title: t('Início') }} />
      <Tabs.Screen name="order" options={{ title: t('Pedido') }} />
      <Tabs.Screen name="menu" options={{ title: t('Cardápio') }} />
      <Tabs.Screen name="history" options={{ title: t('Histórico') }} />
      <Tabs.Screen name="printer" options={{ title: t('Configurações') }} />
    </Tabs>
  </AppShell>;
}
