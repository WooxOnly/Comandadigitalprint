const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const { EventEmitter } = require('node:events');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, modules = {}) {
  const output = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('exports', 'require', compiled)(output, name => modules[name] || require(name));
  return output;
}
const translations = load('src/i18n/translations.ts');
const receipt = load('src/services/escposReceipt.ts', { '../i18n/translations': translations });
const { createNetworkPrinterSender, getNetworkPrinterEndpoint } = load('src/services/networkPrintTransport.ts');
const endpoint = { address: '192.168.1.50', port: '9100' };
const testBytes = receipt.buildPrinterTestEscpos('80');

class TestSocket extends EventEmitter {
  writes = [];
  destroyed = false;
  ended = false;
  connect(options) { this.options = options; }
  write(data, encoding, callback) { this.writes.push(Buffer.from(data)); this.callback = callback; }
  end() { this.ended = true; }
  destroy() { this.destroyed = true; this.emit('close'); }
}

test('ESC/POS network receipt preserves production fields, accents and line breaks without prices', () => {
  const order = { plate: '7', customer: 'Ana', serviceMode: 'takeout', dailyNumber: 3, tabletLabel: '1', createdAt: '2026-10-04T12:00:00Z', items: [
    { name: 'Pizza de dois sabores', quantity: 2, price: 47.83, flavors: ['Frango', 'Calabresa'], extras: [{ name: 'Mussarela', placement: 'second' }], note: 'Sem cebola\nMolho separado' },
  ] };
  const bytes = Buffer.from(receipt.buildOrderEscpos(order, '80'));
  for (const text of ['Mesa: 7', 'Cliente: Ana', 'Pedido n', '1-003', '2x Pizza', 'Frango', 'Calabresa', '+ Mussarela', 'Molho separado']) assert.ok(bytes.includes(Buffer.from(text)), text);
  assert.ok(bytes.includes(Buffer.from([0x0a, ...Buffer.from('Molho separado'), 0x0a])));
  assert.ok(bytes.subarray(0, 9).equals(Buffer.from([0x1b, 0x40, 0x1c, 0x2e, 0x1b, 0x74, 2, 0x1b, 0x4d])));
  assert.ok(bytes.subarray(-3).equals(Buffer.from([0x1d, 0x56, 1])));
  for (const text of ['R$', '47.83', '95.66', 'subtotal']) assert.equal(bytes.includes(Buffer.from(text)), false);
  // Reference bytes from the standard CP850 character table, independent of the encoder.
  assert.equal(Buffer.from(receipt.encodePrinterText('á é í ó ú ã õ ç ñ ü')).toString('hex'), 'a0208220a120a220a320c620e4208720a42081');
  const translatedOrder = { ...order, items: [{ ...order.items[0], note: 'Sem cebola' }] };
  assert.ok(Buffer.from(receipt.buildOrderEscpos(translatedOrder, '80', 'en')).includes(Buffer.from('No onion')));
  assert.ok(Buffer.from(receipt.buildOrderEscpos(translatedOrder, '80', 'es')).includes(Buffer.from('Sin cebolla')));
});

test('ESC/POS wrapping fits the paper and user text cannot insert control commands', () => {
  for (const [width, columns] of [['58', 32], ['80', 48], ['88', 48]]) {
    const bytes = Buffer.from(receipt.buildOrderEscpos({ plate: '2', customer: '', createdAt: '2026-10-04T12:00:00Z', items: [{ name: 'A'.repeat(100), quantity: 1, note: '\x1b@\x1dV\x00\x07\nBom' }] }, width));
    const plain = bytes.toString('latin1').replace(/\x1b@|\x1c\.|\x1b[tMaEd][\s\S]|\x1d[!V][\s\S]/g, '');
    assert.ok(plain.split('\n').every(line => line.length <= columns));
    assert.equal(bytes.indexOf(Buffer.from([0x1b, 0x40]), 2), -1);
    assert.equal(bytes.includes(Buffer.from([0x07])), false);
    assert.ok(bytes.includes(Buffer.from('Bom')));
  }
});

test('network endpoint validates before opening a socket and uses 9100 for an empty port', async () => {
  assert.deepEqual(getNetworkPrinterEndpoint({ address: ' 192.168.001.050 ', port: ' ' }), { host: '192.168.1.50', port: 9100 });
  let opened = 0;
  const send = createNetworkPrinterSender(() => { opened++; return new TestSocket(); });
  for (const address of ['', 'http://192.168.1.50', '192.168.1', '256.1.1.1', '192.168.1.-1']) {
    await assert.rejects(send(testBytes, { ...endpoint, address }), error => error.code === 'PRINT_INVALID_ADDRESS');
  }
  for (const port of ['0', '65536', '-1', '9100.5', 'abc']) {
    await assert.rejects(send(testBytes, { ...endpoint, port }), error => error.code === 'PRINT_INVALID_PORT');
  }
  assert.equal(opened, 0);
});

