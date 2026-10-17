import { describeExtra, type OrderItem } from '../../orderItems';
import type { Product } from '../../menuData';
import { translate, type Language } from '../i18n/translations';
import type { BusinessItem } from './business';
export function businessItemFromSelection(item: OrderItem, menu: Product[], priced: boolean, language: Language = 'pt'): BusinessItem {
  const details = [item.note, ...(item.flavors ?? []).map((name, index) => `${translate(index === 0 ? '1ª metade:' : '2ª metade:', language)} ${name}`), ...(item.extras ?? []).map(extra => describeExtra(extra, item.flavors, language))].filter(Boolean).join('\n');
  if (details.length > 4000) throw new Error('Observações acima do limite permitido.');
  const prices = [item.productId, item.secondProductId].filter(Boolean).map(id => menu.find(product => product.id === id)?.price);
  if (priced && (!prices.length || prices.some(price => typeof price !== 'number' || !Number.isFinite(price) || price < 0))) throw new Error('Confira os preços e as quantidades dos itens.');
  return { id: item.id, productId: item.productId, name: item.name, category: item.category, quantity: item.quantity, note: details, ...(priced ? { unitPriceCents: Math.round(Math.max(...prices as number[]) * 100) } : {}) };
}
