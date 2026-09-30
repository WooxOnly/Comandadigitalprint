export function printFailureMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'PRINT_BUSY') return 'Já existe uma impressão em andamento.';
  if (code === 'PRINT_TIMEOUT') return 'A impressão não respondeu. Confira a impressora antes de tentar novamente pelo histórico.';
  if (code === 'PRINT_UNSUPPORTED_CONNECTION') return 'Conexão direta indisponível. Use a impressão pelo sistema.';
  return 'Não foi possível iniciar a impressão.';
}

export function createPrintJob(timeoutMs = 30000) {
  let busy = false;
  return async function run<T>(action: () => Promise<T>): Promise<T> {
    if (busy) throw Object.assign(new Error('Já existe uma impressão em andamento.'), { code: 'PRINT_BUSY' });
    busy = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([Promise.resolve().then(action), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('A impressão não respondeu. Confira a impressora antes de tentar novamente pelo histórico.'), { code: 'PRINT_TIMEOUT' })), timeoutMs);
      })]);
    } finally { clearTimeout(timer); busy = false; }
  };
}
