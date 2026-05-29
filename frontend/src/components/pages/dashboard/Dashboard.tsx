import React from 'react';
import { useDebouncedValue } from 'hooks/useDebouncedValue';
import { useDashboard } from 'hooks/useDashboard';
import { useDashboardFilters } from 'contexts/DashboardFiltersContext';
import { useDashboardStats } from 'hooks/useDashboardStats';
import { useDashboardCharts } from 'hooks/useDashboardCharts';
import { useChartHiddenItems } from 'hooks/useChartHiddenItems';
import { useDashboardChartClicks } from 'hooks/useDashboardChartClicks';
import { Spinner } from 'components/ui';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import DashboardSearchResult from '../../dashboard/DashboardSearchResult';
import { DASHBOARD_SEARCH_DEBOUNCE_MS } from './constants';
import { useDashboardBackupStatus } from './hooks/useDashboardBackupStatus';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import DashboardContent from './DashboardContent';

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { searchValue, searchField } = useTableHeader();
  const debouncedSearch = useDebouncedValue(searchValue.trim(), DASHBOARD_SEARCH_DEBOUNCE_MS);
  const { activeModal, openModal } = useModal();
  const { startDate, endDate } = useDashboardFilters();

  const hiddenItems = useChartHiddenItems();
  const chartClicks = useDashboardChartClicks();

  const { data: dashboardData, isLoading: loadingDashboard } = useDashboard({
    startDate,
    endDate,
  });

  const stats = useDashboardStats(dashboardData);
  const charts = useDashboardCharts(dashboardData, stats, t);

  const backupStatus = useDashboardBackupStatus({ dashboardData, t, openModal });

  const metrics = useDashboardMetrics({
    stats,
    charts,
    dashboardData,
    startDate,
    t,
  });

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
          <DashboardSearchResult searchTerm={debouncedSearch} searchField={searchField} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <DashboardContent
        charts={charts}
        t={t}
        metrics={metrics}
        backupStatus={backupStatus}
        hiddenItems={hiddenItems}
        chartClicks={chartClicks}
      />
    </div>
  );
};

export default Dashboard;
