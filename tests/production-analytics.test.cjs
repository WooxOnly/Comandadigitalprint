const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { fixture } = require('./helpers/business-fixture.cjs');
const stores = [{ id: 'seabra-1', name: 'Store 1' }, { id: 'seabra-2', name: 'Store 2' }];
async function toolsFor(t) {
  const f = await fixture(t), { productionReport } = await import('../server/cloudflare/production-report.mjs'), { reportPeriod } = await import('../shared/report-period.mjs');
  const report = (params, basis = 'completed', selected = stores) => productionReport(f.env, selected, reportPeriod(new URLSearchParams(params)), basis);
  function record(createdAt, times = {}, storeId = 'seabra-1') {
    const id = randomUUID(), order = { id, createdAt, plate: '1', customer: 'PRIVATE CUSTOMER', items: [{ id: randomUUID(), name: 'PRIVATE ITEM', category: 'Pizzas', quantity: 1, note: '' }] };
    const preparation = times.status ? { orderId: id, updatedAt: times.completedAt || times.readyAt || times.startedAt || createdAt, ...times } : null;
    f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,1)').run(storeId, 'order:' + id, JSON.stringify(order));
    if (preparation) f.db.prepare('INSERT INTO store_records(store_id,key,data,revision) VALUES(?,?,?,2)').run(storeId, 'preparation:' + id, JSON.stringify(preparation));
    return { order, preparation, storeId };
  }
  return { ...f, report, record };
}
test('TMA uses recorded completion and weighted samples, with alternate bases and no invented historical times', async t => {
  const f = await toolsFor(t), { productionMetrics } = await import('../shared/production-metrics.mjs');
  const a = '2026-10-07T14:00:00Z';
  const rows = [f.record(a, { status: 'completed', startedAt: '2026-10-07T14:01:00Z', readyAt: '2026-10-07T14:03:00Z', completedAt: '2026-10-07T14:04:00Z' }), f.record(a, { status: 'completed', startedAt: '2026-10-07T14:01:00Z', readyAt: '2026-10-07T14:03:00Z', completedAt: '2026-10-07T14:04:00Z' }), f.record(a, { status: 'completed', startedAt: '2026-10-07T14:01:00Z', readyAt: '2026-10-07T14:07:00Z', completedAt: '2026-10-07T14:10:00Z' }, 'seabra-2'), f.record(a, { status: 'completed', updatedAt: '2026-10-07T14:20:00Z' }), f.record(a)];
  const params = { from: '2026-10-07', to: '2026-10-07', timeZone: 'UTC' }, value = await f.report(params);
  assert.deepEqual(value.summary, productionMetrics(rows)); assert.deepEqual(value.tma, { seconds: 360, samples: 3 });
  assert.deepEqual(value.breakdowns.hours[14].tma, value.tma); assert.deepEqual(value.breakdowns.weekdays.find(day => day.key === 3).tma, value.tma); assert.deepEqual(value.breakdowns.months[0].tma, value.tma);
  assert.equal(value.stores[0].tma.seconds, 240); assert.equal(value.stores[1].tma.seconds, 600);
  assert.deepEqual((await f.report(params, 'ready')).tma, { seconds: 260, samples: 3 }); assert.deepEqual((await f.report(params, 'preparation')).tma, { seconds: 200, samples: 3 });
  assert.ok(!/PRIVATE CUSTOMER|customer|payments|items|note|flavors|extras/.test(JSON.stringify(value))); assert.equal(value.orders.filter(order => order.tmaSeconds === null).length, 2);
});
test('local midnight boundaries place UTC orders into the correct hour, weekday and month', async t => {
  const f = await toolsFor(t);
  f.record('2026-10-01T01:30:00Z'); f.record('2026-10-01T05:30:00Z'); f.record('2026-10-02T04:00:00Z');
  const value = await f.report({ from: '2026-09-30', to: '2026-10-01', timeZone: 'America/New_York' });
  assert.equal(value.start, '2026-09-30T04:00:00.000Z'); assert.equal(value.end, '2026-10-02T04:00:00.000Z'); assert.equal(value.summary.count, 2);
  assert.equal(value.breakdowns.hours[21].metrics.count, 1); assert.equal(value.breakdowns.hours[1].metrics.count, 1);
  assert.deepEqual(value.breakdowns.days.map(day => [day.key, day.metrics.count]), [['2026-09-30', 1], ['2026-10-01', 1]]);
  assert.deepEqual(value.breakdowns.months.map(month => [month.key, month.metrics.count]), [['2026-09', 1], ['2026-10', 1]]);
  assert.equal(value.breakdowns.weekdays.find(day => day.key === 3).metrics.count, 1); assert.equal(value.breakdowns.weekdays.find(day => day.key === 4).metrics.count, 1);
});
test('spring DST skips the nonexistent local hour and covers a 23-hour day', async t => {
  const f = await toolsFor(t); f.record('2026-03-08T06:30:00Z'); f.record('2026-03-08T07:30:00Z');
  const value = await f.report({ from: '2026-03-08', to: '2026-03-08', timeZone: 'America/New_York' });
  assert.equal((Date.parse(value.end) - Date.parse(value.start)) / 3600000, 23);
  assert.equal(value.breakdowns.hours[1].metrics.count, 1); assert.equal(value.breakdowns.hours[3].metrics.count, 1);
  assert.equal(value.breakdowns.hours[2].coveredHours, 0); assert.equal(value.breakdowns.hours[2].averageOrdersPerHour, null); assert.equal(value.breakdowns.days[0].coveredHours, 23);
});
test('fall DST combines the repeated hour and normalizes by both actual hours', async t => {
  const f = await toolsFor(t); f.record('2026-11-01T05:30:00Z'); f.record('2026-11-01T06:30:00Z');
  const value = await f.report({ from: '2026-11-01', to: '2026-11-01', timeZone: 'America/New_York' });
  assert.equal(value.breakdowns.hours[1].metrics.count, 2); assert.equal(value.breakdowns.hours[1].coveredHours, 2); assert.equal(value.breakdowns.hours[1].averageOrdersPerHour, 1);
  assert.equal(value.breakdowns.days[0].coveredHours, 25); assert.equal(value.breakdowns.weekdays.find(day => day.key === 0).averageOrdersPerDay, 2);
});
test('quarter-hour time zones align hourly bins and fractional period boundaries include millisecond events', async t => {
  const f = await toolsFor(t); f.record('2026-10-07T00:05:00.100Z'); f.record('2026-10-07T00:05:00.200Z'); f.record('2026-10-07T00:05:00.250Z');
  const value = await f.report({ start: '2026-10-07T00:05:00.050Z', end: '2026-10-07T00:05:00.250Z', timeZone: 'Asia/Kathmandu' });
  assert.equal(value.summary.count, 2); assert.equal(value.breakdowns.hours[5].metrics.count, 2); assert.equal(value.breakdowns.days[0].metrics.count, 2);
});
test('weekday comparisons include empty days and account for unequal weekday frequencies', async t => {
  const f = await toolsFor(t);
  for (const date of ['2026-02-02', '2026-02-09']) { f.record(date + 'T12:00:00Z'); f.record(date + 'T13:00:00Z'); }
  for (let i = 0; i < 3; i++) f.record('2026-02-03T14:00:00Z');
  const value = await f.report({ from: '2026-02-01', to: '2026-02-09' }), monday = value.breakdowns.weekdays.find(day => day.key === 1), tuesday = value.breakdowns.weekdays.find(day => day.key === 2);
  assert.equal(monday.coveredDays, 2); assert.equal(monday.metrics.count, 4); assert.equal(monday.averageOrdersPerDay, 2);
  assert.equal(tuesday.coveredDays, 1); assert.equal(tuesday.averageOrdersPerDay, 3);
  assert.equal(value.breakdowns.days.length, 9); assert.equal(value.breakdowns.days[0].metrics.count, 0); assert.equal(value.breakdowns.days[0].tma.seconds, null);
  assert.equal(value.breakdowns.months[0].averageOrdersPerDay, 7 / 9);
});
test('complete calendar months include every day, including leap February and zero-volume buckets', async t => {
  const f = await toolsFor(t); f.record('2024-02-29T12:00:00Z');
  const leap = await f.report({ from: '2024-02-01', to: '2024-02-29' });
  assert.equal(leap.breakdowns.days.length, 29); assert.equal(leap.breakdowns.months[0].coveredDays, 29); assert.equal(leap.breakdowns.months[0].metrics.count, 1);
  const empty = await f.report({ from: '2026-02-01', to: '2026-02-28' }); assert.equal(empty.breakdowns.days.length, 28); assert.equal(empty.peakHour, null); assert.equal(empty.tma.seconds, null);
  assert.ok(empty.breakdowns.hours.every(hour => hour.metrics.count === 0 && hour.tma.samples === 0));
});
test('large month reports use all orders for totals/TMA and keep detail capped at 100', async t => {
  const f = await toolsFor(t), order = { id: 'bulk', createdAt: '2026-10-07T14:00:00.000Z', plate: '1', customer: '', items: [] };
  f.db.prepare("WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<15001) INSERT INTO store_records(store_id,key,data,revision) SELECT 'seabra-1', 'order:bulk-'||n, ?, n FROM numbers").run(JSON.stringify(order));
  const value = await f.report({ from: '2026-10-01', to: '2026-10-31' });
  assert.equal(value.summary.count, 15001); assert.equal(value.orders.length, 100); assert.equal(value.breakdowns.hours[14].metrics.count, 15001); assert.equal(value.breakdowns.months[0].metrics.count, 15001);
  assert.equal(value.breakdowns.hours[14].coveredHours, 31); assert.equal(value.breakdowns.hours[14].averageOrdersPerHour, 15001 / 31);
});
test('summary reads execute in one batch and a selected store never contributes another store to bins', async t => {
  const f = await toolsFor(t); f.record('2026-10-07T14:00:00Z'); f.record('2026-10-07T15:00:00Z', {}, 'seabra-2');
  let batches = 0; const original = f.env.DB.batch; f.env.DB.batch = statements => { batches++; assert.equal(statements.length, 6); return original(statements); };
  const value = await f.report({ from: '2026-10-07', to: '2026-10-07' }, 'completed', [stores[0]]);
  assert.equal(batches, 1); assert.equal(value.summary.count, 1); assert.equal(value.breakdowns.hours[15].metrics.count, 0); assert.deepEqual(value.stores.map(store => store.id), ['seabra-1']);
});
test('calendar inputs reject invalid dates/zones and permit bounded annual comparisons', async t => {
  const f = await toolsFor(t);
  for (const params of [{ from: '2026-02-30', to: '2026-03-01' }, { from: '2026-10-08', to: '2026-10-07' }, { from: '2026-01-01', to: '2027-01-03' }, { from: '2026-01-01', to: '2026-01-02', timeZone: 'Bad/Zone' }]) await assert.rejects(async () => f.report(params), error => error.status === 400);
  const year = await f.report({ from: '2026-01-01', to: '2026-12-31' }); assert.equal(year.breakdowns.months.length, 12); assert.equal(year.breakdowns.days.length, 365);
});
