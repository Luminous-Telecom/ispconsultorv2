import React from 'react';
import { formatCurrency, formatNumber } from 'utils/formatters';
import {
  BarChart,
  ResponsiveLineChart,
  DualLineChart,
} from 'components/charts';
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
    | 'handleDualLineChartPointClick'
  >;
}

const DashboardLineChartsRow: React.FC<DashboardLineChartsRowProps> = ({
  charts,
  t,
  clicks,
}) => (
  <div className="row g-2 align-items-stretch">
    <div className="col-12 col-md-6">
      <div className="chart-card chart-card-line">
        <ResponsiveLineChart
          data={charts.recebidosPeriodoChartData}
          title={`${t('dashboard.received')} (${t('dashboard.chartCurrentMonth')}): ${formatCurrency(charts.totalRecebidosPeriodo || 0)}`}
          titleInfo={t('dashboard.chartReceivedInfo')}
          format="currency"
          onPointClick={clicks.handleRecebidosPeriodoPointClick}
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
          onPointClick={clicks.handleReceberPeriodoPointClick}
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
          onPointClick={clicks.handleReceitaMensalPointClick}
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
          onPointClick={clicks.handleCrescimentoClientesPointClick}
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
          onPointClick={clicks.handleDualLineChartPointClick}
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
          onBarClick={clicks.handleClientesPorPlanoBarClick}
        />
      </div>
    </div>
  </div>
);

export default DashboardLineChartsRow;
