import { buildCashReport, cashReportQueries, emptyCashTotals } from './cash-reports.mjs';
import { calendarCoverage, timeZoneIntervals } from '../../shared/report-period.mjs';

function add(target, source) {
  for (const key of Object.keys(emptyCashTotals())) target[key] += source[key];
  return target;
}
export async function managerSalesReport(env, stores, period) {
  const start = new Date(period.start).toISOString(), end = new Date(period.end).toISOString();
  const responses = await env.DB.batch(cashReportQueries(env, stores.map(store => store.id), start, end));
  const [events, closings] = responses.map(response => response.results);
  // Refuse oversized reports as a whole; never publish a truncated financial total.
  if (events.length > 10000 || closings.length > 10000) throw Object.assign(new Error('O período excede 10.000 operações ou fechamentos. Escolha um intervalo menor ou uma loja.'), { status: 400 });
  const deltas = new Map();
  const reports = stores.map(store => buildCashReport(store, { start, end, timeZone: period.timeZone }, events.filter(event => event.store_id === store.id), closings.filter(closing => closing.store_id === store.id), (event, delta) => deltas.set(JSON.stringify([event.store_id, event.id]), delta)));
  const totals = emptyCashTotals(), products = new Map(), categories = new Map(), operators = new Map(), days = new Map();
  const methods = ['cash', 'card', 'zelle'].map(method => ({ method, receivedCents: 0, reversedCents: 0, netCents: 0 }));
  const coverage = calendarCoverage(timeZoneIntervals(period.start, period.end, period.timeZone));
  const bucket = key => ({ key, totals: emptyCashTotals() });
  const hours = Array.from({ length: 24 }, (_, hour) => bucket(hour));
  const weekdays = Array.from({ length: 7 }, (_, weekday) => bucket(weekday)), months = new Map();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: period.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
  const dateParts = value => Object.fromEntries(formatter.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  for (const day of coverage) { days.set(day.day, bucket(day.day)); if (!months.has(day.month)) months.set(day.month, bucket(day.month)); }
  const movements = [], closingRows = [];
  for (const report of reports) {
    add(totals, report.totals);
    report.methods.forEach((method, index) => { for (const key of ['receivedCents', 'reversedCents', 'netCents']) methods[index][key] += method[key]; });
    for (const product of report.products) {
      // Product IDs belong to a store; group only identical historical names/categories.
      const key = JSON.stringify([product.category, product.name]);
      if (!products.has(key)) products.set(key, { name: product.name, category: product.category, soldQuantity: 0, reversedQuantity: 0, netQuantity: 0, grossCents: 0, discountCents: 0, reversedCents: 0, netSalesCents: 0 });
      const target = products.get(key);
      for (const name of ['soldQuantity', 'reversedQuantity', 'netQuantity', 'grossCents', 'discountCents', 'reversedCents', 'netSalesCents']) target[name] += product[name];
    }
    for (const movement of report.movements) {
      const parts = dateParts(movement.createdAt), day = `${parts.year}-${parts.month}-${parts.day}`, weekday = new Date(day + 'T12:00:00Z').getUTCDay();
      const delta = deltas.get(JSON.stringify([report.storeId, movement.id]));
      for (const target of [hours[Number(parts.hour)], weekdays[weekday], months.get(day.slice(0, 7)), days.get(day)]) add(target.totals, delta);
      const key = JSON.stringify([report.storeId, movement.actor]);
      if (!operators.has(key)) operators.set(key, { storeId: report.storeId, storeName: report.storeName, username: movement.actor, totals: emptyCashTotals() });
      add(operators.get(key).totals, delta);
      // Receipts, customer fields, price notes and authorization secrets stay off the web API.
      movements.push({ id: movement.id, storeId: report.storeId, storeName: report.storeName, kind: movement.kind, method: movement.method, amountCents: movement.amountCents, createdAt: movement.createdAt, actor: movement.actor });
    }
    closingRows.push(...report.closings.map(row => ({ ...row, storeId: report.storeId, storeName: report.storeName })));
  }
  for (const product of products.values()) {
    if (!categories.has(product.category)) categories.set(product.category, { category: product.category, soldQuantity: 0, reversedQuantity: 0, netQuantity: 0, netSalesCents: 0 });
    const row = categories.get(product.category);
    for (const key of ['soldQuantity', 'reversedQuantity', 'netQuantity', 'netSalesCents']) row[key] += product[key];
  }
  const ticket = value => value.salesCount ? (value.grossCents - value.discountCents) / value.salesCount : null;
  const productRows = [...products.values()].sort((a, b) => b.netSalesCents - a.netSalesCents || a.name.localeCompare(b.name));
  const sortedClosings = closingRows.sort((a, b) => b.closedAt.localeCompare(a.closedAt) || a.id.localeCompare(b.id));
  const sortedMovements = movements.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return { currency: 'USD', start, end, timeZone: period.timeZone, totals, averageTicketCents: ticket(totals), methods,
    stores: reports.map(report => ({ id: report.storeId, name: report.storeName, totals: report.totals, averageTicketCents: ticket(report.totals) })),
    breakdowns: { hours, weekdays: [1, 2, 3, 4, 5, 6, 0].map(key => weekdays[key]), days: [...days.values()], months: [...months.values()] },
    products: productRows.slice(0, 100), productCount: productRows.length, categories: [...categories.values()].sort((a, b) => b.netSalesCents - a.netSalesCents),
    operators: [...operators.values()].sort((a, b) => b.totals.salesCount - a.totals.salesCount || a.storeName.localeCompare(b.storeName) || a.username.localeCompare(b.username)),
    movements: sortedMovements.slice(0, 100), movementCount: movements.length, closings: sortedClosings.slice(0, 100), closingCount: sortedClosings.length,
    closingDifferenceCents: closingRows.reduce((sum, row) => sum + row.differenceCents, 0) };
}
