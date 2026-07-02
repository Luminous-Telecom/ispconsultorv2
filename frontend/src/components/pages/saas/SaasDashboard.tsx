import React, { useEffect, useMemo } from 'react';
import { useDebouncedValue } from 'hooks/useDebouncedValue';
import { formatCurrency, formatNumber } from 'utils/formatters';
import { useSaasDashboard } from 'hooks/useSaasDashboard';
import { useSaasServerStats } from 'hooks/useSaasServerStats';
import { useDashboardFilters } from 'contexts/DashboardFiltersContext';
import { useDashboardStats } from 'hooks/useDashboardStats';
import { useDashboardCharts } from 'hooks/useDashboardCharts';
import { useChartHiddenItems } from 'hooks/useChartHiddenItems';
import { useSaasDashboardChartClicks } from 'hooks/useSaasDashboardChartClicks';
import { useDashboardMetrics } from '../dashboard/hooks/useDashboardMetrics';
import {
  PieStatusCard,
  LineChartCard,
  ClientsByPlanCard,
  AverageTicketCard,
  StatTilesCard,
  GaugeCard,
} from 'components/dashboard/cards';
import { CHART_FINANCE_COLORS } from 'components/charts/chartColors';
import Loading from 'components/common/Loading';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { getSaasTenantHeaderSearchFields } from '../../modals/saas/saasTenantListTableConfig';
import SaasDashboardSearchResult from './SaasDashboardSearchResult';

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const SAAS_DASHBOARD_SEARCH_DEBOUNCE_MS = 400;

