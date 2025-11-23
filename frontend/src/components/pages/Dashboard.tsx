import React from 'react';
import { formatCurrency, formatDateLong, formatNumber } from '@/utils/formatters';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';
import { useChartHiddenItems } from '@/hooks/useChartHiddenItems';
import { BarChart, ValueChart, ResponsiveLineChart, ResponsivePieChart } from '@/components/charts';

const Dashboard: React.FC = () => {
  const {
    startDate,
    endDate,
    periodoInicioLabel,
    periodoFimLabel,
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
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="container-fluid px-0">
        <div className="dashboard-hero card border-0 shadow-sm mb-4">
          <div className="dashboard-hero-body">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              <div>
                <span className="dashboard-badge text-uppercase">Visão geral</span>
                <h2 className="dashboard-hero-title mb-2">Painel financeiro e operacional</h2>
                <p className="dashboard-hero-subtitle mb-0">
                  Atualizado em {lastUpdatedDate} às {lastUpdatedTime}
                </p>
              </div>
              <div className="d-flex flex-wrap gap-3">
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Faturamento total</span>
                  <strong className="dashboard-hero-value">{formatCurrency(stats.receitaPagaPeriodo)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Receita prevista</span>
                  <strong className="dashboard-hero-value">{formatCurrency(stats.receitaPrevistaPeriodo)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Receita pendente</span>
                  <strong className="dashboard-hero-value">{formatCurrency(stats.receitaPendentePeriodo)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Clientes ativos</span>
                  <strong className="dashboard-hero-value">{formatNumber(stats.clientesAtivosPeriodo)}</strong>
                  <small className="dashboard-hero-label d-block">Clientes no período: {formatNumber(stats.clientesComTitulosPeriodo)}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.clientesChartData}
                title="Status dos Clientes"
                hiddenItems={hiddenClientes}
                onToggleItem={toggleCliente}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.planosChartData}
                title="Status dos Planos"
                hiddenItems={hiddenPlanos}
                onToggleItem={togglePlano}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.statusPagamentoData}
                title="Status dos Pagamentos"
                hiddenItems={hiddenPagamentos}
                onToggleItem={togglePagamento}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.distribuicaoPlanos}
                title="Distribuição por Tipo de Plano"
                hiddenItems={hiddenDistribuicao}
                onToggleItem={toggleDistribuicao}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.taxaPagamentoChartData}
                title="Taxa de Pagamento"
                hiddenItems={hiddenTaxaPagamento}
                onToggleItem={toggleTaxaPagamento}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={charts.contratosChartData}
                title="Status dos Contratos"
                hiddenItems={hiddenContratos}
                onToggleItem={toggleContratos}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ValueChart data={charts.ticketMedioChartData} title="Ticket Médio R$" format="currency" />
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
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

        <div className="row g-3 mb-4">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.recebidosPeriodoChartData}
                title={`Recebidos no período (${periodoInicioLabel} - ${periodoFimLabel}) · Total ${formatCurrency(charts.totalRecebidosPeriodo)}`}
                format="currency"
              />
            </div>
          </div>
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              <ResponsiveLineChart
                data={charts.receberPeriodoChartData}
                title={`A Receber no período (${periodoInicioLabel} - ${periodoFimLabel}) · Total ${formatCurrency(charts.totalReceberPeriodo)}`}
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