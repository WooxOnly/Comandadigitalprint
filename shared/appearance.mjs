export const validTheme = value => value === 'light' || value === 'dark';
export const THEME_STORAGE_KEY = 'bistrohub.appearance.v1';
const rgb = value => {
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) return null;
  const hex = value.slice(1).length === 3 ? value.slice(1).split('').map(x => x + x).join('') : value.slice(1);
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
};
const hex = values => '#' + values.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
const luminance = values => values.map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const blend = (a, b, ratio) => a.map((value, index) => value * (1 - ratio) + b[index] * ratio);
// The same semantic color conversion is used by native controls and portal CSS.
// Foreground white and saturated brand backgrounds remain intact, including
// button contrast; flags, logos, receipts and other image pixels are untouched.
export function darkColor(value, property = 'color') {
  const color = rgb(value); if (!color) return value;
  const lower = value.toLowerCase(), light = luminance(color);
  if (/background/i.test(property)) {
    if (['#f5f3ef', '#f6f5ef', '#ffffff', '#fff'].includes(lower)) return lower === '#fff' || lower === '#ffffff' ? '#1c2b23' : '#101b15';
    return light > .45 ? hex(blend([18, 34, 25], color, .1)) : value;
  }
  if (/shadow/i.test(property)) return value;
  if (/border/i.test(property)) return light > .45 ? '#5c7867' : darkColor(value, 'color');
  const foreground = {
    '#223b35': '#e6f1e9', '#18392e': '#e6f1e9',
    '#62716b': '#b5c7bb', '#59685e': '#b5c7bb', '#6c7771': '#a8bbae',
    '#214b40': '#b7e3ca', '#245c43': '#b7e3ca',
    '#ae4328': '#ffb49a', '#963821': '#ffb49a',
  };
  if (foreground[lower]) return foreground[lower];
  const background = luminance([28, 43, 35]);
  if ((light + .05) / (background + .05) >= 4.5) return value;
  let result = color;
  for (let amount = .35; amount <= 1; amount += .05) {
    result = blend(color, [242, 247, 243], amount);
    if ((luminance(result) + .05) / (background + .05) >= 5) break;
  }
  return hex(result);
}
