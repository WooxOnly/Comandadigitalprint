import { emptyProductionTotals, mergeProductionTotals, metricsFromTotals, PRODUCTION_MEASURES, TMA_BASES } from '../../shared/production-metrics.mjs';
import { calendarCoverage, timeZoneIntervals } from '../../shared/report-period.mjs';
import { preparationDurations } from '../../shared/preparation-times.mjs';
import { serviceSeconds } from '../../shared/production-metrics.mjs';

const dates = ["json_extract(o.data, '$.createdAt')", "json_extract(p.data, '$.startedAt')", "json_extract(p.data, '$.readyAt')", "json_extract(p.data, '$.completedAt')"];
const pairs = [[0, 1], [1, 2], [0, 2], [0, 3]];
const sums = `COUNT(*) AS count, ${['received', 'preparing', 'ready', 'completed'].map(stage => `SUM(status = '${stage}') AS ${stage}`).join(', ')}, ${PRODUCTION_MEASURES.map(name => `COALESCE(SUM(${name}), 0) AS ${name}SumMs, COUNT(${name}) AS ${name}Samples`).join(', ')}`;
function source(env, stores, period, intervals) {
  const sql = `WITH measured AS (
    SELECT o.store_id, o.key AS order_key, o.data AS order_data, p.data AS preparation_data, COALESCE(json_extract(p.data, '$.status'), 'received') AS status,
      unixepoch(${dates[0]}) AS emitted,
      ${PRODUCTION_MEASURES.map((name, i) => { const [a, b] = pairs[i]; return `CASE WHEN julianday(${dates[b]}) >= julianday(${dates[a]}) THEN ROUND((julianday(${dates[b]}) - julianday(${dates[a]})) * 86400000) END AS ${name}`; }).join(', ')}
    FROM store_records o LEFT JOIN store_records p ON p.store_id = o.store_id AND p.key = 'preparation:' || SUBSTR(o.key, 7)
    WHERE o.store_id IN (SELECT value FROM json_each(?)) AND o.key LIKE 'order:%'
      AND julianday(${dates[0]}) >= julianday(?) AND julianday(${dates[0]}) < julianday(?)
  ), zoned AS (
    SELECT *, datetime(emitted + (SELECT json_extract(value, '$.offset') FROM json_each(?) WHERE emitted >= CAST(json_extract(value, '$.start') AS INTEGER) AND emitted < json_extract(value, '$.end') LIMIT 1), 'unixepoch') AS local_at FROM measured
  ) `;
  const args = [JSON.stringify(stores.map(store => store.id)), new Date(period.start).toISOString(), new Date(period.end).toISOString(), JSON.stringify(intervals)];
  return tail => env.DB.prepare(sql + tail).bind(...args);
}
export function reportBreakdowns(bins, intervals, basis = 'completed') {
  const coverage = calendarCoverage(intervals), dayMap = new Map(coverage.map(day => [day.day, { key: day.day, total: emptyProductionTotals(), coveredDays: 1, coveredHours: day.hours.reduce((a, b) => a + b, 0) }]));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ key: hour, total: emptyProductionTotals(), coveredHours: coverage.reduce((sum, day) => sum + day.hours[hour], 0), coveredDays: coverage.filter(day => day.hours[hour] > 0).length }));
  const weekdays = Array.from({ length: 7 }, (_, weekday) => ({ key: weekday, total: emptyProductionTotals(), coveredDays: coverage.filter(day => day.weekday === weekday).length, coveredHours: coverage.filter(day => day.weekday === weekday).reduce((sum, day) => sum + day.hours.reduce((a, b) => a + b, 0), 0) }));
  const monthMap = new Map();
  for (const day of coverage) {
    if (!monthMap.has(day.month)) monthMap.set(day.month, { key: day.month, total: emptyProductionTotals(), coveredDays: 0, coveredHours: 0 });
    monthMap.get(day.month).coveredDays++; monthMap.get(day.month).coveredHours += day.hours.reduce((a, b) => a + b, 0);
  }
  for (const bin of bins) {
    const date = dayMap.get(bin.day); if (!date) continue;
    mergeProductionTotals(date.total, bin); mergeProductionTotals(hours[Number(bin.hour)].total, bin);
    const weekday = new Date(bin.day + 'T12:00:00Z').getUTCDay();
    mergeProductionTotals(weekdays[weekday].total, bin); mergeProductionTotals(monthMap.get(bin.day.slice(0, 7)).total, bin);
  }
  function view(value) {
    const metrics = metricsFromTotals(value.total);
    return { key: value.key, metrics, coveredDays: value.coveredDays, coveredHours: value.coveredHours, averageOrdersPerDay: value.coveredDays ? metrics.count / value.coveredDays : null, averageOrdersPerHour: value.coveredHours ? metrics.count / value.coveredHours : null, tma: metrics.averages[TMA_BASES[basis]] };
  }
  return { hours: hours.map(view), weekdays: [1, 2, 3, 4, 5, 6, 0].map(key => view(weekdays[key])), days: [...dayMap.values()].map(view), months: [...monthMap.values()].map(view) };
}

