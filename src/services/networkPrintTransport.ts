export type NetworkPrinterAddress = { address: string; port: string };

export function getNetworkPrinterEndpoint(settings: NetworkPrinterAddress) {
  const host = settings.address?.trim() || '';
  const parts = host.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    throw Object.assign(new Error('Informe um endereço IP válido para a impressora.'), { code: 'PRINT_INVALID_ADDRESS' });
  }
  const portText = settings.port?.trim() || '9100';
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || port < 1 || port > 65535) {
    throw Object.assign(new Error('Informe uma porta de rede entre 1 e 65535.'), { code: 'PRINT_INVALID_PORT' });
  }
  return { host: parts.map(Number).join('.'), port };
}

// Both react-native-tcp-socket and Node net.Socket implement this subset.
export type PrinterSocket = {
  on(event: 'connect' | 'error' | 'close', listener: () => void): unknown;
  connect(options: { host: string; port: number; connectTimeout: number }): unknown;
  write(data: Uint8Array, encoding: undefined, callback: (error?: Error) => void): unknown;
  end(): unknown;
  destroy(): unknown;
};

export function createNetworkPrinterSender(createSocket: () => PrinterSocket, timeoutMs = 15000) {
  return async (data: Uint8Array, settings: NetworkPrinterAddress) => {
    const endpoint = getNetworkPrinterEndpoint(settings);
    await new Promise<void>((resolve, reject) => {
      let socket: PrinterSocket | undefined;
      let finished = false;
      let writing = false;
      const failCode = () => writing ? 'PRINT_DELIVERY_UNKNOWN' : 'PRINT_NETWORK_FAILED';
      const finish = (code?: string) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { if (code) socket?.destroy(); else socket?.end(); } catch { /* Already closed. */ }
        if (code) reject(Object.assign(new Error(code), { code }));
        else resolve();
      };
      // Destroy on expiry before releasing the shared print lock. Never retry a
      // potentially delivered receipt automatically.
      const timer = setTimeout(() => finish('PRINT_TIMEOUT'), timeoutMs);
      try {
        socket = createSocket();
        socket.on('error', () => finish(failCode()));
        socket.on('close', () => finish(failCode()));
        socket.on('connect', () => {
          if (finished) return;
          try {
            writing = true;
            socket!.write(data, undefined, error => finish(error ? failCode() : undefined));
          } catch { finish(failCode()); }
        });
        socket.connect({ ...endpoint, connectTimeout: Math.min(timeoutMs, 10000) });
      } catch { finish(failCode()); }
    });
  };
}
