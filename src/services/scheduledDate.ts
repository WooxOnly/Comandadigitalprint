export type DateParts = { month: string; day: string; year: string };
export type TimeParts = { hour: string; minute: string };
export const emptyDate = (): DateParts => ({ month: '', day: '', year: '' });
export const emptyTime = (): TimeParts => ({ hour: '', minute: '' });
export function datePartsFromISO(iso: string): DateParts {
  const [year = '', month = '', day = ''] = iso.split('-'); return { month, day, year };
}
export function datePartsISO({ month, day, year }: DateParts): string {
  if (!/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day) || !/^\d{4}$/.test(year) || +year < 2000) return '';
  const d = new Date(Date.UTC(+year, +month - 1, +day));
  if (d.getUTCFullYear() !== +year || d.getUTCMonth() !== +month - 1 || d.getUTCDate() !== +day) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
export function scheduledDate(date: DateParts, time: TimeParts, now = Date.now()): Date {
  const iso = datePartsISO(date);
  if (!iso || !/^\d{1,2}$/.test(time.hour) || !/^\d{1,2}$/.test(time.minute) || +time.hour > 23 || +time.minute > 59) throw new Error('Confira a data e o horário da retirada/entrega.');
  const value = new Date(`${iso}T${time.hour.padStart(2, '0')}:${time.minute.padStart(2, '0')}:00`);
  if (!Number.isFinite(value.getTime()) || value.getHours() !== +time.hour || value.getMinutes() !== +time.minute || value.getTime() <= now) throw new Error('Escolha uma data e hora futuras válidas.');
  return value;
}
export function usDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}
