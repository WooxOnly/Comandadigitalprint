import { NativeModules, Platform } from 'react-native';
import { createNetworkPrinterSender, getNetworkPrinterEndpoint, type NetworkPrinterAddress } from './networkPrintTransport';

export async function sendNetworkReceipt(data: Uint8Array, settings: NetworkPrinterAddress) {
  getNetworkPrinterEndpoint(settings);
  if (Platform.OS === 'web' || !NativeModules.TcpSockets) {
    throw Object.assign(new Error('A impressão pela rede exige o aplicativo atualizado instalado no aparelho.'), { code: 'PRINT_NETWORK_UNAVAILABLE' });
  }
  // Load only when used: Expo Go and browser previews can still open the app.
  const { default: tcp } = await import('react-native-tcp-socket');
  await createNetworkPrinterSender(() => new tcp.Socket())(data, settings);
}