const SaasDashboard: React.FC = () => {
  const { t } = useI18n();
  const { searchValue, setAvailableSearchFields, setSearchPlaceholder } = useTableHeader();
  const debouncedSearch = useDebouncedValue(searchValue.trim(), SAAS_DASHBOARD_SEARCH_DEBOUNCE_MS);
  const { activeModal } = useModal();
  const { startDate, endDate } = useDashboardFilters();

  const saasSearchFields = useMemo(() => getSaasTenantHeaderSearchFields(t), [t]);

  useEffect(() => {
    setAvailableSearchFields(saasSearchFields);
    setSearchPlaceholder(t('layout.searchPlaceholder'));
  }, [saasSearchFields, setAvailableSearchFields, setSearchPlaceholder, t]);

  const {
    hiddenClientes,
    hiddenPagamentos,
    hiddenContratos,
    toggleCliente,
    togglePagamento,
    toggleContratos,
  } = useChartHiddenItems();

  const {
    handleClienteSliceClick,
    handleStatusPagamentoSliceClick,
    handleContratoSliceClick,
    handleClientesPorPlanoBarClick,
    handleRecebidosPeriodoPointClick,
    handleReceberPeriodoPointClick,
    handleReceitaMensalPointClick,
    handleCrescimentoClientesPointClick,
  } = useSaasDashboardChartClicks();

  const { data: dashboardData, isLoading: loadingDashboard } = useSaasDashboard({
    startDate,
    endDate,
  });

  const { data: serverStats } = useSaasServerStats();

  const stats = useDashboardStats(dashboardData);
  const charts = useDashboardCharts(dashboardData, stats, t);
  const metrics = useDashboardMetrics({ stats, charts, dashboardData, t });

  if (loadingDashboard) {
    return (
      <div className="dashboard-container dashboard-container--loading">
        <Loading message={t('ui.loadingDashboard')} variant="page" />
      </div>
    );
  }

  if (debouncedSearch && !activeModal) {
    return (
      <div className="dashboard-container">
        <div className="container-fluid px-0">
          <SaasDashboardSearchResult searchTerm={debouncedSearch} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container-fluid px-0">
        <div className="row align-items-stretch dashboard-pie-charts-row">
          <div className="col-auto dashboard-col--compact">
            <PieStatusCard
              data={charts.clientesChartData}
              title={t('dashboard.clientStatus')}
              hiddenItems={hiddenClientes}
              onToggleItem={toggleCliente}
              onSliceClick={handleClienteSliceClick}
              centerHighlightFilterValue
            />
          </div>

          <div className="col-auto dashboard-col--compact">
            <PieStatusCard
              data={charts.contratosChartData}
              title={t('dashboard.contractStatus')}
              hiddenItems={hiddenContratos}
              onToggleItem={toggleContratos}
              onSliceClick={handleContratoSliceClick}
              centerHighlightFilterValue="ativo"
            />
          </div>

          <div className="col-auto dashboard-col--compact">
            <PieStatusCard
              data={charts.statusPagamentoData}
              title={t('dashboard.paymentStatus')}
              hiddenItems={hiddenPagamentos}
              onToggleItem={togglePagamento}
              onSliceClick={handleStatusPagamentoSliceClick}
              centerHighlightFilterValue="pendente"
            />
          </div>

          <div className="col-auto dashboard-col--compact">
            <AverageTicketCard data={metrics.ticketMedioCardData} />
          </div>
        </div>

        <div className="row">
          {serverStats && (
            <>
              <div className="col-12 col-sm-6 col-md-4">
                <GaugeCard
                  title="Memória RAM"
                  usageLabel="Uso"
                  usedPercent={serverStats.ram.usedPercent}
                  rows={[
                    { label: 'Usada', value: formatBytes(serverStats.ram.used) },
                    { label: 'Livre', value: formatBytes(serverStats.ram.free) },
                    { label: 'Total', value: formatBytes(serverStats.ram.total) },
                  ]}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <GaugeCard
                  title="Disco (HD)"
                  usageLabel="Uso"
                  usedPercent={serverStats.disk.usedPercent}
                  rows={[
                    { label: 'Usado', value: formatBytes(serverStats.disk.used) },
                    { label: 'Livre', value: formatBytes(serverStats.disk.free) },
                    { label: 'Total', value: formatBytes(serverStats.disk.total) },
                  ]}
                />
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <GaugeCard
                  title="CPU"
                  usageLabel="Uso"
                  usedPercent={serverStats.cpu.usedPercent}
                  rows={[
                    { label: 'Núcleos', value: serverStats.cpu.cores },
                    { label: 'Load (1 min)', value: serverStats.cpuLoad[0].toFixed(2) },
                    { label: 'Load (5 min)', value: serverStats.cpuLoad[1].toFixed(2) },
                  ]}
                />
              </div>
            </>
          )}

          {dashboardData?.queueStats != null && (
            <div className="col-12 col-sm-6 col-md-4">
              <StatTilesCard
                title={t('scheduler.title')}
                tiles={[
                  { label: t('scheduler.queueWaiting'), value: dashboardData.queueStats.queueSize, accent: '#f59e0b' },
                  { label: t('scheduler.queueRunning'), value: dashboardData.queueStats.queueRunning, accent: '#10b981' },
                  { label: t('scheduler.queueConcurrency'), value: dashboardData.queueStats.queueConcurrency, accent: '#6366f1' },
                ]}
              />
            </div>
          )}

          {serverStats && (
            <div className="col-12 col-sm-6 col-md-4">
              <StatTilesCard
                title="Servidor"
                columns={2}
                tiles={[
                  { label: 'Uptime', value: formatUptime(serverStats.uptime), accent: '#0ea5e9' },
                  { label: 'CPU (1 min)', value: serverStats.cpuLoad[0].toFixed(2), accent: '#10b981' },
                  { label: 'CPU (5 min)', value: serverStats.cpuLoad[1].toFixed(2), accent: '#f59e0b' },
                  { label: 'CPU (15 min)', value: serverStats.cpuLoad[2].toFixed(2), accent: '#a855f7' },
                ]}
              />
            </div>
          )}
        </div>

        <div className="row">
          <div className="col-12 col-md-6">
            <LineChartCard
              data={charts.recebidosPeriodoChartData}
              title={`${t('dashboard.received')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
              titleInfo={t('dashboard.chartReceivedInfo')}
              format="currency"
              lineColor={CHART_FINANCE_COLORS.received}
              onPointClick={handleRecebidosPeriodoPointClick}
            />
          </div>

          <div className="col-12 col-md-6">
            <LineChartCard
              data={charts.receberPeriodoChartData}
              title={`${t('dashboard.toReceive')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalReceberPeriodo || 0)}`}
              titleInfo={t('dashboard.chartToReceiveInfo')}
              format="currency"
              lineColor={CHART_FINANCE_COLORS.toReceive}
              onPointClick={handleReceberPeriodoPointClick}
            />
          </div>

          <div className="col-12 col-md-6">
            <LineChartCard
              data={charts.receitaMensalChartData}
              title={`${t('dashboard.monthlyRevenueTitle')}: ${formatCurrency(charts.totalReceitaMensal || 0)} (${t('dashboard.months12')})`}
              titleInfo={t('dashboard.chartMonthlyRevenueInfo')}
              format="currency"
              onPointClick={handleReceitaMensalPointClick}
            />
          </div>

          <div className="col-12 col-md-6">
            <LineChartCard
              data={charts.crescimentoClientes}
              title={`${t('dashboard.newClients')}: ${formatNumber(charts.totalNovosClientes || 0)} (${t('dashboard.months12')})`}
              titleInfo={t('dashboard.chartNewClientsInfo')}
              format="number"
              onPointClick={handleCrescimentoClientesPointClick}
            />
          </div>

          <div className="col-12 col-md-6">
            <ClientsByPlanCard
              data={charts.clientesPorPlano}
              title={t('dashboard.clientsByPlan')}
              titleInfo={t('dashboard.chartClientsByPlanInfo')}
              onBarClick={handleClientesPorPlanoBarClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaasDashboard;
