import React from 'react';
import { formatCurrency, formatDateLong, formatNumber } from '@/utils/formatters';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';
import { useChartHiddenItems } from '@/hooks/useChartHiddenItems';
import { BarChart, ValueChart, ResponsiveLineChart, ResponsivePieChart } from '@/components/charts';
import { Spinner } from '@/components/ui';
import { useTableHeader } from '@/contexts/TableHeaderContext';
import DashboardSearchResult from '../dashboard/DashboardSearchResult';

const Dashboard: React.FC = () => {
  const { searchValue, searchField } = useTableHeader();
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
  const charts = useDashboardCharts(dashboardData, stats);

  // Formatar data e hora de atualização
  const agora = new Date();
  const lastUpdatedDate = formatDateLong(agora);
  const lastUpdatedTime = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });



  if (loadingDashboard) {
    return (
      <div className="dashboard-container">
        <div className="text-center">
          <Spinner size="md" variant="primary" aria-label="Carregando..." />
        </div>
      </div>
    );
  }

  // Se houver busca no header, mostrar resultados da busca em vez do dashboard
  if (searchValue) {
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
              <h1 className="dashboard-title-minimal">Visão Geral</h1>
              <div className="dashboard-subtitle-minimal">
                Atualizado em {lastUpdatedDate} às {lastUpdatedTime}
              </div>

              {/* Filtros de Data */}
              <div className="dashboard-filters-minimal mt-2">
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ width: '110px' }}
                  />
                  <span className="text-muted small">—</span>
                  <input
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

          {/* Métricas Compactas */}
          <div className="dashboard-metrics-compact mt-2">
            <div className="row g-2">
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">Faturamento</div>
                  <div className="metric-compact-value">{formatCurrency(stats.receitaPagaPeriodo)}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">Previsto</div>
                  <div className="metric-compact-value text-info">{formatCurrency(stats.receitaPrevistaPeriodo)}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">Pendente</div>
                  <div className="metric-compact-value text-warning">{formatCurrency(stats.receitaPendentePeriodo)}</div>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="metric-compact">
                  <div className="metric-compact-label">Clientes</div>
                  <div className="metric-compact-value text-success">{formatNumber(stats.clientesAtivosPeriodo)}</div>
                  <div className="metric-compact-subtext">{formatNumber(stats.clientesComTitulosPeriodo)} no período</div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos Filtrados por Data */}
          <div className="dashboard-filtered-charts mt-2">
            <div className="row g-2">
              <div className="col-lg-6">
                <div className="chart-compact-container">
                  <ResponsiveLineChart
                    data={charts.recebidosPeriodoChartData}
                    title="Recebidos"
                    format="currency"
                  />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="chart-compact-container">
                  <ResponsiveLineChart
                    data={charts.receberPeriodoChartData}
                    title="A Receber"
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
                title="Status dos Clientes"
                hiddenItems={hiddenClientes}
                onToggleItem={toggleCliente}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.planosChartData}
                title="Status dos Planos"
                hiddenItems={hiddenPlanos}
                onToggleItem={togglePlano}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.statusPagamentoData}
                title="Status dos Pagamentos"
                hiddenItems={hiddenPagamentos}
                onToggleItem={togglePagamento}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.distribuicaoPlanos}
                title="Distribuição por Tipo de Plano"
                hiddenItems={hiddenDistribuicao}
                onToggleItem={toggleDistribuicao}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.taxaPagamentoChartData}
                title="Taxa de Pagamento"
                hiddenItems={hiddenTaxaPagamento}
                onToggleItem={toggleTaxaPagamento}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.contratosChartData}
                title="Status dos Contratos"
                hiddenItems={hiddenContratos}
                onToggleItem={toggleContratos}
              />
            </div>
          </div>

          <div className="col-xl-5-custom col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ValueChart data={charts.ticketMedioChartData} title="Ticket Médio R$" format="currency" />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart 
                data={charts.receitaMensalChartData} 
                title="Faturamento Mensal R$ (12 meses)" 
                format="currency" 
              />
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart 
                data={charts.crescimentoClientes} 
                title="Novos Clientes (12 meses)" 
                format="number" 
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-12 col-lg-12">
            <div className="chart-card">
              <ResponsiveLineChart
                data={charts.contasReceberPagarChartData}
                title="Contas a Receber vs Contas a Pagar (12 meses)"
                format="currency"
              />
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-12 col-lg-12">
            <div className="chart-card">
              <BarChart data={charts.clientesPorPlano} title="Clientes por Plano" format="number" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;