import { translate, itemName, translatedNote, LOCALES, type Language } from './src/i18n/translations';
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

export function buildOrderHtml(order: PrintableOrder, paperWidth: '58' | '80', language: Language = 'pt') {
  const t = (text: string) => translate(text, language);
  const itemRows = order.items.map((item) => {
    const flavors = item.flavors && item.flavors.length > 0 ? `<div class="flavors">${item.flavors.map((flavor, index) => `<div class="flavor">${t(index === 0 ? '1ª metade:' : '2ª metade:')} ${escapeHtml(flavor)}</div>`).join('')}</div>` : '';
    const extras = (item.extras || []).map((extra) => {
      const placement = extra.placement === 'first' ? `${t('1ª metade:')} ${item.flavors?.[0] || ''}` : extra.placement === 'second' ? `${t('2ª metade:')} ${item.flavors?.[1] || ''}` : t('inteira');
      return `<div class="extra"><strong>+ ${escapeHtml(extra.name)}</strong><br><span>(${escapeHtml(placement)})</span></div>`;
    }).join('');
    const note = item.note.trim() ? `<div class="note">${t('Obs')}: ${escapeHtml(translatedNote(item.note, language))}</div>` : '';
    return `<section class="item"><strong class="item-title">${item.quantity}x ${escapeHtml(itemName(item.name, language))}</strong>${flavors}${extras}${note}</section>`;
  }).join('');

  return `<!doctype html>
<html lang="${LOCALES[language]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t('Comanda de produção')}</title>
  <style>
    @page { size: ${paperWidth}mm 200mm; margin: 0; }
    body { box-sizing: border-box; font-family: Arial, sans-serif; width: ${paperWidth}mm; max-width: 100%; margin: 0 auto; padding: 2mm; font-size: 14px; line-height: 1.35; text-align: center; color: #000; overflow-wrap: anywhere; }
    header { break-inside: avoid; }
    .heading { font-size: 12px; font-weight: 700; }
    .kitchen { font-size: 11px; margin-top: 1mm; }
    .identification { border: 2px solid #000; padding: 2mm 1mm; margin: 3mm 0 2mm; }
    .plate { display: block; font-size: ${paperWidth === '58' ? 24 : 28}px; font-weight: 900; line-height: 1.15; }
    .customer { margin-top: 2mm; font-size: 17px; font-weight: 700; }
    .date { font-size: 11px; margin: 2mm 0; }
    .item { border-top: 1px dashed #000; padding: 3mm 0; break-inside: avoid; page-break-inside: avoid; }
    .item:last-child { border-bottom: 2px solid #000; }
    .item-title { display: block; font-size: ${paperWidth === '58' ? 18 : 20}px; line-height: 1.25; font-weight: 900; }
    .flavors { margin-top: 2mm; }
    .flavor { font-size: 15px; font-weight: 700; margin-top: 1mm; }
    .extra { margin-top: 2mm; font-size: 14px; }
    .extra span { font-size: 12px; }
    .note { border: 1px solid #000; padding: 2mm 1mm; margin-top: 2mm; font-size: 15px; font-weight: 700; white-space: pre-wrap; }
  </style>
</head>
<body>
  <header>
    <div class="heading">${t('COMANDA DE PRODUÇÃO')}</div><div class="kitchen">${t('COZINHA')}</div>
    <div class="identification"><strong class="plate">${t('Plaquinha')}: ${escapeHtml(order.plate)}</strong><div class="customer">${t('Cliente')}: ${escapeHtml(order.customer || t('Não informado'))}</div></div>
    <div class="date">${t('Data')}: ${new Date(order.createdAt).toLocaleString(LOCALES[language])}</div>
  </header>
  ${itemRows}
</body>
</html>`;
}

export function buildPrinterTestHtml(paperWidth: PrinterSettings['paperWidth'], language: Language = 'pt') {
  const t = (text: string) => translate(text, language);
  return `<!doctype html>
<html lang="${LOCALES[language]}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t('Teste de impressão')}</title>
  <style>
    @page { size: ${paperWidth}mm 200mm; margin: 0; }
    body { box-sizing: border-box; width: ${paperWidth}mm; max-width: 100%; margin: 0 auto; padding: 4mm 2mm; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; text-align: center; color: #000; overflow-wrap: anywhere; }
    h1 { font-size: 16px; margin: 0 0 6mm; }
    p { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4mm 0; }
  </style>
</head>
<body>
  <h1>${t('TESTE DE IMPRESSÃO')}</h1>
  <p><strong>${t('Impressora configurada com sucesso')}</strong></p>
</body>
</html>`;
}

async function printHtml(html: string, settings: PrinterSettings, language: Language = 'pt') {
  if (settings.connection !== 'system') {
    throw new Error(translate('Conexão direta indisponível. Use a impressão pelo sistema.', language));
  }

  await Print.printAsync({
    html,
    ...getReceiptPageSize(settings.paperWidth),
  });
}

export async function printOrder(order: PrintableOrder, settings: PrinterSettings, language: Language = 'pt') {
  await printHtml(buildOrderHtml(order, settings.paperWidth, language), settings, language);
}

export async function printPrinterTest(settings: PrinterSettings, language: Language = 'pt') {
  await printHtml(buildPrinterTestHtml(settings.paperWidth, language), settings, language);
}
