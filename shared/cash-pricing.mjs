import { validBusinessItems, validCents } from './business-validation.mjs';

export const DEFAULT_CASH_SETTINGS = Object.freeze({ tax: Object.freeze({ enabled: false, rateBps: 0 }), managers: Object.freeze([]) });
export function validCashSettings(value) {
  return value && typeof value === 'object' && Object.keys(value).length === 2 && value.tax && Object.keys(value.tax).length === 2
    && typeof value.tax.enabled === 'boolean' && Number.isSafeInteger(value.tax.rateBps) && value.tax.rateBps >= 0 && value.tax.rateBps <= 10000
    && Array.isArray(value.managers) && value.managers.length <= 20 && new Set(value.managers).size === value.managers.length
    && value.managers.every(name => typeof name === 'string' && /^[a-z0-9._-]{3,24}$/.test(name) && name !== 'admin');
}
export function calculateSale(items, discount = { kind: 'amount', value: 0, reason: '' }, taxRateBps = 0, extras) {
  if (!validBusinessItems(items, true) || !Number.isSafeInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000
    || !discount || !['amount', 'percent'].includes(discount.kind) || !validCents(discount.value)
    || typeof discount.reason !== 'string' || discount.reason.length > 1000
    || (discount.value > 0 && !discount.reason.trim()) || (discount.kind === 'percent' && discount.value > 10000)) throw new Error('INVALID_DATA');
  const subtotalCents = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  if (!validCents(subtotalCents) || subtotalCents === 0) throw new Error('INVALID_DATA');
  const discountCents = discount.kind === 'amount' ? discount.value : Math.round(subtotalCents * discount.value / 10000);
  if (discountCents >= subtotalCents) throw new Error('INVALID_DISCOUNT');
  const tipCents = extras?.tipCents ?? 0, deliveryFeeCents = extras?.deliveryFeeCents ?? 0;
  if (!validCents(tipCents) || !validCents(deliveryFeeCents)) throw new Error('INVALID_DATA');
  const taxCents = Math.round((subtotalCents - discountCents + deliveryFeeCents) * taxRateBps / 10000);
  const totalCents = subtotalCents - discountCents + taxCents + tipCents + deliveryFeeCents;
  if (!validCents(totalCents)) throw new Error('INVALID_DATA');
  return { subtotalCents, discountCents, taxCents, taxRateBps, totalCents, ...(extras ? { tipCents, deliveryFeeCents } : {}) };
}

// Allocate rounding pennies once per receipt so per-product totals always
// reconcile with the sale, including percentage discounts and refunds.
export function allocateCents(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(sum) || sum <= 0 || weights.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('INVALID_DATA');
  const rows = weights.map((weight, index) => {
    const numerator = BigInt(total) * BigInt(weight), denominator = BigInt(sum);
    return { index, cents: Number(numerator / denominator), remainder: numerator % denominator };
  });
  let remaining = total - rows.reduce((sum, row) => sum + row.cents, 0);
  for (const row of [...rows].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)) {
    if (remaining === 0) break; row.cents++; remaining--;
  }
  return rows.map(row => row.cents);
}
