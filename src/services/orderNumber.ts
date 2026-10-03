export type NumberedOrder = {
  tabletId?: string;
  numberDay?: string;
  dailyNumber?: number;
};

export function localOrderDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function nextDailyOrderNumber(orders: NumberedOrder[], tabletId: string, day: string) {
  return orders.reduce((max, order) => order.tabletId === tabletId && order.numberDay === day && Number.isSafeInteger(order.dailyNumber) && order.dailyNumber! > 0
    ? Math.max(max, order.dailyNumber!) : max, 0) + 1;
}

export function tabletLabelForDay(orders: (NumberedOrder & { tabletLabel?: string })[], tabletId: string, day: string, assignedNumber: number | null) {
  return orders.find((order) => order.tabletId === tabletId && order.numberDay === day && order.tabletLabel)?.tabletLabel
    ?? String(assignedNumber ?? tabletId.slice(0, 12).toUpperCase());
}

export function orderNumberLabel(order: NumberedOrder & { tabletLabel?: string }) {
  return order.dailyNumber && order.tabletLabel ? `${order.tabletLabel}-${String(order.dailyNumber).padStart(3, '0')}` : null;
}
