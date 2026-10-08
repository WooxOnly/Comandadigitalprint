import { validPreparationTimes } from './preparation-times.mjs';
const text = (value, max) => typeof value === 'string' && value.length <= max;
export const ACCESS_ACTIONS = ['menu', 'settings', 'reprint', 'restore'];
export const DEFAULT_ACCESS = Object.freeze({ menu: null, settings: null, reprint: null, restore: null });
export function validAccess(value) {
  return value && Object.keys(value).length === 4 && ACCESS_ACTIONS.every(action => value[action] === null || (Array.isArray(value[action]) && value[action].length <= 20 && new Set(value[action]).size === value[action].length && value[action].every(name => /^[a-z0-9._-]{3,24}$/.test(name) && name !== 'admin')));
}
export function allowedAccess(access, action, username) {
  return username === 'admin' || (ACCESS_ACTIONS.includes(action) && (access?.[action] == null || access[action].includes(username)));
}
export function validProductOption(value) {
  return value && text(value.productId, 120) && value.productId.trim() && typeof value.available === 'boolean' && typeof value.favorite === 'boolean';
}
export function validPreparation(value) {
  return value && text(value.orderId, 160) && value.orderId.trim() && ['received', 'preparing', 'ready', 'completed'].includes(value.status) && text(value.updatedAt, 40) && Number.isFinite(Date.parse(value.updatedAt)) && validPreparationTimes(value);
}
export function validActivity(value) {
  return value && text(value.id, 80) && /^[a-zA-Z0-9-]{16,80}$/.test(value.id) && ['print', 'reprint', 'restore', 'portal', 'preparation'].includes(value.kind) && text(value.target, 200) && text(value.details, 1000) && text(value.createdAt, 40) && Number.isFinite(Date.parse(value.createdAt));
}
export function validPrinterRouting(value) {
  if (!value || typeof value.enabled !== 'boolean' || !Array.isArray(value.destinations) || value.destinations.length > 8) return false;
  const ids = new Set(), categories = new Set();
  for (const target of value.destinations) {
    if (!target || !text(target.id, 80) || !target.id.trim() || ids.has(target.id) || !text(target.name, 200) || !target.name.trim() || !text(target.address, 200) || !text(target.port, 200) || !['58', '80', '88'].includes(target.paperWidth) || !Array.isArray(target.categories) || target.categories.length > 100 || target.categories.some(category => !text(category, 100) || !category.trim() || categories.has(category))) return false;
    if (new Set(target.categories).size !== target.categories.length) return false;
    if (value.enabled && (target.address.split('.').length !== 4 || target.address.split('.').some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255) || (target.port && (!/^\d+$/.test(target.port) || Number(target.port) < 1 || Number(target.port) > 65535)))) return false;
    ids.add(target.id); for (const category of target.categories) categories.add(category);
  }
  return value.receiptDestinationId === undefined || ids.has(value.receiptDestinationId);
}
