import * as Print from 'expo-print';

export type PrinterConnection = 'system' | 'bluetooth' | 'wifi' | 'usb';
export type PrinterSettings = { connection: PrinterConnection; name: string; address: string; port: string; paperWidth: '58' | '80' };
export type PrintableOrderItem = { name: string; quantity: number; note: string; price?: number; flavors?: string[] };
export type PrintableOrder = { plate: string; customer: string; items: PrintableOrderItem[]; createdAt: string };

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function buildOrderHtml(order: PrintableOrder, paperWidth: '58' | '80') {
  const itemRows = order.items.map((item) => {
    const flavors = item.flavors && item.flavors.length > 0 ? `<div class="muted">${item.flavors.map(escapeHtml).join(' / ')}</div>` : '';
    const note = item.note ? `<div class="muted">Obs: ${escapeHtml(item.note)}</div>` : '';
    const price = item.price === undefined ? '' : `<span>${formatMoney(item.price * item.quantity)}</span>`;
    return `<div class="item"><div><strong>${item.quantity}x ${escapeHtml(item.name)}</strong>${flavors}${note}</div>${price}</div>`;
  }).join('');

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{margin:0}body{font-family:Arial,sans-serif;width:${paperWidth === '58' ? '54mm' : '76mm'};margin:0;padding:3mm;font-size:12px;color:#111}.center{text-align:center}.line{border-top:1px dashed #111;margin:8px 0}.item{display:flex;justify-content:space-between;gap:8px;margin:7px 0}.muted{font-size:10px;margin-top:2px}.meta{font-size:11px;line-height:1.5}</style></head><body><div class="center"><strong>COMANDA DIGITAL</strong><div class="line"></div></div><div class="meta"><strong>Plaquinha:</strong> ${escapeHtml(order.plate)}<br><strong>Cliente:</strong> ${escapeHtml(order.customer || 'Nao informado')}<br><strong>Data:</strong> ${new Date(order.createdAt).toLocaleString('pt-BR')}</div><div class="line"></div>${itemRows}<div class="line"></div><div class="center">Obrigado!</div></body></html>`;
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
