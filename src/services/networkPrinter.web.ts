import type { NetworkPrinterAddress } from './networkPrintTransport';
export async function sendNetworkReceipt(_data: Uint8Array, _settings: NetworkPrinterAddress): Promise<void> {
  throw Object.assign(new Error('A impressão pela rede exige o aplicativo atualizado instalado no aparelho.'), { code: 'PRINT_NETWORK_UNAVAILABLE' });
}
