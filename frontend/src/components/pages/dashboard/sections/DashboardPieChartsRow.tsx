import React from 'react';
import type { TicketMedioData } from 'components/charts';
import {
  PieStatusCard,
  AverageTicketCard,
  BackupStatusCard,
} from 'components/dashboard/cards';
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
  showFinanceiro: boolean;
  showOperacional: boolean;
  showCadastros: boolean;
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
  showFinanceiro,
  showOperacional,
  showCadastros,
}) => {
  const showClientesContratos = showOperacional || showCadastros;
  if (!showFinanceiro && !showClientesContratos && !showOperacional) return null;

  return (
  <div className="row align-items-stretch dashboard-pie-charts-row">
    {showClientesContratos && (
    <div className="col-auto dashboard-col--compact">
      <PieStatusCard
        data={charts.clientesChartData}
        title={t('dashboard.clientStatus')}
        hiddenItems={hiddenItems.hiddenClientes}
        onToggleItem={toggles.toggleCliente}
        onSliceClick={clicks.handleClienteSliceClick}
        centerHighlightFilterValue
      />
    </div>
    )}

    {showClientesContratos && (
    <div className="col-auto dashboard-col--compact">
      <PieStatusCard
        data={charts.contratosChartData}
        title={t('dashboard.contractStatus')}
        hiddenItems={hiddenItems.hiddenContratos}
        onToggleItem={toggles.toggleContratos}
        onSliceClick={clicks.handleContratoSliceClick}
        centerHighlightFilterValue="ativo"
      />
    </div>
    )}

    {showFinanceiro && (
    <div className="col-auto dashboard-col--compact">
      <PieStatusCard
        data={charts.statusPagamentoData}
        title={t('dashboard.paymentStatus')}
        hiddenItems={hiddenItems.hiddenPagamentos}
        onToggleItem={toggles.togglePagamento}
        onSliceClick={clicks.handleStatusPagamentoSliceClick}
        centerHighlightFilterValue="pago,pago_atraso,parcial"
      />
    </div>
    )}

    {showOperacional && (
    <div className="col-auto dashboard-col--compact">
      <PieStatusCard
        data={charts.distribuicaoPlanos}
        title={t('dashboard.planDistribution')}
        hiddenItems={hiddenItems.hiddenDistribuicao}
        onToggleItem={toggles.toggleDistribuicao}
        onSliceClick={clicks.handleDistribuicaoPlanoSliceClick}
        centerHighlightFilterValue={metrics.distribuicaoPlanoMetric.centerFv}
      />
    </div>
    )}

    {showFinanceiro && (
    <div className="col-auto dashboard-col--compact">
      <AverageTicketCard data={ticketMedioCardData} />
    </div>
    )}

    {showOperacional && (
    <div className="col-auto dashboard-col--compact">
      <BackupStatusCard
        days={backupStatus.backupStatusGraficoUltimos7Dias}
        title={t('dashboard.backupStatusTitle')}
        legendLabels={backupStatus.backupStatusLegendLabels}
        emptyMessage={t('dashboard.backupStatusEmpty')}
        onSegmentClick={backupStatus.handleBackupStatusSegmentClick}
        hiddenKeys={hiddenItems.hiddenBackupStatus}
        onLegendToggle={(key) => toggles.toggleBackupStatus(key)}
        periodHasBackupEvents={backupStatus.backupStatusPeriodoTemEventos}
      />
    </div>
    )}
  </div>
  );
};

export default DashboardPieChartsRow;
