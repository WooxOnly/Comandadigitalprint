import { formatMoney, type CustomerReceipt, type Payment } from './business';
import { receiptPayments } from '../../shared/cash-payments.mjs';
import { receiptWriter } from './escposReceipt';
import { LOCALES, translate, type Language } from '../i18n/translations';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function buildCustomerReceiptHtml(receipt: CustomerReceipt, width: '58' | '80' | '88', language: Language = 'pt') {
  const t = (value: string) => translate(value, language), money = (value: number) => formatMoney(value, LOCALES[language]);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${t('Recibo não fiscal')}</title><style>@page{size:${width}mm 200mm;margin:0}body{box-sizing:border-box;width:${width}mm;margin:0 auto;padding:2mm;font:12px Arial;color:#000;text-align:center}h1{font-size:16px}.item{border-top:1px dashed #000;padding:2mm 0;white-space:pre-wrap;overflow-wrap:anywhere}strong{font-size:14px}</style></head><body>
    <h1>${escapeHtml(receipt.storeName)}</h1><strong>${t('RECIBO NÃO FISCAL')}</strong><p>${escapeHtml(receipt.id)}<br>${escapeHtml(new Date(receipt.createdAt).toLocaleString(LOCALES[language]))}</p>
    ${receipt.customer ? `<p>${t('Cliente')}: ${escapeHtml(receipt.customer)}</p>` : ''}
    ${receipt.reversal ? `<p><strong>${t(receipt.reversal.kind === 'void' ? 'VENDA CANCELADA' : receipt.reversal.partial ? 'ESTORNO PARCIAL' : 'ESTORNO INTEGRAL')}</strong><br>${escapeHtml(new Date(receipt.reversal.createdAt).toLocaleString(LOCALES[language]))}<br>${t('Devolvido')}: ${escapeHtml(money(receipt.reversal.amountCents))}<br>${escapeHtml(receipt.reversal.reason)}${receipt.reversal.remainingCents !== undefined ? `<br>${t('Saldo restante')}: ${escapeHtml(money(receipt.reversal.remainingCents))}` : ''}</p>` : ''}
    ${receipt.items.map(item => `<div class="item">${item.quantity}x ${escapeHtml(item.name)}<br>${escapeHtml(money(item.unitPriceCents!))} × ${item.quantity} = ${escapeHtml(money(item.unitPriceCents! * item.quantity))}${item.note ? `<br>${escapeHtml(item.note)}` : ''}</div>`).join('')}
    <p>${t('Subtotal')}: ${escapeHtml(money(receipt.subtotalCents ?? receipt.totalCents))}<br>${t('Desconto')}: ${escapeHtml(money(receipt.discountCents ?? 0))}<br>Sales tax (${(receipt.taxRateBps ?? 0) / 100}%): ${escapeHtml(money(receipt.taxCents ?? 0))}</p>
    ${receipt.deliveryFeeCents ? `<p>${t('Taxa de entrega')}: ${escapeHtml(money(receipt.deliveryFeeCents))}</p>` : ''}
    ${receipt.tipCents ? `<p>${t('Gorjeta')}: ${escapeHtml(money(receipt.tipCents))}</p>` : ''}
    ${receipt.discountReason ? `<p>${t('Motivo do desconto')}: ${escapeHtml(receipt.discountReason)}</p>` : ''}
    <p><strong>${t('Total')}: ${escapeHtml(money(receipt.totalCents))}</strong></p>${receiptPayments(receipt).map((payment: Payment) => `<p>${t('Pagamento')}: ${t(payment.method === 'cash' ? 'Dinheiro' : payment.method === 'card' ? 'Cartão' : 'Zelle')} · ${escapeHtml(money(payment.amountCents))}${payment.method === 'cash' ? `<br>${t('Recebido')}: ${escapeHtml(money(payment.tenderedCents ?? payment.amountCents))}<br>${t('Troco')}: ${escapeHtml(money(payment.changeCents ?? 0))}` : ''}</p>`).join('')}
    </body></html>`;
}
export function buildCustomerReceiptEscpos(receipt: CustomerReceipt, width: '58' | '80' | '88', language: Language = 'pt') {
  const writer = receiptWriter(width), t = (value: string) => translate(value, language), money = (value: number) => formatMoney(value, LOCALES[language]);
  writer.line(receipt.storeName, true); writer.line(t('RECIBO NÃO FISCAL'), true); writer.line(receipt.id);
  writer.line(new Date(receipt.createdAt).toLocaleString(LOCALES[language]));
  if (receipt.customer) writer.line(`${t('Cliente')}: ${receipt.customer}`);
  if (receipt.reversal) {
    writer.line(t(receipt.reversal.kind === 'void' ? 'VENDA CANCELADA' : receipt.reversal.partial ? 'ESTORNO PARCIAL' : 'ESTORNO INTEGRAL'), true);
    writer.line(new Date(receipt.reversal.createdAt).toLocaleString(LOCALES[language]));
    writer.line(`${t('Devolvido')}: ${money(receipt.reversal.amountCents)}`, true); writer.line(receipt.reversal.reason);
    if (receipt.reversal.remainingCents !== undefined) writer.line(`${t('Saldo restante')}: ${money(receipt.reversal.remainingCents)}`);
  }
  for (const item of receipt.items) {
    writer.separator(); writer.line(`${item.quantity}x ${item.name}`, true);
    writer.line(`${money(item.unitPriceCents!)} x ${item.quantity} = ${money(item.unitPriceCents! * item.quantity)}`);
    if (item.note) writer.line(item.note);
  }
  writer.separator();
  writer.line(`${t('Subtotal')}: ${money(receipt.subtotalCents ?? receipt.totalCents)}`);
  writer.line(`${t('Desconto')}: ${money(receipt.discountCents ?? 0)}`);
  writer.line(`Sales tax (${(receipt.taxRateBps ?? 0) / 100}%): ${money(receipt.taxCents ?? 0)}`);
  if (receipt.deliveryFeeCents) writer.line(`${t('Taxa de entrega')}: ${money(receipt.deliveryFeeCents)}`);
  if (receipt.tipCents) writer.line(`${t('Gorjeta')}: ${money(receipt.tipCents)}`);
  if (receipt.discountReason) writer.line(`${t('Motivo do desconto')}: ${receipt.discountReason}`);
  writer.line(`${t('Total')}: ${money(receipt.totalCents)}`, true, 0x01);
  for (const payment of receiptPayments(receipt)) {
    writer.line(`${t('Pagamento')}: ${t(payment.method === 'cash' ? 'Dinheiro' : payment.method === 'card' ? 'Cartão' : 'Zelle')} ${money(payment.amountCents)}`);
    if (payment.method === 'cash') { writer.line(`${t('Recebido')}: ${money(payment.tenderedCents ?? payment.amountCents)}`); writer.line(`${t('Troco')}: ${money(payment.changeCents ?? 0)}`); }
  }
  return writer.finish();
}
