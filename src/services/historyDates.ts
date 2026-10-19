export type HistoryPeriod = 'today' | 'last7' | 'last30' | 'previousMonth' | 'custom';
export const historyPeriods: readonly { value: HistoryPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'last7', label: 'Últimos 7 dias' },
  { value: 'last30', label: 'Últimos 30 dias' },
  { value: 'previousMonth', label: 'Mês anterior' },
  { value: 'custom', label: 'Personalizado' },
];
export function historyDateText(date: Date, language: string) {
  const day = String(date.getDate()).padStart(2, '0'), month = String(date.getMonth() + 1).padStart(2, '0');
  return `${language === 'en' ? month + '/' + day : day + '/' + month}/${date.getFullYear()}`;
}
function parseDate(text: string, language: string) {
  const digits = text.replace(/\//g, '');
  if (!/^\d{8}$/.test(digits)) throw new Error('Informe datas válidas no formato indicado.');
  const first = Number(digits.slice(0, 2)), second = Number(digits.slice(2, 4)), year = Number(digits.slice(4));
  const month = language === 'en' ? first : second, day = language === 'en' ? second : first;
  const date = new Date(year, month - 1, day);
  if (year < 1000 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Informe datas válidas no formato indicado.');
  return date;
}
export function historyDateRange(period: HistoryPeriod, now = new Date(), from = '', through = '', language = 'pt') {
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (period === 'last7' || period === 'last30') start.setDate(start.getDate() - (period === 'last7' ? 6 : 29));
  if (period === 'previousMonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === 'custom') {
    start = parseDate(from, language);
    end = parseDate(through, language);
    if (end < start) throw new Error('A data final deve ser igual ou posterior à inicial.');
    end.setDate(end.getDate() + 1);
  }
  return { start: start.getTime(), end: end.getTime() };
}
export function historyInRange(createdAt: string, range: { start: number; end: number }) {
  const time = Date.parse(createdAt);
  return time >= range.start && time < range.end;
}
