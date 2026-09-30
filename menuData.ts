import catalog from './server/menu.json';

export type Product = {
  id: string; name: string; category: string; price: number; kind?: 'pizza';
  description?: string; code?: string; allowsExtras?: boolean;
};
export const DEFAULT_MENU = catalog as Product[];
export const TOPPINGS = [
  'Molho', 'Frango', 'Calabresa', 'Cebola', 'Presunto', 'Pepperoni',
  'Azeitona', 'Milho', 'Lombo', 'Bacon', 'Tomate', 'Gorgonzola',
  'Parmesão', 'Mussarela', 'Ovo', 'Abacaxi', 'Tomate seco', 'Rúcula',
  'Alho', 'Brócolis', 'Palmito', 'Atum', 'Requeijão cremoso', 'Prosciutto',
];

// Preserve custom catalogs when updating an existing installation.
export function isDemoMenu(menu: Product[]) {
  return menu.length === 3 && [
    ['item-1', 'Produto de exemplo', 'Lanches'],
    ['item-2', 'Pizza de exemplo', 'Pizzas'],
    ['item-3', 'Bebida de exemplo', 'Bebidas'],
  ].every(([id, name, category]) => menu.some((item) => item.id === id && item.name === name && item.category === category && item.price === 0));
}

// Canonical names from the photographed menu also apply to older synced catalogs.
export function standardizeMenu(menu: Product[]): Product[] {
  return menu.filter(product => !['Salgados', 'Fatias'].includes(product.category) && product.id !== 'pizza-fatia').map(product => {
    const original = DEFAULT_MENU.find(item => item.id === product.id);
    return original && product.id.startsWith('seabra-') ? { ...product, name: original.name, description: original.description } : product;
  });
}
