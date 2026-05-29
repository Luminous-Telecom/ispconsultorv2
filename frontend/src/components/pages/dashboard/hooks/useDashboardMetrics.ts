import { useMemo } from 'react';
import type { TicketMedioData } from 'components/charts';
import type { DashboardData } from 'services/dashboardService';
import type { useDashboardStats } from 'hooks/useDashboardStats';
import type { useDashboardCharts } from 'hooks/useDashboardCharts';
import type { TranslationKeys } from 'contexts/I18nContext';
import { calcVariacao, MES_ABREV, ticketMedioNoMes } from '../utils';

interface UseDashboardMetricsParams {
  stats: ReturnType<typeof useDashboardStats>;
  charts: ReturnType<typeof useDashboardCharts>;
  dashboardData: DashboardData | undefined;
  startDate: string | null;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
}

export function useDashboardMetrics({
  stats,
  charts,
  dashboardData,
  startDate,
  t,
}: UseDashboardMetricsParams) {
  const ticketMedioCardData: TicketMedioData = useMemo(() => {
    const receitaSeries = charts.receitaMensalChartData;
    const titulos = dashboardData?.titulosTodos;

    const ticketMensalSeries = receitaSeries.map((item) => ({
      mes: String(item.mes ?? ''),
      valor: ticketMedioNoMes(
        titulos,
        typeof item.data_inicio === 'string' ? item.data_inicio : undefined,
        typeof item.data_fim === 'string' ? item.data_fim : undefined,
        String(item.mes ?? '')
      ),
    }));

    const last6 = ticketMensalSeries.slice(-6);
    const d = startDate ? new Date(startDate + 'T00:00:00') : new Date();
    const periodo = `${MES_ABREV[d.getMonth()]} ${d.getFullYear()}`;

    return {
      ticketMedio: stats.ticketMedio,
      variacaoTicket: calcVariacao(ticketMensalSeries),
      pedidos: stats.clientesComTitulosPeriodo,
      receitaTotal: stats.receitaPagaPeriodo,
      variacaoReceita: calcVariacao(receitaSeries),
      periodo,
      seriesMensal: last6,
    };
  }, [stats, charts.receitaMensalChartData, startDate, dashboardData?.titulosTodos]);

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