export async function productionReport(env, stores, period, basis = 'completed') {
  const intervals = timeZoneIntervals(period.start, period.end, period.timeZone), prepare = source(env, stores, period, intervals);
  const binQuery = prepare(`SELECT substr(local_at, 1, 10) AS day, CAST(strftime('%H', local_at) AS INTEGER) AS hour, ${sums} FROM zoned GROUP BY day, hour ORDER BY day, hour`);
  const storeQuery = prepare(`SELECT store_id, ${sums} FROM zoned GROUP BY store_id ORDER BY store_id`);
  const detailsQuery = env.DB.prepare(`SELECT o.store_id, o.data AS order_data, p.data AS preparation_data FROM store_records o LEFT JOIN store_records p ON p.store_id = o.store_id AND p.key = 'preparation:' || SUBSTR(o.key, 7) WHERE o.store_id IN (SELECT value FROM json_each(?)) AND o.key LIKE 'order:%' AND julianday(json_extract(o.data, '$.createdAt')) >= julianday(?) AND julianday(json_extract(o.data, '$.createdAt')) < julianday(?) ORDER BY julianday(json_extract(o.data, '$.createdAt')) DESC, o.store_id, o.key LIMIT 100`).bind(JSON.stringify(stores.map(store => store.id)), new Date(period.start).toISOString(), new Date(period.end).toISOString());
  const itemSource = `, items AS (SELECT store_id, order_key, json_extract(value, '$.name') AS name, json_extract(value, '$.category') AS category, CAST(json_extract(value, '$.quantity') AS INTEGER) AS quantity FROM zoned, json_each(order_data, '$.items')) `;
  const productsQuery = prepare(itemSource + `SELECT name, category, SUM(quantity) AS quantity, COUNT(DISTINCT store_id || char(0) || order_key) AS orders, COUNT(*) OVER() AS groups_count FROM items GROUP BY category, name ORDER BY quantity DESC, category, name LIMIT 100`);
  const categoriesQuery = prepare(itemSource + `SELECT category, SUM(quantity) AS quantity, COUNT(DISTINCT store_id || char(0) || order_key) AS orders, COUNT(*) OVER() AS groups_count FROM items GROUP BY category ORDER BY quantity DESC, category LIMIT 100`);
  const tmaMeasure = TMA_BASES[basis];
  const operatorsQuery = prepare(`, stages AS (
    SELECT store_id, json_extract(preparation_data, '$.startedBy') AS username, 'started' AS stage, NULL AS preparation_ms, NULL AS tma_ms FROM zoned WHERE status IN ('preparing', 'ready', 'completed')
    UNION ALL SELECT store_id, json_extract(preparation_data, '$.readyBy'), 'ready', preparationSeconds, NULL FROM zoned WHERE status IN ('ready', 'completed')
    UNION ALL SELECT store_id, json_extract(preparation_data, '$.completedBy'), 'completed', NULL, ${tmaMeasure} FROM zoned WHERE status = 'completed'
  ) SELECT store_id, username, SUM(stage = 'started') AS started, SUM(stage = 'ready') AS ready, SUM(stage = 'completed') AS completed, SUM(preparation_ms) AS preparation_sum, COUNT(preparation_ms) AS preparation_samples, SUM(tma_ms) AS tma_sum, COUNT(tma_ms) AS tma_samples, COUNT(*) OVER() AS groups_count FROM stages GROUP BY store_id, username ORDER BY completed DESC, ready DESC, started DESC, store_id, username LIMIT 100`);
  // D1 executes these reads in one transactional snapshot. The fallback is for
  // local SQLite fixtures only; totals use sums/counts and never truncated orders.
  const queries = [binQuery, storeQuery, detailsQuery, productsQuery, categoriesQuery, operatorsQuery];
  const responses = env.DB.batch ? await env.DB.batch(queries) : await Promise.all(queries.map(query => query.all()));
  const [bins, perStore, details, products, categories, operators] = responses.map(response => response.results);
  const total = perStore.reduce(mergeProductionTotals, emptyProductionTotals()), summary = metricsFromTotals(total);
  if (bins.reduce((sum, bin) => sum + bin.count, 0) !== summary.count) throw new Error('Inconsistent production totals');
  const breakdowns = reportBreakdowns(bins, intervals, basis);
  const peakHour = breakdowns.hours.reduce((peak, hour) => hour.metrics.count > (peak?.metrics.count ?? 0) ? hour : peak, null);
  return { summary, tma: summary.averages[TMA_BASES[basis]], tmaBasis: basis, timeZone: period.timeZone, start: new Date(period.start).toISOString(), end: new Date(period.end).toISOString(), peakHour, breakdowns,
    products: products.map(({ name, category, quantity, orders }) => ({ name, category, quantity, orders })), productCount: products[0]?.groups_count ?? 0,
    categories: categories.map(({ category, quantity, orders }) => ({ category, quantity, orders })), categoryCount: categories[0]?.groups_count ?? 0,
    operators: operators.map(row => ({ storeId: row.store_id, storeName: stores.find(store => store.id === row.store_id).name, username: row.username, started: row.started, ready: row.ready, completed: row.completed, preparation: { seconds: row.preparation_samples ? row.preparation_sum / row.preparation_samples / 1000 : null, samples: row.preparation_samples }, tma: { seconds: row.tma_samples ? row.tma_sum / row.tma_samples / 1000 : null, samples: row.tma_samples } })), operatorCount: operators[0]?.groups_count ?? 0,
    stores: stores.map(store => { const metrics = metricsFromTotals(perStore.find(row => row.store_id === store.id) ?? emptyProductionTotals()); return { id: store.id, name: store.name, metrics, tma: metrics.averages[TMA_BASES[basis]] }; }),
    orders: details.map(row => { const order = JSON.parse(row.order_data), preparation = row.preparation_data ? JSON.parse(row.preparation_data) : null, times = { ...preparationDurations(order, preparation), serviceSeconds: serviceSeconds(order, preparation) }; return { storeId: row.store_id, storeName: stores.find(store => store.id === row.store_id).name, id: order.id, number: order.dailyNumber && order.tabletLabel ? order.tabletLabel + '-' + String(order.dailyNumber).padStart(3, '0') : order.id, createdAt: order.createdAt, status: preparation?.status ?? 'received', startedAt: preparation?.startedAt ?? null, readyAt: preparation?.readyAt ?? null, completedAt: preparation?.completedAt ?? null, ...times, tmaSeconds: times[TMA_BASES[basis]] }; }) };
}
