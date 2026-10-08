export function kitchenAlertIds(orders: { id: string; createdAt: string }[], openedAt: number) {
  return orders.filter(order => Date.parse(order.createdAt) >= openedAt).map(order => order.id);
}
export function newKitchenOrders(ids: string[], seen: Set<string> | null) {
  const unique = [...new Set(ids)];
  return { seen: new Set([...(seen ?? []), ...unique]), added: seen ? unique.filter(id => !seen.has(id)) : [] };
}
