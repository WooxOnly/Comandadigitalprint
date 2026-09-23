import * as Print from 'expo-print';

export type PrinterConnection = 'system' | 'bluetooth' | 'wifi' | 'usb';
export type PrinterSettings = { connection: PrinterConnection; name: string; address: string; port: string; paperWidth: '58' | '80' };
export type PrintableOrderItem = { name: string; quantity: number; note: string; flavors?: string[] };
export type PrintableOrder = { plate: string; customer: string; items: PrintableOrderItem[]; createdAt: string };

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildOrderHtml(order: PrintableOrder, paperWidth: '58' | '80') {
  const itemRows = order.items.map((item) => {
    const flavors = item.flavors && item.flavors.length > 0 ? `<div class="muted">${item.flavors.map(escapeHtml).join(' / ')}</div>` : '';
    const note = item.note ? `<div class="muted">Obs: ${escapeHtml(item.note)}</div>` : '';
    return `<div class="item"><strong>${item.quantity}x ${escapeHtml(item.name)}</strong>${flavors}${note}</div>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comanda de produção</title>
  <style>
    @page { margin: 0; }
    body { box-sizing: border-box; font-family: Arial, sans-serif; width: ${paperWidth}mm; max-width: 100%; margin: 0; padding: 2mm; font-size: 14px; color: #000; overflow-wrap: anywhere; }
    .center { text-align: center; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .item { margin: 10px 0; break-inside: avoid; }
    .muted { font-size: 12px; margin-top: 4px; white-space: pre-wrap; }
    .meta { font-size: 12px; line-height: 1.5; }
    .plate { font-size: 18px; }
  </style>
</head>
<body>
  <div class="center"><strong>COMANDA DE PRODUÇÃO</strong><div>COZINHA</div></div>
  <div class="line"></div>
  <div class="meta"><strong class="plate">Plaquinha: ${escapeHtml(order.plate)}</strong><br><strong>Cliente:</strong> ${escapeHtml(order.customer || 'Não informado')}<br><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
  <div class="line"></div>
  ${itemRows}
  <div class="line"></div>
</body>
</html>`;
}

export async function printOrder(order: PrintableOrder, settings: PrinterSettings) {
  if (settings.connection !== 'system') {
    throw new Error(`A conexao ${settings.connection} precisa do modulo nativo da impressora e de um dispositivo configurado.`);
  }

  await Print.printAsync({
    html: buildOrderHtml(order, settings.paperWidth),
    width: settings.paperWidth === '58' ? 216 : 288,
  });
}
