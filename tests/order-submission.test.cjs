const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL });
  return exports;
}
const { createOrderSubmitter } = load('../src/services/orderSubmission.ts');
const { persistSettings, normalizeMenuUrl, PRINTER_SETTINGS_KEY } = load('../src/services/settings.ts');

test('double tap saves and prints once, only clearing after persistence completes', async () => {
  const submitter = createOrderSubmitter();
  const events = [];
  let finish;
  const saved = new Promise((resolve) => { finish = resolve; });
  const actions = {
    onBusy: (busy) => events.push(busy ? 'busy' : 'idle'),
    persist: async () => { events.push('persist'); await saved; },
    onSaved: (history) => { assert.equal(history.length, 2); events.push('clear'); },
    print: async () => events.push('print'),
  };
  const first = submitter.submit({ id: 'new' }, [{ id: 'old' }], actions);
  assert.equal(await submitter.submit({ id: 'duplicate' }, [], actions), 'busy');
  assert.deepEqual(events, ['busy', 'persist']);
  finish();
  assert.equal(await first, 'saved');
  assert.deepEqual(events, ['busy', 'persist', 'clear', 'print', 'idle']);
});

test('save failure retains the draft and unlocks retry without printing', async () => {
  const submitter = createOrderSubmitter();
  let cleared = 0, printed = 0;
  const actions = { onBusy() {}, persist: async () => { throw new Error('disk full'); }, onSaved: () => cleared++, print: async () => { printed++; } };
  await assert.rejects(submitter.submit({}, [], actions), /disk full/);
  assert.equal(cleared, 0); assert.equal(printed, 0); assert.equal(submitter.busy, false);
  await submitter.submit({}, [], { ...actions, persist: async () => {} });
  assert.equal(cleared, 1); assert.equal(printed, 1);
});

test('printing failure occurs after persistence and releases the send lock', async () => {
  const submitter = createOrderSubmitter();
  let committed = false;
  await assert.rejects(submitter.submit({}, [], { onBusy() {}, persist: async () => {}, onSaved: () => { committed = true; }, print: async () => { throw new Error('offline'); } }), /offline/);
  assert.equal(committed, true); assert.equal(submitter.busy, false);
});

test('printer settings no longer require or store a menu address', async () => {
  let key, value;
  await persistSettings({ setItem: async (k, v) => { key = k; value = v; } }, { paperWidth: '58' });
  assert.equal(key, PRINTER_SETTINGS_KEY);
  assert.equal(JSON.parse(value).paperWidth, '58');
  for (const invalid of ['abc', 'http://example.com/menu', 'https://user:secret@example.com/menu']) assert.throws(() => normalizeMenuUrl(invalid), /HTTPS/);
  await assert.rejects(persistSettings({ setItem: async () => { throw new Error('storage failed'); } }, {}), /storage failed/);
});
