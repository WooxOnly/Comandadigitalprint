const { loadTs } = require('./helpers/load-ts.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { patchPrintModule } = require('../plugins/with-receipt-paper');

function loadPrinter(os = 'android', sendReceipt) {
  const calls = [];
  const files = [];
  const exports = {};
  const source = fs.readFileSync(require.resolve('../printerService.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name.endsWith('/printerRouting')) return loadTs('src/services/printerRouting.ts');
      if (name.endsWith('/customerReceipt')) return loadTs('src/services/customerReceipt.ts');
      if (name.endsWith('/escposReceipt')) { const output = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/services/escposReceipt.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: output, require: key => { assert.ok(key.endsWith('/translations')); const translations = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/i18n/translations.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: translations }); return translations; } }); return output; }
      if (name.endsWith('/networkPrinter')) return { sendNetworkReceipt: sendReceipt || (async () => { throw Error('Unexpected network print'); }) };
      if (name.endsWith('/translations')) { const output = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/i18n/translations.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: output }); return output; }
      if (name.endsWith('/printJob')) { const output = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/services/printJob.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: output, setTimeout, clearTimeout }); return output; }
      if (name === 'react-native') return { Platform: { OS: os } };
      assert.equal(name, 'expo-print');
      return { printToFileAsync: async (options) => { files.push(options); return { uri: 'file:///test-receipt.pdf' }; }, printAsync: async (options) => { calls.push(options); } };
    },
  });
  return { ...exports, calls, files };
}

test('all receipt languages preserve product names and extras, including reprints', async () => {
  const printer = loadPrinter();
  const order = { plate: '7', customer: '', serviceMode: 'takeout', tabletLabel: '1', dailyNumber: 3, createdAt: '2026-09-22T18:30:00Z', items: [
    { name: 'Pizza inteira — Rúcula com tomate seco', quantity: 1, note: 'Sem cebola', extras: [{ name: 'Requeijão cremoso', placement: 'whole' }] },
    { name: 'Pizza de dois sabores', quantity: 1, note: '', flavors: ['Frango com Catupiry', 'Calabresa com cebola'], extras: [{ name: 'Mussarela', placement: 'first' }] },
  ] };
  for (const [language, title, half, success, service, number] of [['pt', 'COMANDA DE PRODUÇÃO', '1ª metade:', 'Impressora configurada com sucesso', 'Tipo de pedido: Para levar', 'Pedido nº: 1-003'], ['en', 'KITCHEN ORDER', '1st half:', 'Printer configured successfully', 'Order type: To go', 'Order #: 1-003'], ['es', 'COMANDA DE PRODUCCIÓN', '1.ª mitad:', 'Impresora configurada correctamente', 'Tipo de pedido: Para llevar', 'Pedido n.º: 1-003']]) {
    await printer.printOrder(order, { connection: 'system', paperWidth: '58' }, language);
    const html = printer.files.at(-1).html;
    assert.ok(html.includes(language === 'en' ? 'Table: 7' : 'Mesa: 7'));
    for (const text of [title, half, service, number, 'Rúcula com tomate seco', 'Requeijão cremoso', 'Frango com Catupiry', 'Calabresa com cebola', 'Mussarela']) assert.ok(html.includes(text), `${language}: ${text}`);
    assert.ok(printer.buildPrinterTestHtml('80', language).includes(success));
    if (language !== 'pt') assert.doesNotMatch(html, /COZINHA|Plaquinha|Não informado|ª metade/);
  }
  assert.match(printer.buildOrderHtml({ ...order, serviceMode: 'dine_in' }, '58', 'en'), /Order type: For here/);
});

