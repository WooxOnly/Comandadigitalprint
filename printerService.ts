import * as Print from 'expo-print';

export type PrinterConnection = 'system' | 'bluetooth' | 'wifi' | 'usb';
export type PrinterSettings = { connection: PrinterConnection; name: string; address: string; port: string; paperWidth: '58' | '80' };
export type PrintableOrderItem = { name: string; quantity: number; note: string; flavors?: string[]; extras?: { name: string; placement: 'whole' | 'first' | 'second' }[] };
export type PrintableOrder = { plate: string; customer: string; items: PrintableOrderItem[]; createdAt: string };

// expo-print uses points (72 per inch), not screen pixels. Long orders paginate.
export function getReceiptPageSize(paperWidth: PrinterSettings['paperWidth']) {
  return { width: Math.round(Number(paperWidth) * 72 / 25.4), height: Math.round(200 * 72 / 25.4) };
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildOrderHtml(order: PrintableOrder, paperWidth: '58' | '80') {
  const itemRows = order.items.map((item) => {
    const flavors = item.flavors && item.flavors.length > 0 ? `<div class="muted">${item.flavors.map((flavor, index) => `${index + 1}ª metade: ${escapeHtml(flavor)}`).join('<br>')}</div>` : '';
    const extras = (item.extras || []).map((extra) => {
      const placement = extra.placement === 'first' ? `1ª metade: ${item.flavors?.[0] || ''}` : extra.placement === 'second' ? `2ª metade: ${item.flavors?.[1] || ''}` : 'inteira';
      return `<div class="muted"><strong>+ ${escapeHtml(extra.name)}</strong> (${escapeHtml(placement)})</div>`;
    }).join('');
    const note = item.note ? `<div class="muted">Obs: ${escapeHtml(item.note)}</div>` : '';
    return `<div class="item"><strong>${item.quantity}x ${escapeHtml(item.name)}</strong>${flavors}${extras}${note}</div>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Comanda de produção</title>
  <style>
    @page { size: ${paperWidth}mm 200mm; margin: 0; }
    body { box-sizing: border-box; font-family: Arial, sans-serif; width: ${paperWidth}mm; max-width: 100%; margin: 0 auto; padding: 2mm; font-size: 14px; line-height: 1.4; text-align: center; color: #000; overflow-wrap: anywhere; }
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

export function buildPrinterTestHtml(paperWidth: PrinterSettings['paperWidth']) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Teste de impressão</title>
  <style>
    @page { size: ${paperWidth}mm 200mm; margin: 0; }
    body { box-sizing: border-box; width: ${paperWidth}mm; max-width: 100%; margin: 0 auto; padding: 4mm 2mm; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; text-align: center; color: #000; overflow-wrap: anywhere; }
    h1 { font-size: 16px; margin: 0 0 6mm; }
    p { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4mm 0; }
  </style>
</head>
<body>
  <h1>TESTE DE IMPRESSÃO</h1>
  <p><strong>Impressora configurada com sucesso</strong></p>
</body>
</html>`;
}

async function printHtml(html: string, settings: PrinterSettings) {
  if (settings.connection !== 'system') {
    throw new Error(`A conexão ${settings.connection} precisa do módulo nativo da impressora e de um dispositivo configurado.`);
  }

  await Print.printAsync({
    html,
    ...getReceiptPageSize(settings.paperWidth),
  });
}

export async function printOrder(order: PrintableOrder, settings: PrinterSettings) {
  await printHtml(buildOrderHtml(order, settings.paperWidth), settings);
}

export async function printPrinterTest(settings: PrinterSettings) {
  await printHtml(buildPrinterTestHtml(settings.paperWidth), settings);
}
