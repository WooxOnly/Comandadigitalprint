export const PRINTER_SETTINGS_KEY = '@comandadigitalprint/printer-settings';

export function normalizeMenuUrl(value: string) {
  const text = value.trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error();
    return url.toString();
  } catch {
    throw new Error('Informe um endereço HTTPS válido, sem usuário, senha ou fragmento.');
  }
}

export async function persistSettings(storage: { setItem: (key: string, value: string) => Promise<void> }, printer: unknown) {
  await storage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(printer));
}
