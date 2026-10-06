export function localDayText(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function agendaWindow(text: string, mode: 'day' | 'week') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Informe a data em AAAA-MM-DD.');
  const start = new Date(`${text}T00:00:00`);
  if (!Number.isFinite(start.getTime()) || localDayText(start) !== text) throw new Error('Informe a data em AAAA-MM-DD.');
  const end = new Date(start); end.setDate(end.getDate() + (mode === 'week' ? 7 : 1));
  return { start: start.getTime(), end: end.getTime() };
}
export function shiftAgenda(text: string, days: number) { const window = agendaWindow(text, 'day'), date = new Date(window.start); date.setDate(date.getDate() + days); return localDayText(date); }
export function preorderTiming(dueAt: string, status: string, now: number) {
  if (['completed', 'cancelled'].includes(status)) return '';
  const delay = Date.parse(dueAt) - now;
  return delay < 0 ? 'Atrasada' : delay <= 3600000 ? 'Próxima hora' : '';
}
