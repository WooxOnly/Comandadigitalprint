// Linear count axis with integer ticks and round upper limits: 10, 50, 100,
// 500, 1,000, then the same pattern at larger orders of magnitude.
export function countAxisScale(maximum) {
  const magnitude = 10 ** Math.max(1, Math.floor(Math.log10(Math.max(1, maximum))));
  const ceiling = [magnitude, magnitude * 5, magnitude * 10].find(value => value >= maximum);
  return { ceiling, step: ceiling / 5 };
}
