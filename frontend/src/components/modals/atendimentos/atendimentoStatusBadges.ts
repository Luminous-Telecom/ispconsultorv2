import type { StatusBadgeConfig } from 'components/ui/StatusBadge';
import { STATUS_ATENDIMENTO_OPTIONS } from './AtendimentoFormFields';

const STATUS_CLASS: Record<string, string> = {
  N: 'os-status--aberta',
  P: 'os-status--agendada',
  EP: 'os-status--execucao',
  S: 'os-status--finalizada',
  C: 'os-status--default',
};

const labelFromStatus = (value: unknown): string => {
  const v = String(value ?? '');
  return STATUS_ATENDIMENTO_OPTIONS.find((o) => o.value === v)?.label || v || '—';
};

export function getAtendimentoStatusBadgeConfig(status: unknown): StatusBadgeConfig {
  const key = String(status ?? '');
  return {
    label: labelFromStatus(key),
    className: `os-status-badge ${STATUS_CLASS[key] ?? 'os-status--default'}`,
  };
}

export const ATENDIMENTO_STATUS_BADGE_LABELS = STATUS_ATENDIMENTO_OPTIONS.map((o) => o.label);
