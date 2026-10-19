import React from 'react';
import type { useDashboardCharts } from 'hooks/useDashboardCharts';
import type { TranslationKeys } from 'contexts/I18nContext';
import type { useDashboardBackupStatus } from './hooks/useDashboardBackupStatus';
import type { useDashboardMetrics } from './hooks/useDashboardMetrics';
import type { useDashboardChartClicks } from 'hooks/useDashboardChartClicks';
import type { useChartHiddenItems } from 'hooks/useChartHiddenItems';
import DashboardPieChartsRow from './sections/DashboardPieChartsRow';
import DashboardLineChartsRow from './sections/DashboardLineChartsRow';

interface DashboardContentProps {
  charts: ReturnType<typeof useDashboardCharts>;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  metrics: ReturnType<typeof useDashboardMetrics>;
  backupStatus: ReturnType<typeof useDashboardBackupStatus>;
  hiddenItems: ReturnType<typeof useChartHiddenItems>;
  chartClicks: ReturnType<typeof useDashboardChartClicks>;
  showFinanceiro: boolean;
  showOperacional: boolean;
  showCadastros: boolean;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  charts,
  t,
  metrics,
  backupStatus,
  hiddenItems,
  chartClicks,
  showFinanceiro,
  showOperacional,
  showCadastros,
}) => (
  <div className="container-fluid px-0">
    <DashboardPieChartsRow
      charts={charts}
      t={t}
      metrics={metrics}
      backupStatus={backupStatus}
      hiddenItems={hiddenItems}
      toggles={hiddenItems}
      clicks={chartClicks}
      ticketMedioCardData={metrics.ticketMedioCardData}
      showFinanceiro={showFinanceiro}
      showOperacional={showOperacional}
      showCadastros={showCadastros}
    />
    <DashboardLineChartsRow
      charts={charts}
      t={t}
      clicks={chartClicks}
      showFinanceiro={showFinanceiro}
      showOperacional={showOperacional}
    />
  </div>
);

export default DashboardContent;
