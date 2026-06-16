import type { StatusBadgeConfig } from 'components/ui/StatusBadge';
import { STATUS_OPTIONS } from './OrdemServicoFormFields';

const STATUS_CLASS: Record<string, string> = {
  A: 'os-status--aberta',
  AG: 'os-status--agendada',
  EN: 'os-status--encaminhada',
  AS: 'os-status--assumida',
  F: 'os-status--finalizada',
  AN: 'os-status--analise',
  DS: 'os-status--deslocamento',
  EX: 'os-status--execucao',
  RAG: 'os-status--reagendar',
};

const labelFromStatus = (value: unknown): string => {
  const v = String(value ?? '');
  return STATUS_OPTIONS.find((o) => o.value === v)?.label || v || '—';
};

export function getOrdemServicoStatusBadgeConfig(status: unknown): StatusBadgeConfig {
  const key = String(status ?? '');
  return {
    label: labelFromStatus(key),
    className: `os-status-badge ${STATUS_CLASS[key] ?? 'os-status--default'}`,
  };
}

export const ORDEM_SERVICO_STATUS_BADGE_LABELS = STATUS_OPTIONS.map((o) => o.label);
