const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { patchPrintModule } = require('../plugins/with-receipt-paper');

function loadPrinter() {
  const calls = [];
  const exports = {};
  const source = fs.readFileSync(require.resolve('../printerService.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.equal(name, 'expo-print');
      return { printAsync: async (options) => { calls.push(options); } };
    },
  });
  return { ...exports, calls };
}

for (const paperWidth of ['58', '80']) {
  test(`production receipt uses ${paperWidth} mm for both HTML and print dialog`, async () => {
    const printer = loadPrinter();
    const order = { plate: '7', customer: 'Ana & João', createdAt: '2026-09-22T18:30:00Z', items: [
      { name: 'Pizza <especial>', quantity: 2, price: 47.83, flavors: ['Calabresa', 'Queijo'], note: 'Sem cebola\nMolho à parte' },
    ] };
    await printer.printOrder(order, { connection: 'system', paperWidth });
    assert.equal(printer.calls.length, 1);
    const options = printer.calls[0];
    assert.ok(Math.abs(options.width * 25.4 / 72 - Number(paperWidth)) < 0.2);
    assert.ok(Math.abs(options.height * 25.4 / 72 - 200) < 0.2);
    assert.ok(options.html.includes(`size: ${paperWidth}mm 200mm`));
    assert.match(options.html, /margin: 0 auto/);
    assert.match(options.html, /text-align: center/);
    for (const value of ['Plaquinha: 7', 'Ana &amp; João', '2x Pizza &lt;especial&gt;', 'Calabresa / Queijo', 'Sem cebola\nMolho à parte']) {
      assert.ok(options.html.includes(value));
    }
    assert.doesNotMatch(options.html, /R\$|47[.,]83|95[.,]66|subtotal|total:/i);
  });
}

test('native print dialog patch is compatible with installed expo-print and idempotent', () => {
  const root = path.dirname(require.resolve('expo-print/package.json'));
  const source = fs.readFileSync(path.join(root, 'android/src/main/java/expo/modules/print/PrintModule.kt'), 'utf8');
  const patched = patchPrintModule(source);
  assert.ok(patched.includes('val width = options.width'));
  assert.ok(patched.includes('val height = options.height'));
  assert.ok(patched.includes('"Comanda " + widthMm + " mm"'));
  assert.ok(patched.includes('PrintAttributes.Margins.NO_MARGINS'));
  assert.ok(patched.includes('PrintAttributes.MediaSize.UNKNOWN_PORTRAIT'));
  assert.equal(patchPrintModule(patched), patched);
  assert.throws(() => patchPrintModule('unrecognized native code'), /expo-print changed/);
});