test('network print succeeds only after write acknowledgement, and sends exactly once', async () => {
  const socket = new TestSocket();
  let done = false;
  const result = createNetworkPrinterSender(() => socket)(testBytes, endpoint).then(() => { done = true; });
  socket.emit('connect');
  await Promise.resolve();
  assert.equal(done, false);
  assert.equal(socket.writes.length, 1);
  assert.deepEqual(socket.writes[0], Buffer.from(testBytes));
  socket.callback();
  await result;
  assert.equal(done, true);
  assert.equal(socket.ended, true);
});

test('connection refusal and partial-write errors close without automatic resending', async () => {
  for (const writing of [false, true]) {
    const socket = new TestSocket();
    const result = createNetworkPrinterSender(() => socket)(testBytes, endpoint);
    if (writing) socket.emit('connect');
    socket.emit('error', Error('connection lost'));
    await assert.rejects(result, error => error.code === (writing ? 'PRINT_DELIVERY_UNKNOWN' : 'PRINT_NETWORK_FAILED'));
    assert.equal(socket.destroyed, true);
    assert.equal(socket.writes.length, writing ? 1 : 0);
    socket.emit('connect');
    assert.equal(socket.writes.length, writing ? 1 : 0);
  }
});

test('timeout destroys the socket and a late connection/write cannot report success', async () => {
  for (const writing of [false, true]) {
    const socket = new TestSocket();
    const result = createNetworkPrinterSender(() => socket, 10)(testBytes, endpoint);
    if (writing) socket.emit('connect');
    await assert.rejects(result, error => error.code === 'PRINT_TIMEOUT');
    assert.equal(socket.destroyed, true);
    socket.emit('connect');
    socket.callback?.();
    assert.equal(socket.writes.length, writing ? 1 : 0);
    assert.equal(socket.ended, false);
  }
});

test('TCP printer receives the complete ESC/POS test through an actual socket', async t => {
  const received = [];
  let complete;
  const output = new Promise(resolve => { complete = resolve; });
  const server = net.createServer(socket => {
    socket.on('data', bytes => received.push(bytes));
    socket.on('end', () => complete(Buffer.concat(received)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  await createNetworkPrinterSender(() => new net.Socket())(testBytes, { address: '127.0.0.1', port: String(server.address().port) });
  assert.deepEqual(await output, Buffer.from(testBytes));
});

test('browser and APKs without the TCP module report a clear error without loading native code', async () => {
  for (const platform of [{ OS: 'web' }, { OS: 'android' }]) {
    const adapter = load('src/services/networkPrinter.ts', {
      'react-native': { Platform: platform, NativeModules: {} },
      './networkPrintTransport': { createNetworkPrinterSender, getNetworkPrinterEndpoint },
    });
    await assert.rejects(adapter.sendNetworkReceipt(testBytes, endpoint), error => error.code === 'PRINT_NETWORK_UNAVAILABLE');
  }
});

test('the native adapter loads the TCP module only for a network print', async () => {
  const socket = new TestSocket();
  const adapter = load('src/services/networkPrinter.ts', {
    'react-native': { Platform: { OS: 'android' }, NativeModules: { TcpSockets: {} } },
    './networkPrintTransport': { createNetworkPrinterSender, getNetworkPrinterEndpoint },
    'react-native-tcp-socket': { Socket: function () { return socket; } },
  });
  const result = adapter.sendNetworkReceipt(testBytes, endpoint);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(socket.options.host, endpoint.address);
  socket.emit('connect');
  socket.callback();
  await result;
  assert.equal(socket.writes.length, 1);
});

test('native TCP Gradle namespace patch supports the installed library and is idempotent', () => {
  const { patchTcpGradle, patchTcpManifest } = require('../plugins/with-network-printer');
  const source = fs.readFileSync('node_modules/react-native-tcp-socket/android/build.gradle', 'utf8');
  const patched = patchTcpGradle(source);
  assert.match(patched, /namespace "com\.asterinet\.react\.tcpsocket"/);
  assert.equal(patchTcpGradle(patched), patched);
  assert.throws(() => patchTcpGradle('unexpected native source'), /must be reviewed/);
  const manifest = fs.readFileSync('node_modules/react-native-tcp-socket/android/src/main/AndroidManifest.xml', 'utf8');
  const patchedManifest = patchTcpManifest(manifest);
  assert.doesNotMatch(patchedManifest, /package=/);
  assert.equal(patchTcpManifest(patchedManifest), patchedManifest);
});
