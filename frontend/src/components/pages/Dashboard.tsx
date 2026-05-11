import React, { useCallback, useMemo } from 'react';
import { useDebouncedValue } from 'hooks/useDebouncedValue';
import { formatCurrency, formatNumber } from 'utils/formatters';
import { useDashboard } from 'hooks/useDashboard';
import { useDashboardFilters } from 'contexts/DashboardFiltersContext';
import { useDashboardStats } from 'hooks/useDashboardStats';
import { useDashboardCharts } from 'hooks/useDashboardCharts';
import { useChartHiddenItems } from 'hooks/useChartHiddenItems';
import { useDashboardChartClicks } from 'hooks/useDashboardChartClicks';
import {
  BarChart,
  ResponsiveLineChart,
  DualLineChart,
  ResponsivePieChart,
  BackupStatusStackedBarChart,
  TicketMedioCard,
  type BackupStatusKey,
  type TicketMedioData,
} from 'components/charts';
import { Spinner } from 'components/ui';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import { DashboardService } from 'services/dashboardService';
import type { Titulo } from 'types/entities';
import DashboardSearchResult from '../dashboard/DashboardSearchResult';

const DASHBOARD_SEARCH_DEBOUNCE_MS = 400;

/** MM/AA → primeiro e último dia do mês (ISO local), espelhando o gráfico de receita mensal. */
function parseMesAnoToDateRangeISO(mesAno: string): { data_inicio: string; data_fim: string } | null {
  const parts = mesAno.split('/');
  if (parts.length !== 2) return null;
  const month = parseInt(parts[0], 10);
  const year = 2000 + parseInt(parts[1], 10);
  if (!month || month < 1 || month > 12 || Number.isNaN(year)) return null;
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    data_inicio: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
    data_fim: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`,
  };
}

/** Valor médio por título (não cancelado) com vencimento no intervalo — ticket do mês. */
function ticketMedioNoMes(
  titulos: Titulo[] | undefined,
  dataInicio: string | undefined,
  dataFim: string | undefined,
  mesLabel: string
): number {
  let di = dataInicio?.slice(0, 10);
  let df = dataFim?.slice(0, 10);
  if (!di || !df) {
    const parsed = parseMesAnoToDateRangeISO(mesLabel);
    if (!parsed) return 0;
    di = parsed.data_inicio;
    df = parsed.data_fim;
  }
  const inicio = new Date(`${di}T00:00:00`);
  const fim = new Date(`${df}T23:59:59.999`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return 0;

  let soma = 0;
  let n = 0;
  for (const t of titulos ?? []) {
    if (t.status === 'cancelado') continue;
    if (!t.data_vencimento) continue;
    const v = new Date(`${String(t.data_vencimento).slice(0, 10)}T12:00:00`);
    if (v >= inicio && v <= fim) {
      soma += Number(t.valor) || 0;
      n += 1;
    }
  }
  return n > 0 ? soma / n : 0;
}

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { searchValue, searchField } = useTableHeader();
  const debouncedSearch = useDebouncedValue(searchValue.trim(), DASHBOARD_SEARCH_DEBOUNCE_MS);
  const { activeModal, openModal } = useModal();
  const { startDate, endDate } = useDashboardFilters();

  const {
    hiddenClientes,
    hiddenPagamentos,
    hiddenDistribuicao,
    hiddenContratos,
    hiddenBackupStatus,
    toggleCliente,
    togglePagamento,
    toggleDistribuicao,
    toggleContratos,
    toggleBackupStatus,
  } = useChartHiddenItems();

  const {
    handleClienteSliceClick,
    handleStatusPagamentoSliceClick,
    handleDistribuicaoPlanoSliceClick,
    handleContratoSliceClick,
    handleClientesPorPlanoBarClick,
    handleRecebidosPeriodoPointClick,
    handleReceberPeriodoPointClick,
    handleReceitaMensalPointClick,
    handleCrescimentoClientesPointClick,
    handleDualLineChartPointClick,
  } = useDashboardChartClicks();

  // Query única para buscar todos os dados do dashboard
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboard({
    startDate,
    endDate,
  });

  // Calcular estatísticas usando hook customizado
  const stats = useDashboardStats(dashboardData);

  // Preparar dados dos gráficos usando hook customizado
  const charts = useDashboardCharts(dashboardData, stats, t);

  const backupStatusLegendLabels = useMemo(
    () => ({
      falha: t('dashboard.backupStatusLegendFalha'),
      sucesso: t('dashboard.backupStatusLegendSucesso'),
      somente_local: t('dashboard.backupStatusLegendSomenteLocal'),
      falha_envio: t('dashboard.backupStatusLegendFalhaEnvio'),
      verificado: t('dashboard.backupStatusLegendVerificado'),
    }),
    [t]
  );

  const backupStatusGraficoUltimos7Dias = useMemo(
    () => dashboardData?.backupStatusGrafico ?? [],
    [dashboardData?.backupStatusGrafico]
  );

  const backupStatusPeriodoTemEventos = useMemo(
    () => backupStatusGraficoUltimos7Dias.some(
      (d) => d.falha + d.sucesso + d.somente_local + d.falha_envio + d.verificado > 0
    ),
    [backupStatusGraficoUltimos7Dias]
  );

  const backupStatusDashboardSummary = useMemo(() => {
    let sucesso = 0;
    let falha = 0;
    for (const d of backupStatusGraficoUltimos7Dias) {
      sucesso += d.sucesso;
      falha += d.falha;
    }
    const total = sucesso + falha;
    const failureBadgeText =
      falha > 0
        ? falha === 1
          ? t('dashboard.backupStatusFailureBadgeOne', { count: falha })
          : t('dashboard.backupStatusFailureBadgeMany', { count: falha })
        : null;
    return { total, sucesso, falha, failureBadgeText };
  }, [backupStatusGraficoUltimos7Dias, t]);

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

    const calcVariacao = (arr: { valor?: number }[]) => {
      if (arr.length < 2) return '';
      const ant = Number(arr[arr.length - 2]?.valor) || 0;
      const atu = Number(arr[arr.length - 1]?.valor) || 0;
      if (ant <= 0) return '';
      const pct = ((atu - ant) / ant) * 100;
      const sinal = pct >= 0 ? '+' : '';
      return `${sinal}${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    };

    const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
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

  const handleBackupStatusSegmentClick = useCallback(
    async (dataISO: string, status: BackupStatusKey) => {
      const { items } = await DashboardService.getBackupStatusDetalhe(dataISO, status);
      openModal('dashboard-backup-equipamentos', {
        items: items.map((row) => ({
          id: String(row.id),
          deviceId: row.deviceId,
          deviceName: row.deviceName,
          fileName: row.fileName,
          sizeBytes: row.sizeBytes,
          startedAt: row.startedAt,
          finishedAt: row.finishedAt,
          detail: row.detail,
        })),
      });
    },
    [openModal]
  );

  if (loadingDashboard) {
    return (
      <div className="dashboard-container">
        <div className="text-center">
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
        </div>
      </div>
    );
  }

  // Se houver busca no header E não houver modal aberto, mostrar resultados da busca
  if (debouncedSearch && !activeModal) {
    return (
      <div className="dashboard-container">
        <div className="container-fluid px-0">
          <DashboardSearchResult searchTerm={debouncedSearch} searchField={searchField} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container-fluid px-0">
        <div className="row g-2 align-items-stretch">
          <div className="col-12 col-sm-6 col-md-4">
            <div className="chart-card chart-card-pie chart-card-pie--metric">
              <ResponsivePieChart
                data={charts.clientesChartData}
                title={t('dashboard.clientStatus')}
                hiddenItems={hiddenClientes}
                onToggleItem={toggleCliente}
                onSliceClick={handleClienteSliceClick}
                centerHighlightFilterValue
                chartLeading
                metricLayout
                metricHeaderIcon="clients"
                metricHeaderInfo={t('dashboard.clientStatusInfo')}
                footerLeft={clientesMetricFooter.left}
                footerRight={clientesMetricFooter.right}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="chart-card chart-card-pie chart-card-pie--metric">
              <TicketMedioCard data={ticketMedioCardData} />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="chart-card chart-card-pie chart-card-pie--metric">
              <ResponsivePieChart
                data={charts.distribuicaoPlanos}
                title={t('dashboard.planDistribution')}
                hiddenItems={hiddenDistribuicao}
                onToggleItem={toggleDistribuicao}
                onSliceClick={handleDistribuicaoPlanoSliceClick}
                centerHighlightFilterValue={distribuicaoPlanoMetric.centerFv}
                chartLeading
                metricLayout
                metricHeaderIcon="plans"
                metricHeaderInfo={t('dashboard.planDistributionInfo')}
                footerLeft={distribuicaoPlanoMetric.footerLeft}
                footerRight={distribuicaoPlanoMetric.footerRight}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="chart-card chart-card-pie chart-card-pie--metric">
              <BackupStatusStackedBarChart
                days={backupStatusGraficoUltimos7Dias}
                title={t('dashboard.backupStatusTitle')}
                legendLabels={backupStatusLegendLabels}
                emptyMessage={t('dashboard.backupStatusEmpty')}
                onSegmentClick={handleBackupStatusSegmentClick}
                hiddenKeys={hiddenBackupStatus}
                onLegendToggle={(key) => toggleBackupStatus(key)}
                failureBadgeText={backupStatusDashboardSummary.failureBadgeText}
                periodHasBackupEvents={backupStatusPeriodoTemEventos}
                headerInfo={t('dashboard.backupStatusInfo')}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="chart-card chart-card-pie chart-card-pie--metric">
              <ResponsivePieChart
                data={charts.contratosChartData}
                title={t('dashboard.contractStatus')}
                hiddenItems={hiddenContratos}
                onToggleItem={toggleContratos}
                onSliceClick={handleContratoSliceClick}
                centerHighlightFilterValue="ativo"
                chartLeading
                metricLayout
                metricHeaderIcon="contracts"
                metricHeaderInfo={t('dashboard.contractStatusInfo')}
                footerLeft={contratosMetricFooter.left}
                footerRight={contratosMetricFooter.right}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="chart-card chart-card-pie chart-card-pie--metric">
              <ResponsivePieChart
                data={charts.statusPagamentoData}
                title={t('dashboard.paymentStatus')}
                hiddenItems={hiddenPagamentos}
                onToggleItem={togglePagamento}
                onSliceClick={handleStatusPagamentoSliceClick}
                centerHighlightFilterValue="pendente"
                chartLeading
                metricLayout
                metricHeaderIcon="payments"
                metricHeaderInfo={t('dashboard.paymentStatusInfo')}
                footerLeft={pagamentosMetricFooter.left}
                footerRight={pagamentosMetricFooter.right}
              />
            </div>
          </div>
        </div>

        <div className="row g-2 align-items-stretch">
          <div className="col-12 col-md-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.recebidosPeriodoChartData}
                title={`${t('dashboard.received')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
                titleInfo={t('dashboard.chartReceivedInfo')}
                format="currency"
                onPointClick={handleRecebidosPeriodoPointClick}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.receberPeriodoChartData}
                title={`${t('dashboard.toReceive')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalReceberPeriodo || 0)}`}
                titleInfo={t('dashboard.chartToReceiveInfo')}
                format="currency"
                onPointClick={handleReceberPeriodoPointClick}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.receitaMensalChartData}
                title={`${t('dashboard.monthlyRevenueTitle')}: ${formatCurrency(charts.totalReceitaMensal || 0)} (${t('dashboard.months12')})`}
                titleInfo={t('dashboard.chartMonthlyRevenueInfo')}
                format="currency"
                onPointClick={handleReceitaMensalPointClick}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.crescimentoClientes}
                title={`${t('dashboard.newClients')}: ${formatNumber(charts.totalNovosClientes || 0)} (${t('dashboard.months12')})`}
                titleInfo={t('dashboard.chartNewClientsInfo')}
                format="number"
                onPointClick={handleCrescimentoClientesPointClick}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="chart-card">
              <DualLineChart
                data={charts.contasReceberPagarChartData}
                title={`${t('dashboard.receivablesVsPayables')} (${t('dashboard.months12')})`}
                titleInfo={t('dashboard.chartReceivablesPayablesInfo')}
                format="currency"
                onPointClick={handleDualLineChartPointClick}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="chart-card" style={{ height: 'auto', minHeight: 0 }}>
              <BarChart
                data={charts.clientesPorPlano}
                title={t('dashboard.clientsByPlan')}
                titleInfo={t('dashboard.chartClientsByPlanInfo')}
                format="number"
                onBarClick={handleClientesPorPlanoBarClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;