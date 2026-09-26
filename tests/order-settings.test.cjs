const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../src/services/orderSettings.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsForTest });
const { parseOrderSettings, customerValidationMessage } = exportsForTest;

test('existing installations keep customer optional; saved requirement survives reload', () => {
  assert.equal(parseOrderSettings(null).requireCustomer, false);
  assert.equal(parseOrderSettings(JSON.stringify({ requireCustomer: true })).requireCustomer, true);
  assert.equal(parseOrderSettings(JSON.stringify({ requireCustomer: false })).requireCustomer, false);
  assert.equal(parseOrderSettings('{}').requireCustomer, false);
});
test('required customer rejects blank and whitespace but accepts names with accents', () => {
  for (const name of ['', '   ', '\n\t']) assert.match(customerValidationMessage(name, true), /Informe o nome/);
  assert.equal(customerValidationMessage(' João ', true), '');
  assert.equal(customerValidationMessage('', false), '');
});
