import type { OrderItem } from '../../orderItems';
export type StoreModules = { preorders: boolean; cash: boolean; customers: boolean; preparation: boolean };
export const DEFAULT_STORE_MODULES: StoreModules = Object.freeze({ preorders: false, cash: false, customers: false, preparation: false });
export function validStoreModules(value: unknown): value is StoreModules {
  return !!value && typeof value === 'object' && typeof (value as StoreModules).preorders === 'boolean' && typeof (value as StoreModules).cash === 'boolean'
    && [2, 3, 4].includes(Object.keys(value).length) && Object.keys(value).every(key => ['preorders', 'cash', 'customers', 'preparation'].includes(key))
    && ((value as StoreModules).customers === undefined || typeof (value as StoreModules).customers === 'boolean') && ((value as StoreModules).preparation === undefined || typeof (value as StoreModules).preparation === 'boolean');
}
export type Customer = { id: string; name: string; phone: string; email: string; addresses: string[]; notes: string; active: boolean; createdAt: string; updatedAt: string };
export type Delivery = { feeCents: number; driver: string; status: 'pending' | 'out' | 'delivered'; dispatchedAt?: string; deliveredAt?: string };
export type BusinessItem = Pick<OrderItem, 'id' | 'name' | 'category' | 'quantity' | 'note'> & { productId?: string; unitPriceCents?: number };
export type Preorder = { id: string; customer: string; customerId?: string; contact: string; address: string; fulfillment: 'pickup' | 'delivery'; delivery?: Delivery; dueAt: string; createdAt: string; status: 'scheduled' | 'preparing' | 'ready' | 'completed' | 'cancelled'; items: BusinessItem[] };
export type CustomerHistory = { customerId: string; more: boolean; preorders: Preorder[]; sales: { id: string; createdAt: string; items: { name: string; quantity: number }[]; totalCents?: number; refundedCents?: number }[] };
export type PaymentMethod = 'cash' | 'card' | 'zelle';
export type Payment = { method: PaymentMethod; amountCents: number; tenderedCents?: number; changeCents?: number };
export type RefundInput = { mode: 'full' } | { mode: 'amount'; amountCents: number } | { mode: 'items'; items: { index: number; quantity: number }[]; refundTip: boolean; refundDeliveryFee: boolean };
export type RefundData = { amountCents: number; tipCents: number; deliveryFeeCents: number; deliveryTaxCents: number; lines: { index: number; netCents: number; taxCents: number; quantityReturned: number }[]; payments: Payment[]; input: RefundInput };
export type CashSettings = { tax: { enabled: boolean; rateBps: number }; managers: string[] };
export type Discount = { kind: 'amount' | 'percent'; value: number; reason: string };
export type CashReversal = { id: string; kind: 'void' | 'refund'; createdAt: string; actor: string; reason: string; amountCents: number; remainingCents?: number; partial?: boolean };
export type CustomerReceipt = { id: string; storeName: string; currency: 'USD'; createdAt: string; customer: string; customerId?: string; tipCents?: number; deliveryFeeCents?: number; payments?: Payment[]; items: BusinessItem[]; subtotalCents?: number; discountCents?: number; discountKind?: Discount['kind']; discountValue?: number; discountReason?: string; taxRateBps?: number; taxCents?: number; operator?: string; priceAdjustments?: { productId: string | null; name: string; catalogPriceCents: number | null; chargedPriceCents: number; quantity: number }[]; authorizedBy?: string; reversal?: CashReversal; totalCents: number; method: PaymentMethod | 'split'; tenderedCents: number; changeCents: number };
export type CashSession = { id: string; deviceId: string; openedAt: string; openedBy: string; openingCents: number; closedAt: string | null; countedCents: number | null; summary: { cashCents: number; cardCents: number; zelleCents: number; inCents: number; outCents: number; expectedCents: number } };
export type CashEntry = { id: string; sessionId: string; kind: 'sale' | 'in' | 'out'; method: PaymentMethod | 'split'; amountCents: number; createdAt: string; actor?: string; reversal?: CashReversal; refundHistory?: { data: RefundData | null }[]; note: string; receipt: CustomerReceipt | null };
export type CashAdjustment = CashReversal & { sessionId: string; saleId: string; method: PaymentMethod | 'split'; data?: RefundData | null };
export type CashOverview = { sessions: CashSession[]; entries: CashEntry[]; settings?: CashSettings; adjustments?: CashAdjustment[]; receipt?: CustomerReceipt };
export type ReportTotals = { salesCount: number; voidCount: number; refundCount: number; grossCents: number; discountCents: number; taxCents: number; reversedCents: number; taxReversedCents: number; netSalesCents: number; netTaxCents: number; netReceiptsCents: number; tipCents: number; tipReversedCents: number; netTipCents: number; deliveryFeeCents: number; deliveryFeeReversedCents: number; netDeliveryFeeCents: number; inCents: number; outCents: number };
export type CashReport = { storeId: string; storeName: string; currency: 'USD'; start: string; end: string; timeZone: string; generatedAt: string; totals: ReportTotals; days: (ReportTotals & { day: string })[]; methods: { method: PaymentMethod; receivedCents: number; reversedCents: number; netCents: number }[]; products: { id: string; name: string; category: string; soldQuantity: number; reversedQuantity: number; netQuantity: number; grossCents: number; discountCents: number; reversedCents: number; netSalesCents: number }[]; movements: { id: string; kind: 'sale' | 'in' | 'out' | 'void' | 'refund'; method: PaymentMethod | 'split'; payments?: Payment[]; tipCents?: number; deliveryFeeCents?: number; refund?: RefundData; amountCents: number; createdAt: string; actor: string; reason: string; discountCents?: number; taxCents?: number; authorizedBy?: string; priceAdjustments?: CustomerReceipt['priceAdjustments'] }[]; closings: { id: string; deviceId: string; openedBy: string; closedBy: string; openedAt: string; closedAt: string; openingCents: number; expectedCents: number; countedCents: number; differenceCents: number }[] };
export function parseMoney(text: string) {
  const value = text.trim().replace(',', '.');
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) throw new Error('Informe um valor em dólares com até duas casas decimais.');
  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents > 100000000) throw new Error('Valor acima do limite permitido.');
  return cents;
}
export function formatMoney(cents: number, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(cents / 100);
}
export function businessTotal(items: BusinessItem[]) {
  if (!items.length || items.some(item => !Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents! < 0 || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) throw new Error('Confira os preços e as quantidades dos itens.');
  const total = items.reduce((sum, item) => sum + item.unitPriceCents! * item.quantity, 0);
  if (!Number.isSafeInteger(total) || total <= 0 || total > 100000000) throw new Error('O total deve ser maior que zero e estar dentro do limite permitido.');
  return total;
}

export type Preparation = { orderId: string; status: 'received' | 'preparing' | 'ready' | 'completed'; updatedAt: string };
