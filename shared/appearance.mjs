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
// Shared neutral graphite palette for native controls and portal CSS.
// Image pixels, receipt HTML and white labels on primary buttons are untouched.
export function darkColor(value, property = 'color') {
  const color = rgb(value); if (!color) return value;
  const lower = value.toLowerCase(), light = luminance(color);
  const green = color[1] > color[0] * 1.1 && color[1] > color[2] * 1.04;
  if (/shadow/i.test(property)) return value;
  if (/background/i.test(property)) {
    if (['#f5f3ef', '#f6f5ef'].includes(lower)) return '#18191b';
    if (['#fff', '#ffffff'].includes(lower)) return '#242629';
    if (['#214b40', '#245c43'].includes(lower)) return '#3a2823';
    if (['#fcebe3', '#fcebe8', '#fcece8'].includes(lower)) return '#3a2823';
    if (green || light > .45) return '#2c2e32';
    return value;
  }
  if (/border/i.test(property)) return '#414348';
  const foreground = {
    '#223b35': '#f1f1f1', '#18392e': '#f1f1f1',
    '#62716b': '#b6b8bc', '#59685e': '#b6b8bc', '#6c7771': '#b6b8bc',
    '#214b40': '#f3a588', '#245c43': '#f3a588',
    '#ae4328': '#f3a588', '#963821': '#f3a588',
  };
  if (foreground[lower]) return foreground[lower];
  if (green) return '#d0d2d5';
  const background = luminance([36, 38, 41]);
  if ((light + .05) / (background + .05) >= 4.5) return value;
  let result = color;
  for (let amount = .35; amount <= 1; amount += .05) {
    result = blend(color, [241, 241, 241], amount);
    if ((luminance(result) + .05) / (background + .05) >= 5) break;
  }
  return hex(result);
}
