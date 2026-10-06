import type { CashReport } from './business';

export function reportPeriod(from: string, through: string) {
  const parse = (text: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Informe um período válido em AAAA-MM-DD.');
    const date = new Date(`${text}T00:00:00`);
    if (!Number.isFinite(date.getTime()) || date.getFullYear() !== Number(text.slice(0, 4)) || date.getMonth() + 1 !== Number(text.slice(5, 7)) || date.getDate() !== Number(text.slice(8, 10))) throw new Error('Informe um período válido em AAAA-MM-DD.');
    return date;
  };
  const start = parse(from), end = parse(through);
  const days = (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000 + 1;
  if (days < 1 || days > 366) throw new Error('Escolha um período de até 366 dias.');
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}
const dollars = (cents: number) => cents / 100;
export function cashReportCsv(report: CashReport) {
  const rows: (string | number)[][] = [
    ['BistroHub - Cash report (USD)'], ['Store', report.storeName], ['Store ID', report.storeId], ['Start inclusive', report.start], ['End exclusive', report.end], ['Time zone', report.timeZone], ['Generated', report.generatedAt], [],
    ['SUMMARY', 'Amount USD'], ['Gross sales before discount/tax', dollars(report.totals.grossCents)], ['Discounts', dollars(report.totals.discountCents)], ['Tax collected', dollars(report.totals.taxCents)], ['Reversed total including tax', dollars(report.totals.reversedCents)], ['Tax reversed', dollars(report.totals.taxReversedCents)], ['Net sales excluding tax', dollars(report.totals.netSalesCents)], ['Net tax', dollars(report.totals.netTaxCents)], ['Tips received', dollars(report.totals.tipCents ?? 0)], ['Tips returned', dollars(report.totals.tipReversedCents ?? 0)], ['Net tips', dollars(report.totals.netTipCents ?? 0)], ['Delivery fees received', dollars(report.totals.deliveryFeeCents ?? 0)], ['Delivery fees returned', dollars(report.totals.deliveryFeeReversedCents ?? 0)], ['Net delivery fees', dollars(report.totals.netDeliveryFeeCents ?? 0)], ['Net receipts including tax, tips and delivery', dollars(report.totals.netReceiptsCents)], ['Cash in', dollars(report.totals.inCents)], ['Cash out', dollars(report.totals.outCents)], [],
    ['DAY', 'Sales', 'Voids', 'Refunds', 'Gross USD', 'Discount USD', 'Tax USD', 'Reversed USD', 'Net sales USD', 'Net tax USD', 'Net receipts USD', 'Cash in USD', 'Cash out USD', 'Tips received USD', 'Tips returned USD', 'Net tips USD', 'Delivery fees received USD', 'Delivery fees returned USD', 'Net delivery fees USD'],
    ...report.days.map(day => [day.day, day.salesCount, day.voidCount, day.refundCount, dollars(day.grossCents), dollars(day.discountCents), dollars(day.taxCents), dollars(day.reversedCents), dollars(day.netSalesCents), dollars(day.netTaxCents), dollars(day.netReceiptsCents), dollars(day.inCents), dollars(day.outCents), dollars(day.tipCents ?? 0), dollars(day.tipReversedCents ?? 0), dollars(day.netTipCents ?? 0), dollars(day.deliveryFeeCents ?? 0), dollars(day.deliveryFeeReversedCents ?? 0), dollars(day.netDeliveryFeeCents ?? 0)]), [],
    ['PAYMENT METHOD', 'Received USD', 'Reversed USD', 'Net USD'], ...report.methods.map(row => [row.method, dollars(row.receivedCents), dollars(row.reversedCents), dollars(row.netCents)]), [],
    ['PRODUCT', 'Category', 'Sold quantity', 'Reversed quantity', 'Net quantity', 'Gross USD', 'Discount USD', 'Reversed excluding tax USD', 'Net sales excluding tax USD'], ...report.products.map(row => [row.name, row.category, row.soldQuantity, row.reversedQuantity, row.netQuantity, dollars(row.grossCents), dollars(row.discountCents), dollars(row.reversedCents), dollars(row.netSalesCents)]), [],
    ['CLOSING', 'Tablet ID', 'Opened by', 'Closed by', 'Opened at', 'Closed at', 'Opening USD', 'Expected USD', 'Counted USD', 'Difference USD'], ...report.closings.map(row => [row.id, row.deviceId, row.openedBy, row.closedBy, row.openedAt, row.closedAt, dollars(row.openingCents), dollars(row.expectedCents), dollars(row.countedCents), dollars(row.differenceCents)]), [],
    ['AUDIT ID', 'Operation', 'Payment method', 'Amount USD', 'Date', 'Operator', 'Reason', 'Discount USD', 'Tax USD', 'Authorized by', 'Unit price adjustments', 'Tips USD', 'Delivery fee USD', 'Payment parts (cents)', 'Refund details (cents)'], ...report.movements.map(row => [row.id, row.kind, row.method, dollars(row.amountCents), row.createdAt, row.actor, row.reason, dollars(row.discountCents ?? 0), dollars(row.taxCents ?? 0), row.authorizedBy ?? '', JSON.stringify(row.priceAdjustments ?? []), dollars(row.tipCents ?? 0), dollars(row.deliveryFeeCents ?? 0), JSON.stringify(row.payments ?? []), JSON.stringify(row.refund ?? null)]),
  ];
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = String(value);
    const safe = typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
