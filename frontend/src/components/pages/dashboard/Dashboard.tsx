import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from 'hooks/useDebouncedValue';
import { useDashboard } from 'hooks/useDashboard';
import { useDashboardFilters } from 'contexts/DashboardFiltersContext';
import { useDashboardStats } from 'hooks/useDashboardStats';
import { useDashboardCharts } from 'hooks/useDashboardCharts';
import { useChartHiddenItems } from 'hooks/useChartHiddenItems';
import { useDashboardChartClicks } from 'hooks/useDashboardChartClicks';
import Loading from 'components/common/Loading';
import { useTableHeader } from 'contexts/TableHeaderContext';
import { useModal } from 'contexts/ModalContext';
import { useI18n } from 'contexts/I18nContext';
import DashboardSearchResult from '../../dashboard/DashboardSearchResult';
import {
  DASHBOARD_SEARCH_HEADER_FIELDS,
  DASHBOARD_SEARCH_PLACEHOLDER,
} from '../../dashboard/dashboardSearchConfig';
import { DASHBOARD_SEARCH_DEBOUNCE_MS } from './constants';
import { useDashboardBackupStatus } from './hooks/useDashboardBackupStatus';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import DashboardContent from './DashboardContent';
import { authService } from 'services/authService';
import { canSeeDashboardSection } from 'constants/userRoles';

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['auth-me-profile'],
    queryFn: async () => {
      const res = await authService.getCurrentUser();
      if (!res.success || !res.data) return null;
      return res.data;
    },
    staleTime: 0,
  });
  const showFinanceiro = canSeeDashboardSection(currentUser?.role, 'financeiro');
  const showOperacional = canSeeDashboardSection(currentUser?.role, 'operacional');
  const showCadastros = canSeeDashboardSection(currentUser?.role, 'cadastros');
  const showClientSearch = showOperacional || showCadastros;
  const { searchValue, searchField, setAvailableSearchFields, setSearchPlaceholder } = useTableHeader();
  const debouncedSearch = useDebouncedValue(searchValue.trim(), DASHBOARD_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!currentUser) return;
    if (!showClientSearch) {
      setAvailableSearchFields([]);
      setSearchPlaceholder('');
      return;
    }
    setAvailableSearchFields(
      DASHBOARD_SEARCH_HEADER_FIELDS.map((f) => ({ id: f.key ?? '', label: f.label }))
    );
    setSearchPlaceholder(DASHBOARD_SEARCH_PLACEHOLDER);
  }, [currentUser, setAvailableSearchFields, setSearchPlaceholder, showClientSearch]);
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
    t,
  });

  if (loadingDashboard || (loadingUser && !currentUser)) {
    return (
      <div className="dashboard-container dashboard-container--loading">
        <Loading message={t('ui.loadingDashboard')} variant="page" />
      </div>
    );
  }

  if (showClientSearch && debouncedSearch && !activeModal) {
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
        showFinanceiro={showFinanceiro}
        showOperacional={showOperacional}
        showCadastros={showCadastros}
      />
    </div>
  );
};

export default Dashboard;
