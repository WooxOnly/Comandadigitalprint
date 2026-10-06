import { DEFAULT_CASH_SETTINGS, validCashSettings } from '../../shared/cash-pricing.mjs';

export async function cashSettings(env, storeId) {
  const row = await env.DB.prepare('SELECT data FROM store_cash_settings WHERE store_id = ?').bind(storeId).first();
  return row ? JSON.parse(row.data) : { ...DEFAULT_CASH_SETTINGS, tax: { ...DEFAULT_CASH_SETTINGS.tax }, managers: [] };
}
export function canManageCash(actor, settings) { return actor.username === 'admin' || settings.managers.includes(actor.username); }
export async function validateManagers(env, storeId, settings) {
  if (!validCashSettings(settings)) return false;
  for (const name of settings.managers) {
    const row = await env.DB.prepare('SELECT data FROM store_records WHERE store_id = ? AND key = ?').bind(storeId, 'user:' + name).first();
    if (!row || !JSON.parse(row.data).active) return false;
  }
  return true;
}
