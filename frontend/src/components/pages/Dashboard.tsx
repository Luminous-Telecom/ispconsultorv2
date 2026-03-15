import React from 'react';
import { formatCurrency, formatNumber } from 'utils/formatters';
import { useDashboard } from 'hooks/useDashboard';
import { useDashboardFilters } from 'contexts/DashboardFiltersContext';
import { useDashboardStats } from 'hooks/useDashboardStats';
import { useDashboardCharts } from 'hooks/useDashboardCharts';
import { useChartHiddenItems } from 'hooks/useChartHiddenItems';
import { useDashboardChartClicks } from 'hooks/useDashboardChartClicks';
import { BarChart, ValueChart, ResponsiveLineChart, DualLineChart, ResponsivePieChart } from 'components/charts';
import { Spinner } from 'components/ui';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import DashboardSearchResult from '../dashboard/DashboardSearchResult';

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { searchValue, searchField } = useTableHeader();
  const { activeModal } = useModal();
  const { startDate, endDate } = useDashboardFilters();

  const {
    hiddenClientes,
    hiddenPagamentos,
    hiddenDistribuicao,
    hiddenTaxaPagamento,
    hiddenContratos,
    toggleCliente,
    togglePagamento,
    toggleDistribuicao,
    toggleTaxaPagamento,
    toggleContratos,
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
        <div className="row g-3">
          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12">
            <div className="chart-card chart-card-pie">
              <ResponsivePieChart
                data={charts.clientesChartData}
                title={t('dashboard.clientStatus')}
                hiddenItems={hiddenClientes}
                onToggleItem={toggleCliente}
                onSliceClick={handleClienteSliceClick}
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
              />
            </div>
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
              <ResponsivePieChart
                data={charts.taxaPagamentoChartData}
                title={t('dashboard.paymentRate')}
                hiddenItems={hiddenTaxaPagamento}
                onToggleItem={toggleTaxaPagamento}
                onSliceClick={handleStatusPagamentoSliceClick}
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
              />
            </div>
          </div>

          <div className="col-xl-4 col-lg-4 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ValueChart data={charts.ticketMedioChartData} title={t('dashboard.averageTicket')} format="currency" />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.recebidosPeriodoChartData}
                title={`${t('dashboard.received')}: ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
                format="currency"
                onPointClick={handleRecebidosPeriodoPointClick}
              />
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.receberPeriodoChartData}
                title={`${t('dashboard.toReceive')}: ${formatCurrency(charts.totalReceberPeriodo || 0)}`}
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