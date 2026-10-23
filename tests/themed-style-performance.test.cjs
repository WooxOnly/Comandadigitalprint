const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { createThemedStyleResolver } = loadTs('src/ui/themedStyleResolver.ts');
const { compactLandscapeStyle } = loadTs('src/ui/layoutDensity.ts');

test('shared immutable styles are transformed once per palette/density without changing their values', async () => {
  const { darkColor } = await import('../shared/appearance.mjs');
  let calls = 0;
  const flatten = value => { calls++; return Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean)) : value; };
  const resolve = createThemedStyleResolver(flatten);
  const style = Object.freeze({ color: '#123456', backgroundColor: '#ffffff', padding: 20, fontSize: 20, minHeight: 48, opacity: 0.7 });
  for (const [dark, compact] of [[false, false], [true, false], [false, true], [true, true]]) {
    const sized = compact ? compactLandscapeStyle(style) : style;
    const expected = dark ? Object.fromEntries(Object.entries(sized).map(([key, value]) => [key, typeof value === 'string' && /color$/i.test(key) ? darkColor(value, key) : value])) : sized;
    for (let index = 0; index < 1000; index++) assert.deepEqual(resolve(style, dark, compact), expected);
  }
  assert.equal(calls, 3, 'Light portrait passes through; the other modes flatten once each');
  assert.equal(style.padding, 20);
});

test('dynamic arrays and mutable inline styles retain their live values', () => {
  const resolve = createThemedStyleResolver(value => Array.isArray(value) ? Object.assign({}, ...value.filter(Boolean)) : value);
  const mutable = { padding: 20 }, styles = [Object.freeze({ color: '#ffffff' }), mutable];
  assert.equal(resolve(styles, true, true).padding, 14);
  mutable.padding = 40;
  assert.equal(resolve(styles, true, true).padding, 28);
  assert.equal(resolve(mutable, false, true).padding, 28);
  mutable.padding = 60;
  assert.equal(resolve(mutable, false, true).padding, 42);
  assert.equal(resolve(null, true, true), null);
});
