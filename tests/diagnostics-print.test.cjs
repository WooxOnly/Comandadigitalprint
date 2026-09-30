const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
function load(file) {
  const output = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(output, name => name === './server/menu.json' ? require('../server/menu.json') : require(name));
  return output;
}
const { createDiagnosticQueue } = load('src/services/diagnosticQueue.ts');
const { createPrintJob } = load('src/services/printJob.ts');
const { createOrderSubmitter } = load('src/services/orderSubmission.ts');

test('offline diagnostics survive restart and a lost acknowledgement keeps the same event id', async () => {
  const saved = new Map(), received = new Map(); let offline = true, lostAck = true;
  const storage = { getItem: async key => saved.get(key) || null, setItem: async (key, value) => saved.set(key, value) };
  const send = async entry => { if (offline) throw Error('offline'); received.set(entry.id, entry); if (lostAck) { lostAck = false; throw Error('lost ack'); } };
  const tabletId = randomUUID();
  let queue = createDiagnosticQueue(storage, randomUUID, async () => tabletId, send);
  await queue.record('print.failed', 'PRINT_TIMEOUT', randomUUID()); await queue.flush();
  assert.equal(received.size, 0);
  queue = createDiagnosticQueue(storage, randomUUID, async () => tabletId, send); offline = false;
  await queue.flush(); await queue.flush();
  assert.equal(received.size, 1);
  assert.equal([...received.values()][0].deviceId, tabletId);
  assert.deepEqual(JSON.parse([...saved.values()][0]), []);
});

test('print timeout releases print lock and does not retry or hold the order screen', async () => {
  const submitter = createOrderSubmitter(), runPrint = createPrintJob(15);
  let printed = 0, cleared = false, persisted = false;
  const result = submitter.submit({}, [], { persist: async () => { persisted = true; }, onSaved: () => { cleared = true; }, onBusy() {}, print: () => runPrint(() => { printed++; return new Promise(() => {}); }) });
  await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(persisted, true); assert.equal(cleared, true); assert.equal(submitter.busy, false);
  await assert.rejects(runPrint(async () => {}), error => error.code === 'PRINT_BUSY');
  await assert.rejects(result, error => error.code === 'PRINT_TIMEOUT');
  assert.equal(printed, 1);
  assert.equal(await runPrint(async () => 'opened'), 'opened');
});

test('old catalogs get bilingual names and ingredients without restoring excluded products or removing custom items', () => {
  const { standardizeMenu, DEFAULT_MENU } = load('menuData.ts');
  const custom = { id: 'custom', name: 'Especial da casa', category: 'Lanches', price: 0 };
  const result = standardizeMenu([{ ...DEFAULT_MENU.find(p => p.id === 'seabra-Lanches-1'), name: 'Pão com ovo', description: '' }, { id: 'seabra-Salgados-0', category: 'Salgados' }, { id: 'pizza-fatia', category: 'Fatias' }, custom]);
  assert.equal(result.length, 2); assert.equal(result[1], custom);
  assert.match(result[0].name, /Pão com ovo \/ Bread and egg roll/);
  assert.match(result[0].description, /Pão francês.*French bread/);
  assert.equal(DEFAULT_MENU.some(p => ['Fatias', 'Salgados'].includes(p.category)), false);
});
