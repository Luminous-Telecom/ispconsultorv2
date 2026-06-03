import { useMemo } from 'react';
import type { TicketMedioData } from 'components/charts';
import type { DashboardData } from 'services/dashboardService';
import type { useDashboardStats } from 'hooks/useDashboardStats';
import type { useDashboardCharts } from 'hooks/useDashboardCharts';
import type { TranslationKeys } from 'contexts/I18nContext';

const TIPO_CORES_FALLBACK: Record<string, string> = {
  infraestrutura: '#3b82f6',
  consultoria: '#10b981',
  blockdomi: '#8b5cf6',
};

interface UseDashboardMetricsParams {
  stats: ReturnType<typeof useDashboardStats>;
  charts: ReturnType<typeof useDashboardCharts>;
  dashboardData: DashboardData | undefined;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
}

export function useDashboardMetrics({
  stats,
  charts,
  dashboardData,
  t,
}: UseDashboardMetricsParams) {
  const ticketMedioCardData: TicketMedioData = useMemo(() => {
    const tipoLabels: Record<string, string> = {
      infraestrutura: t('form.serviceTypeInfrastructure'),
      consultoria: t('form.serviceTypeConsulting'),
      blockdomi: t('form.serviceTypeBlockdomi'),
    };

    const colorByTipo = Object.fromEntries(
      charts.distribuicaoPlanos
        .filter((row) => row.filterValue != null && row.color)
        .map((row) => [String(row.filterValue), row.color as string])
    );

    const seriesPorTipo = (dashboardData?.ticketMedioPorTipoServico ?? [])
      .filter((row) => row.ticket_medio > 0)
      .map((row) => ({
        mes: tipoLabels[row.tipo_servico] || row.tipo_servico,
        valor: row.ticket_medio,
        color: colorByTipo[row.tipo_servico] || TIPO_CORES_FALLBACK[row.tipo_servico],
      }))
      .sort((a, b) => b.valor - a.valor);

    return {
      ticketMedio: stats.ticketMedio,
      seriesMensal: seriesPorTipo,
    };
  }, [stats.ticketMedio, charts.distribuicaoPlanos, dashboardData?.ticketMedioPorTipoServico, t]);

  const clientesMetricFooter = useMemo(() => {
    const ativos = stats.clientesAtivos;
    const inativos = stats.clientesInativos;
    const total = ativos + inativos;
    const pct = total > 0 ? Math.round((ativos / total) * 100) : 0;
    return {
      left: { label: t('dashboard.clientsTotalMetric'), value: total },
      right: {
        label: t('dashboard.contractsActivityMetric'),
        value: `${pct}%`,
        accentColor: '#10b981',
      },
    };
  }, [stats.clientesAtivos, stats.clientesInativos, t]);

  const contratosMetricFooter = useMemo(() => {
    const rows = charts.contratosChartData;
    const total = rows.reduce((s, item) => s + (Number(item.value ?? item.valor) || 0), 0);
    const ativos = stats.contratosAtivos;
    const pct = total > 0 ? Math.round((ativos / total) * 100) : 0;
    return {
      left: { label: t('dashboard.contractsTotalMetric'), value: total },
      right: {
        label: t('dashboard.contractsActivityMetric'),
        value: `${pct}%`,
        accentColor: '#10b981',
      },
    };
  }, [charts.contratosChartData, stats.contratosAtivos, t]);

  const pagamentosMetricFooter = useMemo(() => {
    const rows = charts.statusPagamentoData;
    const total = rows.reduce((s, item) => s + (Number(item.value ?? item.valor) || 0), 0);
    const cancelItem = rows.find((item) => String(item.filterValue) === 'cancelado');
    const cancelVal = cancelItem ? Number(cancelItem.value ?? cancelItem.valor) || 0 : 0;
    const pct = total > 0 ? Math.round((cancelVal / total) * 100) : 0;
    return {
      left: { label: t('dashboard.chargesTotalMetric'), value: total },
      right: {
        label: t('dashboard.chargesCancellationMetric'),
        value: `${pct}%`,
        accentColor: '#fb923c',
      },
    };
  }, [charts.statusPagamentoData, t]);

  const distribuicaoPlanoMetric = useMemo(() => {
    const rows = charts.distribuicaoPlanos;
    if (!rows.length) {
      return {
        centerFv: undefined as string | undefined,
        footerLeft: { label: t('dashboard.clientsTotalMetric'), value: 0 },
        footerRight: {
          label: t('dashboard.planDistributionTopShare'),
          value: '0%',
          accentColor: '#3b82f6',
        },
      };
    }
    const sum = rows.reduce((s, i) => s + (Number(i.value ?? i.valor) || 0), 0);
    const top = rows.reduce((best, cur) => {
      const cv = Number(cur.value ?? cur.valor) || 0;
      const bv = Number(best.value ?? best.valor) || 0;
      return cv > bv ? cur : best;
    }, rows[0]);
    const topV = Number(top.value ?? top.valor) || 0;
    const pct = sum > 0 ? Math.round((topV / sum) * 100) : 0;
    const fv = top.filterValue != null ? String(top.filterValue) : '';
    return {
      centerFv: fv || undefined,
      footerLeft: { label: t('dashboard.clientsTotalMetric'), value: sum },
      footerRight: {
        label: t('dashboard.planDistributionTopShare'),
        value: `${pct}%`,
        accentColor: typeof top.color === 'string' && top.color ? top.color : '#3b82f6',
      },
    };
  }, [charts.distribuicaoPlanos, t]);

  return {
    ticketMedioCardData,
    clientesMetricFooter,
    contratosMetricFooter,
    pagamentosMetricFooter,
    distribuicaoPlanoMetric,
  };
}
