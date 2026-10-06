import type { Product } from '../../menuData';
export type ProductOption = { productId: string; available: boolean; favorite: boolean };
export type CatalogOptions = Record<string, ProductOption>;
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function searchCatalog(menu: Product[], options: CatalogOptions, query = '', favoritesOnly = false) {
  const needle = normalize(query.trim());
  return menu.filter(product => (!favoritesOnly || options[product.id]?.favorite) && normalize([product.name, product.category, product.subcategory, product.description].filter(Boolean).join(' ')).includes(needle))
    .sort((a, b) => Number(!!options[b.id]?.favorite) - Number(!!options[a.id]?.favorite));
}
export const isProductAvailable = (id: string, options: CatalogOptions) => options[id]?.available !== false;
