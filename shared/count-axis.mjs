// Explicitly banded, not linear: keep every owner-approved tick visible even
// for low-volume periods. Extend the same 1/5/10 pattern above 1,000 as needed.
export function countAxisScale(maximum) {
  const ticks = [0, 10, 50, 100, 500, 1000];
  while (ticks[ticks.length - 1] < maximum) {
    const last = ticks[ticks.length - 1], magnitude = 10 ** Math.floor(Math.log10(last));
    ticks.push(last / magnitude < 5 ? magnitude * 5 : magnitude * 10);
  }
  return { ticks, ceiling: ticks[ticks.length - 1] };
}

// Interpolate inside each labeled band; never change the underlying count.
export function countAxisPosition(value, ticks) {
  if (value <= ticks[0]) return 0;
  const upper = ticks.findIndex((tick, index) => index > 0 && value <= tick);
  if (upper < 0) return 1;
  return (upper - 1 + (value - ticks[upper - 1]) / (ticks[upper] - ticks[upper - 1])) / (ticks.length - 1);
}
