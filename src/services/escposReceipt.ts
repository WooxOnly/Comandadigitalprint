import type { PrintableOrder, PrinterSettings } from '../../printerService';
import { itemName, LOCALES, translate, translatedNote, type Language } from '../i18n/translations';

// Standard ESC/POS profile: ESC t 2 selects CP850. Model-specific firmware
// support still needs a physical test. Never send UTF-8 to an 8-bit printer.
const CP850 = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´\u00ad±‗¾¶§÷¸°¨·¹³²■ ';

function cleanText(value: string) {
  return value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, ' ')
    .replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...')
    .replace(/€/g, 'EUR').replace(/[^\S\n]+/g, ' ')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, '');
}

export function encodePrinterText(value: string) {
  const bytes: number[] = [];
  for (const char of cleanText(value)) {
    const code = char.codePointAt(0)!;
    const index = CP850.indexOf(char);
    if (code < 128) bytes.push(code);
    else if (index >= 0) bytes.push(index + 128);
    else {
      const plain = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      bytes.push(...Array.from(plain).map(letter => letter.charCodeAt(0) < 128 ? letter.charCodeAt(0) : 63));
    }
  }
  return Uint8Array.from(bytes);
}

function wrapText(text: string, columns: number) {
  const lines: string[] = [];
  for (let line of cleanText(text).split('\n')) {
    while (line.length > columns) {
      const space = line.lastIndexOf(' ', columns);
      const end = space > 0 ? space : columns;
      lines.push(line.slice(0, end));
      line = line.slice(end).trimStart();
    }
    lines.push(line);
  }
  return lines;
}

export function receiptWriter(paperWidth: PrinterSettings['paperWidth']) {
  const columns = paperWidth === '58' ? 32 : 48;
  const bytes = [0x1b, 0x40, 0x1c, 0x2e, 0x1b, 0x74, 2, 0x1b, 0x4d, 0, 0x1b, 0x61, 1];
  return {
    line(text: string, bold = false, size = 0) {
      bytes.push(0x1b, 0x45, bold ? 1 : 0, 0x1d, 0x21, size);
      for (const line of wrapText(text, size & 0x10 ? columns / 2 : columns)) {
        bytes.push(...encodePrinterText(line), 0x0a);
      }
    },
    separator() { this.line('-'.repeat(columns)); },
    finish() {
      bytes.push(0x1b, 0x45, 0, 0x1d, 0x21, 0, 0x1b, 0x64, 3, 0x1d, 0x56, 1);
      return Uint8Array.from(bytes);
    },
  };
}

export function buildOrderEscpos(order: PrintableOrder, paperWidth: PrinterSettings['paperWidth'], language: Language = 'pt') {
  const t = (text: string) => translate(text, language);
  const receipt = receiptWriter(paperWidth);
  receipt.line(t('COMANDA DE PRODUÇÃO'), true);
  receipt.line(t('COZINHA'));
  receipt.separator();
  if (order.dailyNumber && order.tabletLabel) {
    receipt.line(`${t('Pedido nº')}: ${order.tabletLabel}-${String(order.dailyNumber).padStart(3, '0')}`, true, 0x11);
  }
  receipt.line(`${t('Mesa')}: ${order.plate}`, true, 0x11);
  if (order.serviceMode) {
    receipt.line(`${t('Tipo de pedido')}: ${t(order.serviceMode === 'dine_in' ? 'Para comer aqui' : 'Para levar')}`, true);
  }
  receipt.line(`${t('Cliente')}: ${order.customer || t('Não informado')}`, true);
  receipt.line(`${t('Data')}: ${new Date(order.createdAt).toLocaleString(LOCALES[language])}`);
  for (const item of order.items) {
    receipt.separator();
    receipt.line(`${item.quantity}x ${itemName(item.name, language)}`, true, 0x01);
    item.flavors?.forEach((flavor, index) => receipt.line(`${t(index === 0 ? '1ª metade:' : '2ª metade:')} ${flavor}`, true));
    for (const extra of item.extras || []) {
      const placement = extra.placement === 'first' ? `${t('1ª metade:')} ${item.flavors?.[0] || ''}`
        : extra.placement === 'second' ? `${t('2ª metade:')} ${item.flavors?.[1] || ''}` : t('inteira');
      receipt.line(`+ ${extra.name}`, true);
      receipt.line(`(${placement})`);
    }
    if (item.note.trim()) receipt.line(`${t('Obs')}: ${translatedNote(item.note, language)}`, true);
  }
  receipt.separator();
  return receipt.finish();
}

export function buildPrinterTestEscpos(paperWidth: PrinterSettings['paperWidth'], language: Language = 'pt') {
  const t = (text: string) => translate(text, language);
  const receipt = receiptWriter(paperWidth);
  receipt.line(t('TESTE DE IMPRESSÃO'), true, 0x01);
  receipt.separator();
  receipt.line('BistroHub');
  receipt.line(`${paperWidth} mm`);
  receipt.line('Acentos: á é í ó ú ã õ ç ñ ü');
  receipt.line(t('Impressora configurada com sucesso'), true);
  receipt.separator();
  return receipt.finish();
}
