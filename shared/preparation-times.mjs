export const PREPARATION_STAGES = ['received', 'preparing', 'ready', 'completed'];
export const PREPARATION_TIMES = ['startedAt', 'readyAt', 'completedAt'];
export const PREPARATION_ACTORS = ['startedBy', 'readyBy', 'completedBy'];
export function validPreparationTimes(value) {
  const stage = PREPARATION_STAGES.indexOf(value.status);
  let previous = -Infinity;
  for (let index = 0; index < PREPARATION_TIMES.length; index++) {
    const time = value[PREPARATION_TIMES[index]];
    const actor = value[PREPARATION_ACTORS[index]];
    if (actor !== undefined && (!time || typeof actor !== 'string' || !/^[a-z0-9._-]{3,24}$/.test(actor))) return false;
    if (time === undefined) continue; // Historical records have unknown times.
    if (stage < index + 1 || typeof time !== 'string' || time.length > 40 || !Number.isFinite(Date.parse(time)) || Date.parse(time) < previous || Date.parse(time) > Date.parse(value.updatedAt)) return false;
    previous = Date.parse(time);
  }
  return true;
}
export function nextPreparation(previous, order, status, now, actor) {
  const current = previous?.status ?? 'received';
  if (PREPARATION_STAGES.indexOf(status) !== PREPARATION_STAGES.indexOf(current) + 1 || !Number.isFinite(Date.parse(now)) || Date.parse(now) < Date.parse(order.createdAt) || (previous && Date.parse(now) < Date.parse(previous.updatedAt))) throw new Error('Confira a etapa e a data/hora do tablet antes de avançar o preparo.');
  const value = { ...previous, orderId: order.id, status, updatedAt: now };
  // Recover only the previous known stage time, never invent skipped times.
  const currentTime = PREPARATION_TIMES[PREPARATION_STAGES.indexOf(current) - 1];
  if (previous && currentTime && !value[currentTime]) value[currentTime] = previous.updatedAt;
  value[PREPARATION_TIMES[PREPARATION_STAGES.indexOf(status) - 1]] = now;
  if (actor !== undefined) {
    if (typeof actor !== 'string' || !/^[a-z0-9._-]{3,24}$/.test(actor)) throw new Error('Entre novamente para registrar o operador do preparo.');
    value[PREPARATION_ACTORS[PREPARATION_STAGES.indexOf(status) - 1]] = actor;
  }
  return value;
}
export function preparationDurations(order, value) {
  const between = (a, b) => a && b && Number.isFinite(Date.parse(a)) && Number.isFinite(Date.parse(b)) && Date.parse(b) >= Date.parse(a) ? (Date.parse(b) - Date.parse(a)) / 1000 : null;
  return { waitSeconds: between(order.createdAt, value?.startedAt), preparationSeconds: between(value?.startedAt, value?.readyAt), totalSeconds: between(order.createdAt, value?.readyAt) };
}
