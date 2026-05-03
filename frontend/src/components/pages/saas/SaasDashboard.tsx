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
import { BarChart, ValueChart, ResponsiveLineChart, ResponsivePieChart } from 'components/charts';
import { Spinner } from 'components/ui';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import { useTableHeader } from 'contexts/TableHeaderContext';
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

function getUsageColor(percent: number): string {
  if (percent >= 90) return '#ef4444';
  if (percent >= 70) return '#f59e0b';
  return '#10b981';
}

const SAAS_DASHBOARD_SEARCH_DEBOUNCE_MS = 400;

const SAAS_SEARCH_FIELDS = [
  { id: 'todos', label: 'Todos' },
  { id: 'id', label: 'ID' },
  { id: 'cnpj', label: 'CNPJ' },
  { id: 'razao_social', label: 'Razão Social' },
  { id: 'nome_fantasia', label: 'Nome Fantasia' },
  { id: 'email', label: 'Email' },
];

const SaasDashboard: React.FC = () => {
  const { t } = useI18n();
  const { searchValue, searchField, setAvailableSearchFields, setSearchPlaceholder } = useTableHeader();
  const debouncedSearch = useDebouncedValue(searchValue.trim(), SAAS_DASHBOARD_SEARCH_DEBOUNCE_MS);
  const { activeModal } = useModal();
  const { startDate, endDate } = useDashboardFilters();

  useEffect(() => {
    setAvailableSearchFields(SAAS_SEARCH_FIELDS);
    setSearchPlaceholder('Buscar clientes tenants...');
  }, [setAvailableSearchFields, setSearchPlaceholder]);

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

  if (loadingDashboard) {
    return (
      <div className="dashboard-container">
        <div className="text-center">
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
        </div>
      </div>
    );
  }

  if (debouncedSearch && !activeModal) {
    return (
      <div className="dashboard-container">
        <div className="container-fluid px-0">
          <SaasDashboardSearchResult searchTerm={debouncedSearch} searchField={searchField} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container-fluid px-0">
        <div className="row g-2">
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
                footerLeft={clientesMetricFooter.left}
                footerRight={clientesMetricFooter.right}
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
                footerLeft={pagamentosMetricFooter.left}
                footerRight={pagamentosMetricFooter.right}
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
                footerLeft={contratosMetricFooter.left}
                footerRight={contratosMetricFooter.right}
              />
            </div>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <div className="chart-card">
              <ValueChart data={charts.ticketMedioChartData} title={t('dashboard.averageTicket')} format="currency" />
            </div>
          </div>

          {dashboardData?.queueStats != null && (
            <div className="col-12 col-sm-6 col-md-4">
              <div className="chart-card">
                <h6 className="chart-title mb-3">{t('scheduler.title')}</h6>
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('scheduler.queueWaiting')}</span>
                    <strong>{dashboardData.queueStats.queueSize}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('scheduler.queueRunning')}</span>
                    <strong>{dashboardData.queueStats.queueRunning}</strong>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('scheduler.queueConcurrency')}</span>
                    <strong>{dashboardData.queueStats.queueConcurrency}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {serverStats && (
            <>
              <div className="col-12 col-sm-6 col-md-4">
                <div className="chart-card">
                  <h6 className="chart-title mb-3">Memória RAM</h6>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Uso</span>
                      <strong style={{ color: getUsageColor(serverStats.ram.usedPercent) }}>
                        {serverStats.ram.usedPercent}%
                      </strong>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${serverStats.ram.usedPercent}%`,
                          backgroundColor: getUsageColor(serverStats.ram.usedPercent),
                        }}
                      />
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Usada</span>
                      <strong>{formatBytes(serverStats.ram.used)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Livre</span>
                      <strong>{formatBytes(serverStats.ram.free)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Total</span>
                      <strong>{formatBytes(serverStats.ram.total)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <div className="chart-card">
                  <h6 className="chart-title mb-3">Disco (HD)</h6>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Uso</span>
                      <strong style={{ color: getUsageColor(serverStats.disk.usedPercent) }}>
                        {serverStats.disk.usedPercent}%
                      </strong>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${serverStats.disk.usedPercent}%`,
                          backgroundColor: getUsageColor(serverStats.disk.usedPercent),
                        }}
                      />
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Usado</span>
                      <strong>{formatBytes(serverStats.disk.used)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Livre</span>
                      <strong>{formatBytes(serverStats.disk.free)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Total</span>
                      <strong>{formatBytes(serverStats.disk.total)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-md-4">
                <div className="chart-card">
                  <h6 className="chart-title mb-3">Servidor</h6>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Uptime</span>
                      <strong>{formatUptime(serverStats.uptime)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">CPU (1 min)</span>
                      <strong>{serverStats.cpuLoad[0].toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">CPU (5 min)</span>
                      <strong>{serverStats.cpuLoad[1].toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">CPU (15 min)</span>
                      <strong>{serverStats.cpuLoad[2].toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="row g-2">
          <div className="col-12 col-md-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.recebidosPeriodoChartData}
                title={`${t('dashboard.received')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
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
                format="number"
                onPointClick={handleCrescimentoClientesPointClick}
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="chart-card" style={{ height: 'auto', minHeight: 0 }}>
              <BarChart data={charts.clientesPorPlano} title={t('dashboard.clientsByPlan')} format="number" onBarClick={handleClientesPorPlanoBarClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaasDashboard;
