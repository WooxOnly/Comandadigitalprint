export const ORDER_SETTINGS_KEY = '@comandadigitalprint/order-settings';
export type OrderSettings = { requireCustomer: boolean };
export const DEFAULT_ORDER_SETTINGS: OrderSettings = { requireCustomer: false };

export function parseOrderSettings(stored: string | null): OrderSettings {
  if (!stored) return DEFAULT_ORDER_SETTINGS;
  const value = JSON.parse(stored);
  return { requireCustomer: value?.requireCustomer === true };
}

export function customerValidationMessage(customer: string, required: boolean) {
  return required && !customer.trim() ? 'Informe o nome do cliente antes de enviar a comanda.' : '';
}
