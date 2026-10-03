const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const moduleExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/orderNumber.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: moduleExports });
const { localOrderDay, nextDailyOrderNumber, tabletLabelForDay, orderNumberLabel } = moduleExports;

test('each tablet counts independently and starts again on the next local day', () => {
  const today = localOrderDay(new Date(2026, 9, 3, 23, 59));
  const tomorrow = localOrderDay(new Date(2026, 9, 4, 0, 0));
  assert.equal(today, '2026-10-03');
  assert.equal(tomorrow, '2026-10-04');
  const orders = [
    { tabletId: 'tablet-a', numberDay: today, dailyNumber: 1 },
    { tabletId: 'tablet-b', numberDay: today, dailyNumber: 1 },
    { tabletId: 'tablet-a', numberDay: today, dailyNumber: 2 },
    { tabletId: 'tablet-a', numberDay: tomorrow, dailyNumber: 1 },
    { tabletId: 'tablet-a' },
  ];
  assert.equal(nextDailyOrderNumber(orders, 'tablet-a', today), 3);
  assert.equal(nextDailyOrderNumber(orders, 'tablet-b', today), 2);
  assert.equal(nextDailyOrderNumber(orders, 'tablet-a', tomorrow), 2);
  assert.equal(nextDailyOrderNumber(orders, 'tablet-b', tomorrow), 1);
  assert.equal(tabletLabelForDay([{ tabletId: 'tablet-a', numberDay: today, tabletLabel: 'ABC123' }], 'tablet-a', today, 1), 'ABC123');
  assert.equal(tabletLabelForDay([], 'tablet-a', today, 1), '1');
  assert.equal(orderNumberLabel({ tabletLabel: '1', dailyNumber: 3 }), '1-003');
});
