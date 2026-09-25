const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const catalog = require('../server/menu.json');

function loadModule(file) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, { exports, require: () => catalog });
  return exports;
}
const { createOrderItem, describeExtra } = loadModule('../orderItems.ts');
const { isDemoMenu, TOPPINGS } = loadModule('../menuData.ts');
const pizzas = catalog.filter((item) => item.kind === 'pizza');
const promo = pizzas.find((item) => item.allowsExtras === false);
const [first, second] = pizzas.filter((item) => item.allowsExtras !== false);

test('catalog contains all photographed categories and 24 distinct extras', () => {
  assert.equal(catalog.length, 41);
  assert.equal(new Set(catalog.map((item) => item.id)).size, 41);
  assert.equal(pizzas.length, 15);
  assert.equal(pizzas.filter((item) => item.allowsExtras === false).length, 2);
  assert.equal(TOPPINGS.length, 24);
  assert.equal(new Set(TOPPINGS).size, 24);
  assert.ok(!catalog.find((item) => item.id === 'pizza-fatia').kind);
});

test('two flavors require an explicit valid second choice', () => {
  assert.throws(() => createOrderItem(first, '', null, null, []), /Escolha/);
  for (const invalid of [null, first, promo, catalog[0]]) {
    assert.throws(() => createOrderItem(first, '', 'halves', invalid, []), /outro sabor/);
  }
});

test('promotional pizzas are whole and have no extras', () => {
  assert.match(createOrderItem(promo, 'Sem molho', 'whole', null, []).name, /Pizza inteira/);
  assert.throws(() => createOrderItem(promo, '', 'halves', second, []), /promocional/);
  assert.throws(() => createOrderItem(promo, '', 'whole', null, [{ name: 'Bacon', placement: 'whole' }]), /promocional/);
});

test('customizations survive saving and duplicate products get independent line IDs', () => {
  const extras = [{ name: 'Bacon', placement: 'second' }, { name: 'Milho', placement: 'whole' }];
  const a = createOrderItem(first, ' Sem cebola ', 'halves', second, extras);
  const b = createOrderItem(first, '', 'halves', second, []);
  assert.notEqual(a.id, b.id);
  assert.equal(a.note, 'Sem cebola');
  assert.equal(a.flavors[0], first.name);
  assert.equal(a.flavors[1], second.name);
  assert.ok(!('price' in a));
  const saved = JSON.parse(JSON.stringify(a));
  assert.equal(saved.extras[0].placement, 'second');
  assert.equal(describeExtra(saved.extras[0], saved.flavors), `Bacon (2ª metade: ${second.name})`);
  extras[0].name = 'Alterado';
  assert.equal(a.extras[0].name, 'Bacon');
  assert.throws(() => createOrderItem(first, '', 'whole', null, a.extras), /por metade/);
});

test('only the untouched old demo menu is automatically replaced', () => {
  const demo = [
    { id: 'item-1', name: 'Produto de exemplo', category: 'Lanches', price: 0 },
    { id: 'item-2', name: 'Pizza de exemplo', category: 'Pizzas', price: 0 },
    { id: 'item-3', name: 'Bebida de exemplo', category: 'Bebidas', price: 0 },
  ];
  assert.equal(isDemoMenu(demo), true);
  demo[0].name = 'Produto editado';
  assert.equal(isDemoMenu(demo), false);
  assert.equal(isDemoMenu(catalog), false);
  assert.equal(isDemoMenu([]), false);
});
