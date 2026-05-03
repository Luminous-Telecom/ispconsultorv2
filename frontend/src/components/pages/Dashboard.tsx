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
  ClientesCard,
  TicketMedioCard,
  type BackupStatusKey,
  type ClientesData,
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
    hiddenPagamentos,
    hiddenDistribuicao,
    hiddenContratos,
    hiddenBackupStatus,
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

  /**
   * Gráfico no dashboard: até 7 barras, só em dias com evento de backup no período.
   * Não usar slice(-7) no array completo: os eventos podem estar só no início do mês e os
   * últimos 7 dias do calendário ficariam zerados → "Nenhum evento de backup no período".
   */
  const backupStatusGraficoUltimos7Dias = useMemo(() => {
    const days = dashboardData?.backupStatusGrafico ?? [];
    const comEvento = days.filter(
      (d) =>
        d.falha + d.sucesso + d.somente_local + d.falha_envio + d.verificado > 0
    );
    return comEvento.slice(-7);
  }, [dashboardData?.backupStatusGrafico]);

  const clientesCardData: ClientesData = useMemo(() => {
    const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const d = startDate ? new Date(startDate + 'T00:00:00') : new Date();
    const periodo = `${MES_ABREV[d.getMonth()]} ${d.getFullYear()}`;

    const series = charts.crescimentoClientes;
    let variacaoAtivos = '';
    if (series.length >= 2) {
      const ant = Number(series[series.length - 2]?.valor) || 0;
      const atu = Number(series[series.length - 1]?.valor) || 0;
      if (ant > 0) {
        const pct = ((atu - ant) / ant) * 100;
        const sinal = pct >= 0 ? '+' : '';
        variacaoAtivos = `${sinal}${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
      }
    }

    return {
      ativos: stats.clientesAtivos,
      inativos: stats.clientesInativos,
      variacaoAtivos,
      periodo,
    };
  }, [stats.clientesAtivos, stats.clientesInativos, charts.crescimentoClientes, startDate]);

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
        <div className="container-fluid px-0 px-md-0">
          <DashboardSearchResult searchTerm={debouncedSearch} searchField={searchField} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container-fluid px-0 px-md-0">
        <div className="row g-3">
          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12" style={{ display: 'flex' }}>
            <ClientesCard
              data={clientesCardData}
              onSliceClick={(ativo) =>
                handleClienteSliceClick({ label: ativo ? 'Ativos' : 'Inativos', value: 0, filterValue: ativo })
              }
            />
          </div>

          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12" style={{ display: 'flex' }}>
            <TicketMedioCard data={ticketMedioCardData} />
          </div>

          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12">
            <div className="chart-card chart-card-pie">
              <ResponsivePieChart
                data={charts.distribuicaoPlanos}
                title={t('dashboard.planDistribution')}
                hiddenItems={hiddenDistribuicao}
                onToggleItem={toggleDistribuicao}
                onSliceClick={handleDistribuicaoPlanoSliceClick}
              />
            </div>
          </div>

          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12">
            <div className="chart-card chart-card-pie">
              <BackupStatusStackedBarChart
                days={backupStatusGraficoUltimos7Dias}
                title={t('dashboard.backupStatusTitle')}
                legendLabels={backupStatusLegendLabels}
                emptyMessage={t('dashboard.backupStatusEmpty')}
                onSegmentClick={handleBackupStatusSegmentClick}
                hiddenKeys={hiddenBackupStatus}
                onLegendToggle={(key) => toggleBackupStatus(key)}
              />
            </div>
          </div>

          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12">
            <div className="chart-card chart-card-pie">
              <ResponsivePieChart
                data={charts.contratosChartData}
                title={t('dashboard.contractStatus')}
                hiddenItems={hiddenContratos}
                onToggleItem={toggleContratos}
                onSliceClick={handleContratoSliceClick}
                centerHighlightFilterValue="ativo"
              />
            </div>
          </div>

          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12">
            <div className="chart-card chart-card-pie">
              <ResponsivePieChart
                data={charts.statusPagamentoData}
                title={t('dashboard.paymentStatus')}
                hiddenItems={hiddenPagamentos}
                onToggleItem={togglePagamento}
                onSliceClick={handleStatusPagamentoSliceClick}
                centerHighlightFilterValue="pago,pago_atraso,parcial"
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.recebidosPeriodoChartData}
                title={`${t('dashboard.received')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
                format="currency"
                onPointClick={handleRecebidosPeriodoPointClick}
              />
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.receberPeriodoChartData}
                title={`${t('dashboard.toReceive')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalReceberPeriodo || 0)}`}
                format="currency"
                onPointClick={handleReceberPeriodoPointClick}
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.receitaMensalChartData}
                title={`${t('dashboard.monthlyRevenueTitle')}: ${formatCurrency(charts.totalReceitaMensal || 0)} (${t('dashboard.months12')})`}
                format="currency"
                onPointClick={handleReceitaMensalPointClick}
              />
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.crescimentoClientes}
                title={`${t('dashboard.newClients')}: ${formatNumber(charts.totalNovosClientes || 0)} (${t('dashboard.months12')})`}
                format="number"
                onPointClick={handleCrescimentoClientesPointClick}
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card">
              <DualLineChart
                data={charts.contasReceberPagarChartData}
                title={`${t('dashboard.receivablesVsPayables')} (${t('dashboard.months12')})`}
                format="currency"
                onPointClick={handleDualLineChartPointClick}
              />
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card" style={{ height: 'auto', minHeight: 0 }}>
              <BarChart data={charts.clientesPorPlano} title={t('dashboard.clientsByPlan')} format="number" onBarClick={handleClientesPorPlanoBarClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;