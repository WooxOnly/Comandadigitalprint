import { preparationDurations, PREPARATION_STAGES } from './preparation-times.mjs';

export const PRODUCTION_MEASURES = ['waitSeconds', 'preparationSeconds', 'totalSeconds', 'serviceSeconds'];
export const TMA_BASES = Object.freeze({ completed: 'serviceSeconds', ready: 'totalSeconds', preparation: 'preparationSeconds' });
export function serviceSeconds(order, preparation) {
  const a = Date.parse(order.createdAt), b = Date.parse(preparation?.completedAt);
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? (b - a) / 1000 : null;
}

// Each average is computed from its own measured sample. Old records remain
// visible in counts, but an unknown time never becomes a zero-second sample.
export function productionMetrics(rows) {
  const counts = Object.fromEntries(PREPARATION_STAGES.map(stage => [stage, 0]));
  const samples = Object.fromEntries(PRODUCTION_MEASURES.map(name => [name, []]));
  for (const row of rows) {
    counts[row.preparation?.status ?? 'received']++;
    const times = { ...preparationDurations(row.order, row.preparation), serviceSeconds: serviceSeconds(row.order, row.preparation) };
    for (const name of Object.keys(samples)) if (times[name] !== null) samples[name].push(times[name]);
  }
  return { count: rows.length, counts, averages: Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, { seconds: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, samples: values.length }])) };
}

export function emptyProductionTotals() {
  return { count: 0, ...Object.fromEntries(PREPARATION_STAGES.map(stage => [stage, 0])), ...Object.fromEntries(PRODUCTION_MEASURES.flatMap(name => [[name + 'SumMs', 0], [name + 'Samples', 0]])) };
}
export function mergeProductionTotals(target, source) {
  for (const name of Object.keys(emptyProductionTotals())) target[name] += source[name] ?? 0;
  return target;
}
export function metricsFromTotals(total) {
  return { count: total.count, counts: Object.fromEntries(PREPARATION_STAGES.map(stage => [stage, total[stage]])), averages: Object.fromEntries(PRODUCTION_MEASURES.map(name => [name, { seconds: total[name + 'Samples'] ? total[name + 'SumMs'] / total[name + 'Samples'] / 1000 : null, samples: total[name + 'Samples'] }])) };
}
