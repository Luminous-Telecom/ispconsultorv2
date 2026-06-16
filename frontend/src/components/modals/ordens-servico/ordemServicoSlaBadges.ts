import type { StatusBadgeConfig } from 'components/ui/StatusBadge';

const SLA_LABELS: Record<string, string> = {
  N: 'No prazo',
  A: 'Atrasado',
  S: 'Atingido',
  NULL: '—',
};

export function getOrdemServicoSlaBadgeConfig(statusSla: unknown): StatusBadgeConfig {
  const raw = String(statusSla ?? '').trim();
  if (!raw || raw === 'NULL' || raw === '0') {
    return { label: '—', className: 'os-sla-badge os-sla--vazio' };
  }

  const numeric = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
  if (numeric !== null) {
    const label = `${numeric}%`;
    if (numeric >= 100) {
      return { label, className: 'os-sla-badge os-sla--ok' };
    }
    if (numeric >= 0) {
      return { label, className: 'os-sla-badge os-sla--alerta' };
    }
    return { label, className: 'os-sla-badge os-sla--atrasado' };
  }

  const label = SLA_LABELS[raw] ?? raw;
  const className =
    raw === 'N' || raw === 'S'
      ? 'os-sla-badge os-sla--ok'
      : raw === 'A'
        ? 'os-sla-badge os-sla--atrasado'
        : 'os-sla-badge os-sla--default';

  return { label, className };
}

export const ORDEM_SERVICO_SLA_BADGE_LABELS = ['No prazo', 'Atrasado', 'Atingido', '100%'];
