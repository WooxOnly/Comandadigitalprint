export const APP_ROLES = Object.freeze(['admin', 'manager', 'cashier', 'cook']);
export const ROLE_LABELS = Object.freeze({ admin: 'Admin', manager: 'Gerente', cashier: 'Operador de caixa', cook: 'Cozinheiro' });
export function validRole(role) { return APP_ROLES.includes(role); }
// Existing accounts retain their credentials; missing profiles start restricted.
export function appRole(username, role) { return !username ? null : username === 'admin' ? 'admin' : role === undefined ? 'cashier' : validRole(role) ? role : null; }
const screens = { admin: ['home','order','menu','history','printer','backups','preparation','preorders','customers','cash','cash-reports'], manager: ['home','order','menu','history','preparation','preorders','customers','cash','cash-reports'], cashier: ['home','order','history','preorders','cash'], cook: ['preparation'] };
const moduleFor = { preparation: 'preparation', preorders: 'preorders', customers: 'customers', cash: 'cash', 'cash-reports': 'cash' };
export function roleScreen(role, screen, modules) {
  return validRole(role) && !!screens[role]?.includes(screen) && (!modules || !moduleFor[screen] || !!modules[moduleFor[screen]]);
}
export function pathScreen(path) { return path === '/' ? 'home' : path.startsWith('/history/') ? 'history' : path.slice(1); }
export function roleAction(role, action) {
  if (role === 'admin') return true;
  if (action === 'settings' || action === 'restore') return false;
  if (action === 'menu') return role === 'manager';
  if (action === 'reprint') return ['manager','cashier','cook'].includes(role);
  return false;
}
export function roleWrite(role, key, value) {
  if (role === 'admin') return true;
  if (key.startsWith('device:')) return validRole(role) && value?.id === key.slice(7) && value?.name === 'Tablet ' + value.id.slice(0,8);
  if (key === 'language' || key.startsWith('language:')) return true;
  if (key.startsWith('user:')) return false; // Own password handled separately.
  if (key === 'menu' || key.startsWith('product-option:')) return role === 'manager';
  if (key.startsWith('order:') || key.startsWith('preorder:')) return ['manager','cashier'].includes(role);
  if (key.startsWith('preparation:')) return ['manager','cook'].includes(role);
  if (key.startsWith('customer:')) return role === 'manager';
  if (key.startsWith('activity:')) return value?.kind === 'restore' ? false : ['manager','cashier','cook'].includes(role);
  return false;
}

export function roleRead(role, key) {
  if (!validRole(role)) return false;
  return role !== 'cook' || /^(order:|preparation:|printer(?::|$)|language(?::|$)|device:|user:|logo$)/.test(key);
}
