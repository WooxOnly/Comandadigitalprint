import { validProductOption, validPreparation, validActivity, validPrinterRouting } from './operations-validation.mjs';
import { isValidMenu } from './menu-validation.mjs';
import { validPreorder, validCustomer } from './business-validation.mjs';
const text = (v, max) => typeof v === 'string' && v.length <= max;
export function validCloudValue(key, value) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('product-option:')) return validProductOption(value) && key === 'product-option:' + value.productId;
  if (key.startsWith('preparation:')) return validPreparation(value) && key === 'preparation:' + value.orderId;
  if (key.startsWith('activity:')) return validActivity(value) && key === 'activity:' + value.id;
  if (key.startsWith('customer:')) return validCustomer(value) && key === 'customer:' + value.id;
  if (key.startsWith('preorder:')) return validPreorder(value) && key === 'preorder:' + value.id;
  if (/^(printer|language):[a-f0-9-]{36}$/.test(key)) return validCloudValue(key.split(':')[0], value);
  if (/^device:[a-f0-9-]{36}$/.test(key)) return value && key === 'device:' + value.id && text(value.name, 80) && value.name.length > 0;
  if (key === 'menu') return isValidMenu(value);
  if (key === 'language') return ['pt', 'en', 'es'].includes(value);
  if (key === 'order-settings') return value && typeof value.requireCustomer === 'boolean';
  if (key === 'printer') return value && ['system', 'wifi', 'bluetooth', 'usb'].includes(value.connection) && ['58', '80', '88'].includes(value.paperWidth) && ['name', 'address', 'port'].every((k) => text(value[k], 200)) && (value.automatic === undefined || typeof value.automatic === 'boolean') && (value.routing === undefined || validPrinterRouting(value.routing));
  if (key === 'logo') return value === null || (text(value, 700000) && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value));
  if (/^user:[a-z0-9._-]{3,24}$/.test(key)) return value && key === 'user:' + value.username && value.username !== 'admin' && typeof value.active === 'boolean' && /^[a-f0-9]{32}$/.test(value.login?.salt) && /^[a-f0-9]{64}$/.test(value.login?.hash) && [100000, 600000].includes(value.login.iterations ?? 600000);
  if (key.startsWith('order:')) return value && text(value.id, 160) && value.id.length > 0 && key === 'order:' + value.id && text(value.plate, 200) && text(value.customer, 500) && (value.serviceMode === undefined || ['dine_in', 'takeout'].includes(value.serviceMode)) && text(value.createdAt, 40) && Number.isFinite(Date.parse(value.createdAt)) && (value.dailyNumber === undefined || (Number.isSafeInteger(value.dailyNumber) && value.dailyNumber > 0)) && (value.numberDay === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value.numberDay)) && (value.tabletLabel === undefined || /^[A-Za-z0-9]{1,16}$/.test(value.tabletLabel)) && Array.isArray(value.items) && value.items.length > 0 && value.items.length <= 200 && value.items.every((item) => item && text(item.id, 200) && text(item.name, 200) && text(item.category, 100) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 9999 && text(item.note, 4000) && (item.productId === undefined || (text(item.productId, 120) && item.productId.trim())) && (item.secondProductId === undefined || (text(item.secondProductId, 120) && item.secondProductId.trim())) && (!item.flavors || (Array.isArray(item.flavors) && item.flavors.length <= 2 && item.flavors.every((f) => text(f, 200)))) && (!item.extras || (Array.isArray(item.extras) && item.extras.length <= 100 && item.extras.every((e) => e && text(e.name, 200) && ['whole', 'first', 'second'].includes(e.placement)))));
  return false;
}
