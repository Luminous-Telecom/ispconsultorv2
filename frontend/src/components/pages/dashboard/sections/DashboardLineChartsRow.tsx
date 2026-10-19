import React from 'react';
import { formatCurrency, formatNumber } from 'utils/formatters';
import { CHART_FINANCE_COLORS } from 'components/charts/chartColors';
import { LineChartCard, ClientsByPlanCard } from 'components/dashboard/cards';
import type { useDashboardCharts } from 'hooks/useDashboardCharts';
import type { TranslationKeys } from 'contexts/I18nContext';
import type { useDashboardChartClicks } from 'hooks/useDashboardChartClicks';

interface DashboardLineChartsRowProps {
  charts: ReturnType<typeof useDashboardCharts>;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  clicks: Pick<
    ReturnType<typeof useDashboardChartClicks>,
    | 'handleClientesPorPlanoBarClick'
    | 'handleRecebidosPeriodoPointClick'
    | 'handleReceberPeriodoPointClick'
    | 'handleReceitaMensalPointClick'
    | 'handleCrescimentoClientesPointClick'
    | 'handleContasPagarPointClick'
  >;
  showFinanceiro: boolean;
  showOperacional: boolean;
}

const DashboardLineChartsRow: React.FC<DashboardLineChartsRowProps> = ({
  charts,
  t,
  clicks,
  showFinanceiro,
  showOperacional,
}) => {
  if (!showFinanceiro && !showOperacional) return null;

  return (
  <div className="row align-items-stretch">
    {showFinanceiro && (
    <div className="col-12 col-md-6">
      <LineChartCard
        data={charts.recebidosPeriodoChartData}
        title={`${t('dashboard.received')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
        format="currency"
        lineColor={CHART_FINANCE_COLORS.received}
        onPointClick={clicks.handleRecebidosPeriodoPointClick}
      />
    </div>
    )}

    {showFinanceiro && (
    <div className="col-12 col-md-6">
      <LineChartCard
        data={charts.receberPeriodoChartData}
        title={`${t('dashboard.toReceive')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalReceberPeriodo || 0)}`}
        format="currency"
        lineColor={CHART_FINANCE_COLORS.toReceive}
        onPointClick={clicks.handleReceberPeriodoPointClick}
      />
    </div>
    )}

    {showFinanceiro && (
    <div className="col-12 col-md-6">
      <LineChartCard
        data={charts.receitaMensalChartData}
        title={`${t('dashboard.monthlyRevenueTitle')}: ${formatCurrency(charts.totalReceitaMensal || 0)} (${t('dashboard.months12')})`}
        format="currency"
        onPointClick={clicks.handleReceitaMensalPointClick}
      />
    </div>
    )}

    {showOperacional && (
    <div className="col-12 col-md-6">
      <LineChartCard
        data={charts.crescimentoClientes}
        title={`${t('dashboard.newClients')}: ${formatNumber(charts.totalNovosClientes || 0)} (${t('dashboard.months12')})`}
        format="number"
        onPointClick={clicks.handleCrescimentoClientesPointClick}
      />
    </div>
    )}

    {showFinanceiro && (
    <div className="col-12 col-md-6">
      <LineChartCard
        data={charts.contasPagarChartData}
        title={`${t('financial.toPay')} (${t('dashboard.months12')})`}
        format="currency"
        lineColor={CHART_FINANCE_COLORS.toPay}
        onPointClick={clicks.handleContasPagarPointClick}
      />
    </div>
    )}

    {showOperacional && (
    <div className="col-12 col-md-6">
      <ClientsByPlanCard
        data={charts.clientesPorPlano}
        title={t('dashboard.clientsByPlan')}
        onBarClick={clicks.handleClientesPorPlanoBarClick}
      />
    </div>
    )}
  </div>
  );
};

export default DashboardLineChartsRow;
