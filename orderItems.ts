import type { Product } from './menuData';
import { translate, type Language } from './src/i18n/translations';

export type PizzaMode = 'whole' | 'halves';
export type Extra = { name: string; placement: 'whole' | 'first' | 'second' };
export type OrderItem = Omit<Product, 'price'> & { quantity: number; note: string; flavors?: string[]; extras?: Extra[] };

let sequence = 0;
export function createOrderItem(product: Product, note: string, mode: PizzaMode | null, second: Product | null, extras: Extra[]): OrderItem {
  const pizza = product.kind === 'pizza';
  const promotional = pizza && product.allowsExtras === false;
  if (pizza && !mode) throw new Error('Escolha pizza inteira ou dois sabores.');
  if (promotional && (mode !== 'whole' || extras.length)) throw new Error('Pizza promocional: somente inteira e sem adicionais.');
  if (pizza && mode === 'halves' && (!second || second.kind !== 'pizza' || second.id === product.id || second.allowsExtras === false)) throw new Error('Escolha outro sabor não promocional para a segunda metade.');
  if (mode !== 'halves' && extras.some((extra) => extra.placement !== 'whole')) throw new Error('Extras por metade exigem uma pizza de dois sabores.');
  return {
    id: `order-item-${Date.now()}-${++sequence}`, name: pizza ? (mode === 'halves' ? 'Pizza de dois sabores' : `Pizza inteira — ${product.name}`) : product.name,
    category: product.category, kind: product.kind, quantity: 1, note: note.trim(),
    ...(pizza && mode === 'halves' && second ? { flavors: [product.name, second.name] } : {}),
    extras: extras.map((extra) => ({ ...extra })),
  };
}

export function describeExtra(extra: Extra, flavors?: string[], language: Language = 'pt') {
  const location = extra.placement === 'first' ? `${translate('1ª metade:', language)} ${flavors?.[0] || ''}` : extra.placement === 'second' ? `${translate('2ª metade:', language)} ${flavors?.[1] || ''}` : translate('inteira', language);
  return `${extra.name} (${location})`;
}
