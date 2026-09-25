import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import { isValidMenu } from '../shared/menu-validation.mjs';

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../src/services/menuUpdate.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports,
  require: (name) => name.includes('menu-validation') ? { isValidMenu } : { isDemoMenu: () => false },
});
const { applyMenuUpdate } = exports;
const current = [{ id: 'a', name: 'Pizza', category: 'Pizzas', price: 0 }];

test('identical catalog does not write or announce an update, regardless of key order', async () => {
  let writes = 0;
  const same = [{ price: 0, category: 'Pizzas', name: 'Pizza', id: 'a', allowsExtras: true }];
  assert.equal(await applyMenuUpdate(current, same, async () => { writes++; }), false);
  assert.equal(writes, 0);
});
test('changed catalog is considered updated only after persistence completes', async () => {
  const next = [{ ...current[0], name: 'Pizza nova' }];
  let release, completed = false;
  const pending = new Promise((resolve) => { release = resolve; });
  const result = applyMenuUpdate(current, next, async (value) => { assert.equal(value, next); await pending; }).then((changed) => { completed = true; return changed; });
  await Promise.resolve();
  assert.equal(completed, false);
  release();
  assert.equal(await result, true);
});
test('invalid response and storage failure cannot produce update success', async () => {
  let writes = 0;
  await assert.rejects(applyMenuUpdate(current, [{ ...current[0], name: '' }], async () => { writes++; }), /inválido/);
  assert.equal(writes, 0);
  await assert.rejects(applyMenuUpdate(current, [], async () => { throw new Error('storage failed'); }), /storage failed/);
  assert.equal(current[0].name, 'Pizza');
});
