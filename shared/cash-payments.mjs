import { validCents } from './business-validation.mjs';
export function normalizePayments(input, totalCents) {
  if (!Array.isArray(input) || !input.length || input.length > 3) throw new Error('INVALID_PAYMENT');
  const seen = new Set();
  const payments = input.map(payment => {
    if (!payment || !['cash', 'card', 'zelle'].includes(payment.method) || seen.has(payment.method)
      || !validCents(payment.amountCents) || payment.amountCents <= 0) throw new Error('INVALID_PAYMENT');
    seen.add(payment.method);
    const tenderedCents = payment.method === 'cash' ? payment.tenderedCents ?? payment.amountCents : payment.amountCents;
    if (!validCents(tenderedCents) || tenderedCents < payment.amountCents) throw new Error('INSUFFICIENT_PAYMENT');
    return { method: payment.method, amountCents: payment.amountCents, tenderedCents, changeCents: tenderedCents - payment.amountCents };
  });
  if (payments.reduce((sum, payment) => sum + payment.amountCents, 0) !== totalCents) throw new Error('PAYMENT_TOTAL_MISMATCH');
  return payments.sort((a, b) => ['cash', 'card', 'zelle'].indexOf(a.method) - ['cash', 'card', 'zelle'].indexOf(b.method));
}
export const receiptPayments = receipt => receipt.payments ?? [{ method: receipt.method, amountCents: receipt.totalCents, tenderedCents: receipt.tenderedCents, changeCents: receipt.changeCents }];
