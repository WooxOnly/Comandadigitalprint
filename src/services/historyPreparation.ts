import type { Preparation } from './business';

const stages = ['received', 'preparing', 'ready', 'completed'] as const;
const labels = ['Aguardando', 'Em preparo', 'Pronto', 'Finalizado'] as const;
const timeKeys = ['startedAt', 'readyAt', 'completedAt'] as const;
const timeLabels = ['Início do preparo', 'Pronto', 'Finalizado'] as const;
const validTime = (value?: string) => value && Number.isFinite(Date.parse(value)) ? value : null;

// Read the saved workflow, never reinterpret old orders using today's finish policy.
export function historyPreparation(createdAt: string, record: Preparation | undefined, enabled: boolean) {
  if (!record && !enabled) return null;
  const stage = record ? stages.indexOf(record.status) : 0;
  if (stage < 0) return null;
  return {
    status: stages[stage],
    label: labels[stage],
    times: [
      { label: 'Enviado à cozinha', at: validTime(createdAt) },
      ...timeKeys.slice(0, stage).map((key, index) => ({ label: timeLabels[index], at: validTime(record?.[key]) })),
    ],
  };
}
