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
      if (name.endsWith('/translations')) { const output = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/i18n/translations.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: output }); return output; }
      assert.equal(name, 'expo-print');
      return { printAsync: async (options) => { calls.push(options); } };
    },
  });
  return { ...exports, calls };
}

test('all receipt languages preserve product names and extras, including reprints', async () => {
  const printer = loadPrinter();
  const order = { plate: '7', customer: '', createdAt: '2026-09-22T18:30:00Z', items: [
    { name: 'Pizza inteira — Rúcula com tomate seco', quantity: 1, note: 'Sem cebola', extras: [{ name: 'Requeijão cremoso', placement: 'whole' }] },
    { name: 'Pizza de dois sabores', quantity: 1, note: '', flavors: ['Frango com Catupiry', 'Calabresa com cebola'], extras: [{ name: 'Mussarela', placement: 'first' }] },
  ] };
  for (const [language, title, half, success] of [['pt', 'COMANDA DE PRODUÇÃO', '1ª metade:', 'Impressora configurada com sucesso'], ['en', 'KITCHEN ORDER', '1st half:', 'Printer configured successfully'], ['es', 'COMANDA DE PRODUCCIÓN', '1.ª mitad:', 'Impresora configurada correctamente']]) {
    await printer.printOrder(order, { connection: 'system', paperWidth: '58' }, language);
    const html = printer.calls.at(-1).html;
    for (const text of [title, half, 'Rúcula com tomate seco', 'Requeijão cremoso', 'Frango com Catupiry', 'Calabresa com cebola', 'Mussarela']) assert.ok(html.includes(text), `${language}: ${text}`);
    assert.ok(printer.buildPrinterTestHtml('80', language).includes(success));
    if (language !== 'pt') assert.doesNotMatch(html, /COZINHA|Plaquinha|Não informado|ª metade/);
  }
});

for (const paperWidth of ['58', '80']) {
  test(`printer test sends its own centered document at ${paperWidth} mm`, async () => {
    const printer = loadPrinter();
    await printer.printPrinterTest({ connection: 'system', paperWidth });
    assert.equal(printer.calls.length, 1);
    const options = printer.calls[0];
    assert.match(options.html, /Impressora configurada com sucesso/);
    assert.match(options.html, /text-align: center/);
    assert.ok(options.html.includes(`size: ${paperWidth}mm 200mm`));
    assert.ok(Math.abs(options.width * 25.4 / 72 - Number(paperWidth)) < 0.2);
    assert.doesNotMatch(options.html, /Plaquinha|Cliente:|COMANDA DE PRODUÇÃO|R\$/);
  });

  test(`production receipt uses ${paperWidth} mm for both HTML and print dialog`, async () => {
    const printer = loadPrinter();
    const order = { plate: '7', customer: 'Ana & João', createdAt: '2026-09-22T18:30:00Z', items: [
      { name: 'Pizza <especial>', quantity: 2, price: 47.83, flavors: ['Calabresa', 'Queijo'], extras: [{ name: 'Bacon & alho', placement: 'second' }, { name: 'Milho', placement: 'whole' }], note: 'Sem cebola\nMolho à parte' },
    ] };
    await printer.printOrder(order, { connection: 'system', paperWidth });
    assert.equal(printer.calls.length, 1);
    const options = printer.calls[0];
    assert.ok(Math.abs(options.width * 25.4 / 72 - Number(paperWidth)) < 0.2);
    assert.ok(Math.abs(options.height * 25.4 / 72 - 200) < 0.2);
    assert.ok(options.html.includes(`size: ${paperWidth}mm 200mm`));
    assert.match(options.html, /margin: 0 auto/);
    assert.match(options.html, /text-align: center/);
    for (const value of ['Plaquinha: 7', 'Ana &amp; João', '2x Pizza &lt;especial&gt;', '1ª metade: Calabresa', '2ª metade: Queijo', '+ Bacon &amp; alho', '(2ª metade: Queijo)', '+ Milho', '(inteira)', 'Sem cebola\nMolho à parte']) {
      assert.ok(options.html.includes(value));
    }
    assert.doesNotMatch(options.html, /R\$|47[.,]83|95[.,]66|subtotal|total:/i);
  });
}

test('unsupported direct connection fails without pretending to print a test', async () => {
  const printer = loadPrinter();
  await assert.rejects(printer.printPrinterTest({ connection: 'bluetooth', paperWidth: '58' }), /Conexão direta indisponível/);
  assert.equal(printer.calls.length, 0);
});

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