test('network test and order share saved IP/port and bypass the system dialog', async () => {
  const jobs = [];
  const printer = loadPrinter('android', async (bytes, settings) => jobs.push({ bytes: Buffer.from(bytes), settings }));
  const settings = { connection: 'wifi', address: '192.168.1.50', port: '9100', paperWidth: '80' };
  await printer.printPrinterTest(settings, 'en');
  assert.ok(jobs[0].bytes.includes(Buffer.from('PRINT TEST')));
  await printer.printOrder({ plate: '9', customer: 'Ana', dailyNumber: 8, tabletLabel: '2', createdAt: '2026-10-04T12:00:00Z', items: [{ name: 'Pizza', quantity: 2, note: 'Sem cebola' }] }, settings, 'en');
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].settings, settings);
  assert.equal(jobs[1].settings, settings);
  assert.ok(jobs[1].bytes.includes(Buffer.from('Table: 9')));
  assert.ok(jobs[1].bytes.includes(Buffer.from('Order #: 2-008')));
  assert.ok(jobs[1].bytes.includes(Buffer.from('No onion')));
  assert.equal(printer.calls.length, 0);
  assert.equal(printer.files.length, 0);
});

test('network send failures propagate to the existing diagnostics and feedback flow', async () => {
  const printer = loadPrinter('android', async () => { throw Object.assign(Error('refused'), { code: 'PRINT_NETWORK_FAILED' }); });
  await assert.rejects(printer.printPrinterTest({ connection: 'wifi', address: '192.168.1.50', port: '9100', paperWidth: '80' }), error => error.code === 'PRINT_NETWORK_FAILED');
  assert.equal(printer.calls.length, 0);
});

test('customer receipts share the network transport while kitchen orders remain without prices', async () => {
  const jobs = [];
  const sentSettings = [];
  const printer = loadPrinter('android', async (bytes, target) => { jobs.push(Buffer.from(bytes)); sentSettings.push(target); });
  const settings = { connection: 'wifi', address: '192.168.1.50', port: '9100', paperWidth: '80' };
  const receipt = { id: 'customer-receipt-123456', storeName: 'Bistro', currency: 'USD', createdAt: '2026-10-05T18:00:00Z', customer: 'Ana', items: [{ id: 'pizza', name: 'Pizza', category: 'Pizzas', quantity: 2, note: '', unitPriceCents: 1250 }], totalCents: 2500, method: 'cash', tenderedCents: 3000, changeCents: 500 };
  await printer.printCustomerReceipt(receipt, settings, 'en');
  assert.ok(jobs[0].includes(Buffer.from('NON-FISCAL RECEIPT')));
  assert.ok(jobs[0].includes(Buffer.from('$25.00')));
  assert.ok(jobs[0].includes(Buffer.from('Change: $5.00')));
  const order = { plate: '7', customer: 'Ana', createdAt: receipt.createdAt, items: receipt.items };
  await printer.printOrder(order, settings, 'en');
  assert.ok(jobs[1].includes(Buffer.from('KITCHEN ORDER')));
  assert.ok(!jobs[1].includes(Buffer.from('$25.00')));
  assert.doesNotMatch(printer.buildOrderHtml(order, '80', 'en'), /12\.50|25\.00|Total|Payment/);
  const routed = { ...settings, connection: 'system', routing: { enabled: true, receiptDestinationId: 'receipt', destinations: [{ id: 'receipt', name: 'Recibos', address: '192.168.1.51', port: '9101', paperWidth: '58', categories: [] }] } };
  await printer.printCustomerReceipt(receipt, routed, 'en');
  assert.equal(sentSettings.at(-1).address, '192.168.1.51');
  assert.equal(sentSettings.at(-1).port, '9101');
  assert.equal(sentSettings.at(-1).paperWidth, '58');
  assert.ok(jobs.at(-1).includes(Buffer.from('NON-FISCAL RECEIPT')));
  assert.equal(printer.calls.length, 0);
  assert.equal(printer.files.length, 0);
});

