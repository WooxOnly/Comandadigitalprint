import type { Preparation } from './business';
export const PREPARATION_PAGE_SIZE = 6;
export function preparationQueue<T extends { id: string; createdAt: string }>(orders: T[], records: Preparation[], includeCompleted = false, period?: { start: number; end: number } | null): T[] {
  const statuses = new Map(records.map(record => [record.orderId, record.status]));
  return orders.filter(order => {
    const issuedAt = Date.parse(order.createdAt);
    return Number.isFinite(issuedAt) && (!period || issuedAt >= period.start && issuedAt < period.end) && (includeCompleted || statuses.get(order.id) !== 'completed');
  }).sort((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt) || (first.id < second.id ? -1 : first.id > second.id ? 1 : 0));
}
