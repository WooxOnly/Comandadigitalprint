import type { Product } from '../../menuData';
import { isDemoMenu } from '../../menuData';
import { isValidMenu } from '../../shared/menu-validation.mjs';

function menuSignature(menu: Product[]) {
  // Fixed field order prevents JSON property ordering from causing false updates.
  return JSON.stringify(menu.map((item) => [item.id, item.name, item.category, item.price, item.kind ?? null, item.description ?? '', item.code ?? '', item.allowsExtras ?? true]));
}

export async function applyMenuUpdate(current: Product[], remote: unknown, persist: (menu: Product[]) => Promise<void>) {
  if (!isValidMenu(remote) || isDemoMenu(remote as Product[])) throw new Error('Cardápio recebido inválido');
  const next = remote as Product[];
  if (menuSignature(current) === menuSignature(next)) return false;
  await persist(next);
  return true;
}