for (const paperWidth of ['58', '80', '88']) {
  test(`printer test sends its own centered document at ${paperWidth} mm`, async () => {
    const printer = loadPrinter();
    await printer.printPrinterTest({ connection: 'system', paperWidth });
    assert.equal(printer.calls.length, 1);
    const options = printer.calls[0];
    const html = printer.files[0].html;
    assert.equal(options.uri, 'file:///test-receipt.pdf');
    assert.match(html, /Impressora configurada com sucesso/);
    assert.match(html, /text-align: center/);
    assert.ok(html.includes(`size: ${paperWidth}mm 200mm`));
    assert.doesNotMatch(html, /Tipo de pedido|Order type/);
    assert.ok(Math.abs(options.width * 25.4 / 72 - Number(paperWidth)) < 0.2);
    assert.equal(printer.files[0].width, options.width);
    assert.doesNotMatch(html, /Mesa|Cliente:|COMANDA DE PRODUÇÃO|R\$/);
  });

  test(`production receipt uses ${paperWidth} mm for both HTML and print dialog`, async () => {
    const printer = loadPrinter();
    const order = { plate: '7', customer: 'Ana & João', createdAt: '2026-09-22T18:30:00Z', items: [
      { name: 'Pizza <especial>', quantity: 2, price: 47.83, flavors: ['Calabresa', 'Queijo'], extras: [{ name: 'Bacon & alho', placement: 'second' }, { name: 'Milho', placement: 'whole' }], note: 'Sem cebola\nMolho à parte' },
    ] };
    await printer.printOrder(order, { connection: 'system', paperWidth });
    assert.equal(printer.calls.length, 1);
    const options = printer.calls[0];
    const html = printer.files[0].html;
    assert.equal(options.uri, 'file:///test-receipt.pdf');
    assert.ok(Math.abs(options.width * 25.4 / 72 - Number(paperWidth)) < 0.2);
    assert.ok(Math.abs(options.height * 25.4 / 72 - 200) < 0.2);
    assert.equal(printer.files[0].height, options.height);
    assert.ok(html.includes(`size: ${paperWidth}mm 200mm`));
    assert.match(html, /margin: 0 auto/);
    assert.match(html, /text-align: center/);
    assert.doesNotMatch(html, /Tipo de pedido:/);
    for (const value of ['Mesa: 7', 'Ana &amp; João', '2x Pizza &lt;especial&gt;', '1ª metade: Calabresa', '2ª metade: Queijo', '+ Bacon &amp; alho', '(2ª metade: Queijo)', '+ Milho', '(inteira)', 'Sem cebola\nMolho à parte']) {
      assert.ok(html.includes(value));
    }
    assert.doesNotMatch(html, /R\$|47[.,]83|95[.,]66|subtotal|total:/i);
  });
}

test('unsupported direct connection fails without pretending to print a test', async () => {
  const printer = loadPrinter();
  await assert.rejects(printer.printPrinterTest({ connection: 'bluetooth', paperWidth: '58' }), /Conexão direta indisponível/);
  assert.equal(printer.calls.length, 0);
  assert.equal(printer.files.length, 0);
});

test('native print dialog patch is compatible with installed expo-print and idempotent', () => {
  const root = path.dirname(require.resolve('expo-print/package.json'));
  const source = fs.readFileSync(path.join(root, 'android/src/main/java/expo/modules/print/PrintModule.kt'), 'utf8');
  const patched = patchPrintModule(source);
  assert.ok(patched.includes('val width = options.width'));
  assert.ok(patched.includes('val height = options.height'));
  assert.ok(patched.includes('if (width != null && height != null'));
  assert.ok(patched.includes('"Comanda " + widthMm + " mm"'));
  assert.ok(patched.includes('PrintAttributes.Margins.NO_MARGINS'));
  assert.ok(patched.includes('PrintAttributes.MediaSize.UNKNOWN_PORTRAIT'));
  assert.equal(patchPrintModule(patched), patched);
  assert.throws(() => patchPrintModule('unrecognized native code'), /expo-print changed/);
});
