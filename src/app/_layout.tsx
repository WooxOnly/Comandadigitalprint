import { Tabs } from 'expo-router';
import { AppProvider } from '../state/AppContext';
import { AppShell } from '../ui/AppShell';
import { COLORS } from '../ui/theme';

export default function RootLayout() {
  return <AppProvider><AppShell>
    <Tabs initialRouteName="index" backBehavior="initialRoute" tabBar={() => null} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="order" options={{ title: 'Pedido' }} />
      <Tabs.Screen name="menu" options={{ title: 'Cardápio' }} />
      <Tabs.Screen name="history" options={{ title: 'Histórico' }} />
      <Tabs.Screen name="printer" options={{ title: 'Configurações' }} />
    </Tabs>
  </AppShell></AppProvider>;
}
