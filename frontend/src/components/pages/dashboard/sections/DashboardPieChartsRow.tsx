import React from 'react';
import {
  ResponsivePieChart,
  BackupStatusStackedBarChart,
  TicketMedioCard,
  type TicketMedioData,
} from 'components/charts';
import type { useDashboardCharts } from 'hooks/useDashboardCharts';
import type { TranslationKeys } from 'contexts/I18nContext';
import type { useDashboardBackupStatus } from '../hooks/useDashboardBackupStatus';
import type { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import type { useDashboardChartClicks } from 'hooks/useDashboardChartClicks';
import type { useChartHiddenItems } from 'hooks/useChartHiddenItems';

interface DashboardPieChartsRowProps {
  charts: ReturnType<typeof useDashboardCharts>;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  metrics: ReturnType<typeof useDashboardMetrics>;
  backupStatus: ReturnType<typeof useDashboardBackupStatus>;
  hiddenItems: Pick<
    ReturnType<typeof useChartHiddenItems>,
    | 'hiddenClientes'
    | 'hiddenPagamentos'
    | 'hiddenDistribuicao'
    | 'hiddenContratos'
    | 'hiddenBackupStatus'
  >;
  toggles: Pick<
    ReturnType<typeof useChartHiddenItems>,
    | 'toggleCliente'
    | 'togglePagamento'
    | 'toggleDistribuicao'
    | 'toggleContratos'
    | 'toggleBackupStatus'
  >;
  clicks: Pick<
    ReturnType<typeof useDashboardChartClicks>,
    | 'handleClienteSliceClick'
    | 'handleStatusPagamentoSliceClick'
    | 'handleDistribuicaoPlanoSliceClick'
    | 'handleContratoSliceClick'
  >;
  ticketMedioCardData: TicketMedioData;
}

const DashboardPieChartsRow: React.FC<DashboardPieChartsRowProps> = ({
  charts,
  t,
  metrics,
  backupStatus,
  hiddenItems,
  toggles,
  clicks,
  ticketMedioCardData,
}) => (
  <div className="row g-2 align-items-stretch">
    <div className="col-12 col-sm-6 col-md-4">
      <div className="chart-card chart-card-pie chart-card-pie--metric">
        <ResponsivePieChart
          data={charts.clientesChartData}
          title={t('dashboard.clientStatus')}
          hiddenItems={hiddenItems.hiddenClientes}
          onToggleItem={toggles.toggleCliente}
          onSliceClick={clicks.handleClienteSliceClick}
          centerHighlightFilterValue
          chartLeading
          metricLayout
          metricHeaderIcon="clients"
          metricHeaderInfo={t('dashboard.clientStatusInfo')}
          footerLeft={metrics.clientesMetricFooter.left}
          footerRight={metrics.clientesMetricFooter.right}
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
          hiddenItems={hiddenItems.hiddenDistribuicao}
          onToggleItem={toggles.toggleDistribuicao}
          onSliceClick={clicks.handleDistribuicaoPlanoSliceClick}
          centerHighlightFilterValue={metrics.distribuicaoPlanoMetric.centerFv}
          chartLeading
          metricLayout
          metricHeaderIcon="plans"
          metricHeaderInfo={t('dashboard.planDistributionInfo')}
          footerLeft={metrics.distribuicaoPlanoMetric.footerLeft}
          footerRight={metrics.distribuicaoPlanoMetric.footerRight}
        />
      </div>
    </div>

    <div className="col-12 col-sm-6 col-md-4">
      <div className="chart-card chart-card-pie chart-card-pie--metric">
        <BackupStatusStackedBarChart
          days={backupStatus.backupStatusGraficoUltimos7Dias}
          title={t('dashboard.backupStatusTitle')}
          legendLabels={backupStatus.backupStatusLegendLabels}
          emptyMessage={t('dashboard.backupStatusEmpty')}
          onSegmentClick={backupStatus.handleBackupStatusSegmentClick}
          hiddenKeys={hiddenItems.hiddenBackupStatus}
          onLegendToggle={(key) => toggles.toggleBackupStatus(key)}
          failureBadgeText={backupStatus.backupStatusDashboardSummary.failureBadgeText}
          periodHasBackupEvents={backupStatus.backupStatusPeriodoTemEventos}
          headerInfo={t('dashboard.backupStatusInfo')}
        />
      </div>
    </div>

    <div className="col-12 col-sm-6 col-md-4">
      <div className="chart-card chart-card-pie chart-card-pie--metric">
        <ResponsivePieChart
          data={charts.contratosChartData}
          title={t('dashboard.contractStatus')}
          hiddenItems={hiddenItems.hiddenContratos}
          onToggleItem={toggles.toggleContratos}
          onSliceClick={clicks.handleContratoSliceClick}
          centerHighlightFilterValue="ativo"
          chartLeading
          metricLayout
          metricHeaderIcon="contracts"
          metricHeaderInfo={t('dashboard.contractStatusInfo')}
          footerLeft={metrics.contratosMetricFooter.left}
          footerRight={metrics.contratosMetricFooter.right}
        />
      </div>
    </div>

    <div className="col-12 col-sm-6 col-md-4">
      <div className="chart-card chart-card-pie chart-card-pie--metric">
        <ResponsivePieChart
          data={charts.statusPagamentoData}
          title={t('dashboard.paymentStatus')}
          hiddenItems={hiddenItems.hiddenPagamentos}
          onToggleItem={toggles.togglePagamento}
          onSliceClick={clicks.handleStatusPagamentoSliceClick}
          centerHighlightFilterValue="pendente"
          chartLeading
          metricLayout
          metricHeaderIcon="payments"
          metricHeaderInfo={t('dashboard.paymentStatusInfo')}
          footerLeft={metrics.pagamentosMetricFooter.left}
          footerRight={metrics.pagamentosMetricFooter.right}
        />
      </div>
    </div>
  </div>
);

export default DashboardPieChartsRow;
