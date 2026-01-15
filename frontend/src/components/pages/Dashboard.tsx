import React from 'react';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';
import { useChartHiddenItems } from '@/hooks/useChartHiddenItems';
import { BarChart, ValueChart, ResponsiveLineChart, DualLineChart, ResponsivePieChart } from '@/components/charts';
import { Spinner } from '@/components/ui';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import { useModal } from '@/contexts/ModalContext';
import { useI18n } from '@/contexts/I18nContext';
import DashboardSearchResult from '../dashboard/DashboardSearchResult';

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { searchValue, searchField } = useTableHeader();
  const { activeModal } = useModal();
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
  } = useDashboardFilters();

  // Gerenciar itens ocultos dos gráficos usando hook customizado
  const {
    hiddenClientes,
    hiddenPlanos,
    hiddenPagamentos,
    hiddenDistribuicao,
    hiddenTaxaPagamento,
    hiddenContratos,
    toggleCliente,
    togglePlano,
    togglePagamento,
    toggleDistribuicao,
    toggleTaxaPagamento,
    toggleContratos,
  } = useChartHiddenItems();

  // Query única para buscar todos os dados do dashboard
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboard({
    startDate,
    endDate,
  });

  // Calcular estatísticas usando hook customizado
  const stats = useDashboardStats(dashboardData);

  // Preparar dados dos gráficos usando hook customizado
  const charts = useDashboardCharts(dashboardData, stats, t);

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
  if (searchValue && !activeModal) {
    return (
      <div className="dashboard-container">
        <div className="container-fluid px-0 px-md-0">
          <DashboardSearchResult searchTerm={searchValue} searchField={searchField} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container-fluid px-0 px-md-0">
        {/* Header Minimalista com Gráficos Filtrados */}
        <div className="dashboard-header-clean">
          <div className="d-flex justify-content-between align-items-start">
            <div className="dashboard-title-section">
              <h1 className="dashboard-title-minimal">{t('dashboard.title')}</h1>

              {/* Filtros de Data */}
              <div className="dashboard-filters-minimal mt-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center gap-1">
                    <label htmlFor="dashboard-start-date" className="form-label small fw-bold text-secondary mb-0">{t('dashboard.startDate')}:</label>
                    <input
                      id="dashboard-start-date"
                      name="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="form-control form-control-sm"
                      style={{ width: '110px' }}
                    />
                  </div>
                  <span className="text-muted small">—</span>
                  <div className="d-flex align-items-center gap-1">
                    <label htmlFor="dashboard-end-date" className="form-label small fw-bold text-secondary mb-0">{t('dashboard.endDate')}:</label>
                    <input
                      id="dashboard-end-date"
                      name="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="form-control form-control-sm"
                      style={{ width: '110px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas Compactas */}
          <div className="dashboard-metrics-compact mt-2">
            <div className="row g-2">
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">{t('dashboard.revenue')}</div>
                  <div className="metric-compact-value">{formatCurrency(stats.receitaPagaPeriodo)}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">{t('dashboard.expected')}</div>
                  <div className="metric-compact-value text-info">{formatCurrency(stats.receitaPrevistaPeriodo)}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">{t('dashboard.pending')}</div>
                  <div className="metric-compact-value text-warning">{formatCurrency(stats.receitaPendentePeriodo)}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">{t('dashboard.clients')}</div>
                  <div className="metric-compact-value text-success">{formatNumber(stats.clientesAtivosPeriodo)}</div>
                  <div className="metric-compact-subtext">{formatNumber(stats.clientesComTitulosPeriodo)} {t('dashboard.inPeriod')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos Filtrados por Data */}
          <div className="dashboard-filtered-charts mt-2">
            <div className="row g-2">
              <div className="col-lg-6">
                <div className="chart-compact-container chart-compact-container-recebidos">
                  <ResponsiveLineChart
                    data={charts.recebidosPeriodoChartData}
                    title={`${t('dashboard.received')}: ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
                    format="currency"
                  />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="chart-compact-container chart-compact-container-receber">
                  <ResponsiveLineChart
                    data={charts.receberPeriodoChartData}
                    title={`${t('dashboard.toReceive')}: ${formatCurrency(charts.totalReceberPeriodo || 0)}`}
                    format="currency"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.clientesChartData}
                title={t('dashboard.clientStatus')}
                hiddenItems={hiddenClientes}
                onToggleItem={toggleCliente}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.planosChartData}
                title={t('dashboard.planStatus')}
                hiddenItems={hiddenPlanos}
                onToggleItem={togglePlano}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.statusPagamentoData}
                title={t('dashboard.paymentStatus')}
                hiddenItems={hiddenPagamentos}
                onToggleItem={togglePagamento}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.distribuicaoPlanos}
                title={t('dashboard.planDistribution')}
                hiddenItems={hiddenDistribuicao}
                onToggleItem={toggleDistribuicao}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.taxaPagamentoChartData}
                title={t('dashboard.paymentRate')}
                hiddenItems={hiddenTaxaPagamento}
                onToggleItem={toggleTaxaPagamento}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.contratosChartData}
                title={t('dashboard.contractStatus')}
                hiddenItems={hiddenContratos}
                onToggleItem={toggleContratos}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ValueChart data={charts.ticketMedioChartData} title={t('dashboard.averageTicket')} format="currency" />
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
              />
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.crescimentoClientes}
                title={`${t('dashboard.newClients')}: ${formatNumber(charts.totalNovosClientes || 0)} (${t('dashboard.months12')})`}
                format="number"
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
              />
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card">
              <BarChart data={charts.clientesPorPlano} title={t('dashboard.clientsByPlan')} format="number" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;