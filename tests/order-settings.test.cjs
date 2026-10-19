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

test('takeaway table requirement defaults off for legacy settings and survives reload independently of customer rule', () => {
  assert.equal(parseOrderSettings(null).requireTableForTakeout, false);
  assert.equal(parseOrderSettings('{"requireCustomer":true}').requireTableForTakeout, false);
  const settings = parseOrderSettings('{"requireCustomer":false,"requireTableForTakeout":true}');
  assert.equal(settings.requireCustomer, false);
  assert.equal(parseOrderSettings(JSON.stringify(settings)).requireTableForTakeout, true);
});
test('table selection is required for dine-in and optionally required for takeaway, with a three digit numeric limit', () => {
  const { tableValidationMessage: validate } = exportsForTest;
  assert.match(validate('dine_in', '', false), /Escolha uma mesa/);
  assert.equal(validate('takeout', '', false), '');
  assert.match(validate('takeout', ' ', true), /Escolha uma mesa/);
  for(const mode of ['dine_in','takeout']) for(const required of [true,false]) {
    assert.equal(validate(mode, '999', required), '');
    assert.match(validate(mode, '1234', required), /3 dígitos/);
    assert.match(validate(mode, 'abc', required), /3 dígitos/);
  }
});
test('synchronized per-store settings accept legacy and new booleans, reject forged nonbooleans', async () => {
  const {validCloudValue}=await import('../shared/cloud-validation.mjs');
  assert.equal(validCloudValue('order-settings',{requireCustomer:false}),true);
  assert.equal(validCloudValue('order-settings',{requireCustomer:true,requireTableForTakeout:true}),true);
  assert.equal(validCloudValue('order-settings',{requireCustomer:false,requireTableForTakeout:'false'}),false);
});
