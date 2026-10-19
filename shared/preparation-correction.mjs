import { PREPARATION_STAGES, PREPARATION_TIMES, PREPARATION_ACTORS, validPreparationTimes } from './preparation-times.mjs';
export const correctionMessage = challenge => JSON.stringify(['bistro-preparation-correction-v1', challenge]);
export function isQuickPreparationUndo(challenge) {
  const { before, previous, target, requestedBy, at } = challenge;
  const actor = before.status === 'completed' ? before.completedBy : before.status === 'ready' ? before.readyBy : before.startedBy;
  const age = Date.parse(at) - Date.parse(before.updatedAt);
  return challenge.undo === true && actor === requestedBy && age >= 0 && age <= 60000 && before.correction?.at !== before.updatedAt && target === previous?.status;
}
export function correctedPreparation(challenge, proof, base = 0) {
  const { before, target, at, orderId, id, requestedBy } = challenge;
  const stage = PREPARATION_STAGES.indexOf(target);
  if (stage < 0 || stage >= PREPARATION_STAGES.indexOf(before.status) || !Number.isFinite(Date.parse(at)) || Date.parse(at) < Date.parse(before.updatedAt)) throw new Error('INVALID_PREPARATION_TRANSITION');
  const value = { ...before, status: target, updatedAt: at };
  for (let index = stage; index < PREPARATION_TIMES.length; index++) { delete value[PREPARATION_TIMES[index]]; delete value[PREPARATION_ACTORS[index]]; }
  value.correction = { id, base, from: before.status, to: target, at, requestedBy, authorizedBy: proof.kind === 'undo' ? null : proof.username, requestedStatus: challenge.undo ? null : target, kind: proof.kind };
  if (orderId !== before.orderId || !validPreparationTimes(value)) throw new Error('INVALID_PREPARATION_TIME');
  return value;
}
