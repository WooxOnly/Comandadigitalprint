export const validCents = value => Number.isSafeInteger(value) && value >= 0 && value <= 100000000;
const text = (value, max) => typeof value === 'string' && value.length <= max;
export function validCustomer(value) {
  return value && text(value.id, 160) && value.id.length > 0 && text(value.name, 500) && value.name.trim()
    && text(value.phone, 200) && text(value.email, 200) && (value.phone.trim() || value.email.trim())
    && Array.isArray(value.addresses) && value.addresses.length <= 10 && value.addresses.every(address => text(address, 1000) && address.trim())
    && text(value.notes, 4000) && typeof value.active === 'boolean' && text(value.createdAt, 40) && Number.isFinite(Date.parse(value.createdAt))
    && text(value.updatedAt, 40) && Number.isFinite(Date.parse(value.updatedAt));
}
export function validDelivery(value) {
  return value && validCents(value.feeCents) && text(value.driver, 200) && ['pending', 'out', 'delivered'].includes(value.status)
    && (value.status === 'pending' || value.dispatchedAt !== undefined) && (value.status !== 'delivered' || value.deliveredAt !== undefined)
    && (value.deliveredAt === undefined || (value.dispatchedAt !== undefined && Date.parse(value.deliveredAt) >= Date.parse(value.dispatchedAt)))
    && (value.status === 'pending' || value.driver.trim())
    && (value.dispatchedAt === undefined || (text(value.dispatchedAt, 40) && Number.isFinite(Date.parse(value.dispatchedAt))))
    && (value.deliveredAt === undefined || (text(value.deliveredAt, 40) && Number.isFinite(Date.parse(value.deliveredAt))));
}
export function validBusinessItems(items, priced = false) {
  return Array.isArray(items) && items.length > 0 && items.length <= 200 && items.every(item => item
    && text(item.id, 200) && text(item.name, 200) && item.name.trim() && text(item.category, 100)
    && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 9999 && text(item.note, 4000)
    && (item.productId === undefined || (text(item.productId, 120) && item.productId.trim()))
    && (!priced || validCents(item.unitPriceCents))
    && (item.unitPriceCents === undefined || validCents(item.unitPriceCents)));
}
export function validPreorder(value) {
  return value && text(value.id, 160) && value.id.length > 0 && text(value.customer, 500) && value.customer.trim()
    && text(value.contact, 200) && value.contact.trim() && text(value.address, 1000)
    && ['pickup', 'delivery'].includes(value.fulfillment) && (value.fulfillment !== 'delivery' || value.address.trim())
    && text(value.dueAt, 40) && Number.isFinite(Date.parse(value.dueAt))
    && text(value.createdAt, 40) && Number.isFinite(Date.parse(value.createdAt))
    && ['scheduled', 'preparing', 'ready', 'completed', 'cancelled'].includes(value.status)
    && (value.customerId === undefined || (text(value.customerId, 160) && value.customerId.trim()))
    && (value.delivery === undefined || (value.fulfillment === 'delivery' && validDelivery(value.delivery)))
    && validBusinessItems(value.items);
}
