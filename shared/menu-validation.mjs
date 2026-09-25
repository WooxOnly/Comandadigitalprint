export const MAX_BODY_BYTES = 1024 * 1024;
export function isValidMenu(menu) {
  if (!Array.isArray(menu) || menu.length > 500) return false;
  const ids = new Set();
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  return menu.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
      !text(item.id, 120) || ids.has(item.id.trim()) || !text(item.name, 200) || !text(item.category, 100) ||
      typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 || item.price > 1000000 ||
      (item.kind !== undefined && item.kind !== 'pizza') ||
      (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > 2000)) ||
      (item.code !== undefined && (typeof item.code !== 'string' || item.code.length > 100)) ||
      (item.allowsExtras !== undefined && typeof item.allowsExtras !== 'boolean')) return false;
    ids.add(item.id.trim());
    return true;
  });
}
