import type { StatusBadgeConfig } from 'components/ui/StatusBadge';
import { PRIORIDADE_OPTIONS } from './AtendimentoFormFields';

const PRIORIDADE_CLASS: Record<string, string> = {
  B: 'os-prioridade--baixa',
  N: 'os-prioridade--normal',
  A: 'os-prioridade--alta',
  C: 'os-prioridade--critica',
};

const labelFromPrioridade = (value: unknown): string => {
  const v = String(value ?? '');
  return PRIORIDADE_OPTIONS.find((o) => o.value === v)?.label || v || '—';
};

export function getAtendimentoPrioridadeBadgeConfig(prioridade: unknown): StatusBadgeConfig {
  const key = String(prioridade ?? '');
  return {
    label: labelFromPrioridade(key),
    className: `os-prioridade-badge ${PRIORIDADE_CLASS[key] ?? 'os-prioridade--default'}`,
  };
}

export const ATENDIMENTO_PRIORIDADE_BADGE_LABELS = PRIORIDADE_OPTIONS.map((o) => o.label);
