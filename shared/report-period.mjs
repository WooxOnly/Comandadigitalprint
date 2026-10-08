const HOUR = 3600000;
const invalid = message => Object.assign(new Error(message), { status: 400 });
export function reportTimeZone(value = 'UTC') {
  if (typeof value !== 'string' || !value || value.length > 100) throw invalid('Fuso horário inválido.');
  try { return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone; }
  catch { throw invalid('Fuso horário inválido.'); }
}
function partsFormatter(timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
}
function parts(formatter, timestamp) { return Object.fromEntries(formatter.formatToParts(timestamp).map(part => [part.type, part.value])); }
function dateText(formatter, timestamp) { const p = parts(formatter, timestamp); return `${p.year.padStart(4, '0')}-${p.month}-${p.day}`; }
function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid('Informe datas válidas.');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw invalid('Informe datas válidas.');
  return date;
}
// The first instant of a local calendar day can differ from a literal midnight
// in regions that advance their clocks at midnight. Compare local dates rather
// than relying on the browser's time zone or a fixed UTC offset.
function dayBoundary(value, formatter) {
  const utc = calendarDate(value).getTime();
  let lo = (utc - 48 * HOUR) / 1000, hi = (utc + 48 * HOUR) / 1000;
  while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (dateText(formatter, mid * 1000) < value) lo = mid; else hi = mid; }
  return hi * 1000;
}
export function reportPeriod(params) {
  const timeZone = reportTimeZone(params.get('timeZone') || 'UTC'), formatter = partsFormatter(timeZone);
  let start, end;
  if (params.has('from') || params.has('to')) {
    const from = params.get('from'), to = params.get('to'), last = calendarDate(to);
    calendarDate(from); last.setUTCDate(last.getUTCDate() + 1);
    start = dayBoundary(from, formatter); end = dayBoundary(last.toISOString().slice(0, 10), formatter);
  } else {
    const from = params.get('start'), to = params.get('end');
    if (!from || !to || from.length > 40 || to.length > 40) throw invalid('Informe datas válidas.');
    start = Date.parse(from); end = Date.parse(to);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 366 * 24 * HOUR + 2 * HOUR) throw invalid('Selecione um período de até 12 meses (366 dias).');
  return { start, end, timeZone };
}
export function timeZoneIntervals(start, end, timeZone) {
  const formatter = partsFormatter(timeZone);
  function offset(timestamp) {
    const p = parts(formatter, timestamp), date = new Date(0);
    date.setUTCFullYear(Number(p.year), Number(p.month) - 1, Number(p.day));
    date.setUTCHours(Number(p.hour), Number(p.minute), Number(p.second), 0);
    return (date.getTime() - Math.floor(timestamp / 1000) * 1000) / 1000;
  }
  const intervals = []; let begin = start, current = offset(start), cursor = start;
  // IANA clock changes are separated by more than six hours. Locate the exact
  // transition second; calendar grouping then works for DST and quarter-hour zones.
  while (cursor < end) {
    const probe = Math.min(cursor + 6 * HOUR, end - 1), next = offset(probe);
    if (next !== current) {
      let lo = Math.floor(cursor / 1000), hi = Math.floor(probe / 1000);
      while (hi - lo > 1) { const mid = Math.floor((lo + hi) / 2); if (offset(mid * 1000) === current) lo = mid; else hi = mid; }
      const transition = hi * 1000;
      intervals.push({ start: begin / 1000, end: transition / 1000, offset: current }); begin = transition; current = next;
    }
    if (probe === end - 1) break; cursor = probe;
  }
  intervals.push({ start: begin / 1000, end: end / 1000, offset: current });
  return intervals;
}
export function calendarCoverage(intervals) {
  const days = new Map();
  for (const interval of intervals) {
    let cursor = interval.start * 1000;
    while (cursor < interval.end * 1000) {
      const local = cursor + interval.offset * 1000, hour = new Date(local).getUTCHours(), day = new Date(local).toISOString().slice(0, 10);
      const end = Math.min(interval.end * 1000, (Math.floor(local / HOUR) + 1) * HOUR - interval.offset * 1000);
      if (!days.has(day)) days.set(day, { day, weekday: new Date(day + 'T12:00:00Z').getUTCDay(), month: day.slice(0, 7), hours: Array(24).fill(0) });
      days.get(day).hours[hour] += (end - cursor) / HOUR; cursor = end;
    }
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}
