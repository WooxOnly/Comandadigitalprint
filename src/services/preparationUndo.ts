import type { Preparation } from './business';

export function canUndoPreparation(value: Preparation, username: string | null, now: number) {
  const actor = value.status === 'completed' ? value.completedBy : value.status === 'ready' ? value.readyBy : value.startedBy;
  const age = now - Date.parse(value.updatedAt);
  return value.status !== 'received' && value.correction?.at !== value.updatedAt && actor === username && age >= 0 && age <= 60000;
}
