const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadTs } = require('./helpers/load-ts.cjs');
const { createOrderSubmitter } = loadTs('src/services/orderSubmission.ts');
const { createPrintDispatcher } = loadTs('src/services/printerRouting.ts');
const order = { plate: '1', customer: '', createdAt: '2026-10-08T10:00:00Z', items: [{ name: 'Pizza', category: 'Pizzas', quantity: 1, note: '' }, { name: 'Bread', category: 'Bread', quantity: 1, note: '' }] };
const main = { connection: 'wifi', name: 'Main', address: '192.168.1.50', port: '9100', paperWidth: '80', automatic: true };
const routed = { ...main, routing: { enabled: true, destinations: [{ id: 'pizza', name: 'Pizza station', address: '192.168.1.51', port: '9100', paperWidth: '80', categories: ['Pizzas'] }] } };
test('automatic printing starts only after a saved order and does not repeat on double submit', async () => {
  const submitter = createOrderSubmitter(), dispatcher = createPrintDispatcher(), events = [], completed = new Set();
  let persist; const stored = new Promise(resolve => { persist = resolve; });
  const actions = { persist: async () => { events.push('persist'); await stored; }, onSaved: () => events.push('clear'), onBusy: busy => events.push(busy ? 'saving' : 'saved'), print: value => dispatcher.run(value, main, completed, { automatic: true, onPlan: async () => events.push('audit'), send: async () => events.push('send'), onSent: () => events.push('ack') }) };
  const task = submitter.submit(order, [], actions); assert.equal(await submitter.submit(order, [], actions), 'busy'); assert.equal(events.includes('send'), false); persist(); await task;
  assert.deepEqual(events, ['saving', 'persist', 'clear', 'saved', 'audit', 'send', 'ack']); assert.deepEqual([...completed], ['default']);
});
test('dispatcher locks before audit resolves and prevents another full print plan', async () => {
  const dispatcher = createPrintDispatcher(); let release, sent = 0, audits = 0;
  const audit = new Promise(resolve => { release = resolve; });
  const actions = { automatic: true, onPlan: async () => { audits++; await audit; }, send: async () => { sent++; }, onSent() {} };
  const task = dispatcher.run(order, main, new Set(), actions); assert.equal(dispatcher.busy, true); assert.equal(await dispatcher.run(order, main, new Set(), actions), null); assert.equal(audits, 1); release(); await task; assert.equal(sent, 1); assert.equal(dispatcher.busy, false);
});
test('partial automatic failure retains acknowledgments and explicit retry skips already sent destinations', async () => {
  const dispatcher = createPrintDispatcher(), completed = new Set(), sent = []; let fail = true;
  const actions = { automatic: true, onPlan: async () => {}, send: async job => { sent.push(job.id); if (job.id === 'default' && fail) throw Error('connection lost'); }, onSent() {} };
  await assert.rejects(dispatcher.run(order, routed, completed, actions), /connection lost/); assert.deepEqual(sent, ['pizza', 'default']); assert.deepEqual([...completed], ['pizza']); assert.equal(dispatcher.busy, false);
  await Promise.resolve(); assert.deepEqual(sent, ['pizza', 'default']); fail = false; await dispatcher.run(order, routed, completed, { ...actions, automatic: false }); assert.deepEqual(sent, ['pizza', 'default', 'default']); assert.deepEqual([...completed], ['pizza', 'default']);
});
test('automatic printing refuses system dialogs and invalid endpoints before any audit or send', async () => {
  const dispatcher = createPrintDispatcher(); let calls = 0;
  const actions = { automatic: true, onPlan: async () => { calls++; }, send: async () => { calls++; }, onSent() {} };
  await assert.rejects(dispatcher.run(order, { ...main, connection: 'system' }, new Set(), actions), /automática/);
  await assert.rejects(dispatcher.run(order, { ...main, address: '' }, new Set(), actions)); assert.equal(calls, 0); assert.equal(dispatcher.busy, false);
  await dispatcher.run(order, { ...main, connection: 'system' }, new Set(), { ...actions, automatic: false }); assert.equal(calls, 2);
});
test('old printer settings remain valid and automatic mode must be an actual boolean', async () => {
  const { validCloudValue } = await import('../shared/cloud-validation.mjs');
  const { automatic, ...old } = main; assert.equal(validCloudValue('printer', old), true); assert.equal(validCloudValue('printer', main), true); assert.equal(validCloudValue('printer', { ...main, automatic: 'false' }), false);
});
