import { allocateCents } from './cash-pricing.mjs';
import { receiptPayments } from './cash-payments.mjs';
import { validCents } from './business-validation.mjs';
const fail = code => { throw new Error(code); };
export function originalRefundComponents(receipt) {
  const weights = receipt.items.map(item => item.quantity * item.unitPriceCents);
  const discounts = allocateCents(receipt.discountCents ?? 0, weights);
  const net = weights.map((weight, index) => weight - discounts[index]);
  const deliveryFeeCents = receipt.deliveryFeeCents ?? 0;
  const taxes = allocateCents(receipt.taxCents ?? 0, [...net, deliveryFeeCents]);
  return { lines: receipt.items.map((item, index) => ({ index, quantity: item.quantity, netCents: net[index], taxCents: taxes[index] })),
    tipCents: receipt.tipCents ?? 0, deliveryFeeCents, deliveryTaxCents: taxes.at(-1), payments: receiptPayments(receipt).map(({ method, amountCents }) => ({ method, amountCents })) };
}
export function remainingRefund(receipt, history = []) {
  const remaining = originalRefundComponents(receipt);
  for (const refund of history) {
    const data = refund.data ?? { ...originalRefundComponents(receipt), lines: originalRefundComponents(receipt).lines.map(line => ({ ...line, quantityReturned: line.quantity })) };
    for (const returned of data.lines) {
      const line = remaining.lines[returned.index];
      line.netCents -= returned.netCents; line.taxCents -= returned.taxCents; line.quantity -= returned.quantityReturned ?? 0;
    }
    for (const key of ['tipCents', 'deliveryFeeCents', 'deliveryTaxCents']) remaining[key] -= data[key] ?? 0;
    for (const paid of data.payments) remaining.payments.find(row => row.method === paid.method).amountCents -= paid.amountCents;
  }
  const amountCents = remaining.lines.reduce((sum, line) => sum + line.netCents + line.taxCents, 0) + remaining.tipCents + remaining.deliveryFeeCents + remaining.deliveryTaxCents;
  return { ...remaining, amountCents };
}
export function prepareRefund(receipt, history, input = { mode: 'full' }) {
  const remaining = remainingRefund(receipt, history);
  if (remaining.amountCents <= 0) fail('SALE_ALREADY_REVERSED');
  if (!input || !['full', 'amount', 'items'].includes(input.mode)) fail('INVALID_REFUND');
  const result = { lines: remaining.lines.map(line => ({ index: line.index, netCents: 0, taxCents: 0, quantityReturned: 0 })), tipCents: 0, deliveryFeeCents: 0, deliveryTaxCents: 0 };
  if (input.mode === 'full') {
    result.lines = remaining.lines.map(line => ({ index: line.index, netCents: line.netCents, taxCents: line.taxCents, quantityReturned: line.quantity }));
    for (const key of ['tipCents', 'deliveryFeeCents', 'deliveryTaxCents']) result[key] = remaining[key];
  } else if (input.mode === 'amount') {
    if (!validCents(input.amountCents) || input.amountCents <= 0 || input.amountCents > remaining.amountCents) fail('INVALID_REFUND');
    const allocated = allocateCents(input.amountCents, [...remaining.lines.flatMap(line => [line.netCents, line.taxCents]), remaining.tipCents, remaining.deliveryFeeCents, remaining.deliveryTaxCents]);
    result.lines.forEach((line, index) => { line.netCents = allocated[index * 2]; line.taxCents = allocated[index * 2 + 1]; });
    [result.tipCents, result.deliveryFeeCents, result.deliveryTaxCents] = allocated.slice(-3);
  } else {
    if (!Array.isArray(input.items) || input.items.length > receipt.items.length || typeof input.refundTip !== 'boolean' || typeof input.refundDeliveryFee !== 'boolean') fail('INVALID_REFUND');
    const seen = new Set();
    for (const item of input.items) {
      if (!item || !Number.isSafeInteger(item.index) || seen.has(item.index) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) fail('INVALID_REFUND');
      const line = remaining.lines[item.index];
      if (!line || item.quantity > line.quantity) fail('INVALID_REFUND');
      seen.add(item.index);
      result.lines[item.index] = { index: item.index, quantityReturned: item.quantity,
        netCents: allocateCents(line.netCents, [item.quantity, line.quantity - item.quantity])[0],
        taxCents: allocateCents(line.taxCents, [item.quantity, line.quantity - item.quantity])[0] };
    }
    if (input.refundTip) result.tipCents = remaining.tipCents;
    if (input.refundDeliveryFee) { result.deliveryFeeCents = remaining.deliveryFeeCents; result.deliveryTaxCents = remaining.deliveryTaxCents; }
  }
  const amountCents = result.lines.reduce((sum, line) => sum + line.netCents + line.taxCents, 0) + result.tipCents + result.deliveryFeeCents + result.deliveryTaxCents;
  if (amountCents <= 0) fail('INVALID_REFUND');
  const parts = allocateCents(amountCents, remaining.payments.map(payment => payment.amountCents));
  return { ...result, amountCents, payments: remaining.payments.map((payment, index) => ({ method: payment.method, amountCents: parts[index] })).filter(payment => payment.amountCents > 0), input };
}
