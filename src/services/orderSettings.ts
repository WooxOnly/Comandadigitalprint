export const ORDER_SETTINGS_KEY = '@comandadigitalprint/order-settings';
export type OrderSettings = { requireCustomer: boolean; requireTableForTakeout: boolean };
export const DEFAULT_ORDER_SETTINGS: OrderSettings = { requireCustomer: false, requireTableForTakeout: false };

export function parseOrderSettings(stored: string | null): OrderSettings {
  if (!stored) return DEFAULT_ORDER_SETTINGS;
  const value = JSON.parse(stored);
  return { requireCustomer: value?.requireCustomer === true, requireTableForTakeout: value?.requireTableForTakeout === true };
}

export function customerValidationMessage(customer: string, required: boolean) {
  return required && !customer.trim() ? 'Informe o nome do cliente antes de enviar a comanda.' : '';
}

export function tableValidationMessage(mode: 'dine_in' | 'takeout' | null, table: string, requireForTakeout = false) {
  if (table.trim() && !/^\d{1,3}$/.test(table.trim())) return 'Informe uma mesa com até 3 dígitos.';
  return (mode === 'dine_in' || requireForTakeout) && !table.trim() ? 'Escolha uma mesa antes de avançar.' : '';
}
