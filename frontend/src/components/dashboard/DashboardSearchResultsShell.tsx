import React from 'react';
import { Loading } from 'components/ui';

interface DashboardSearchResultsShellProps {
  isLoading: boolean;
  hasItems: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}

/** Layout comum dos resultados de busca no dashboard (ERP e SaaS). */
const DashboardSearchResultsShell: React.FC<DashboardSearchResultsShellProps> = ({
  isLoading,
  hasItems,
  emptyMessage,
  children,
}) => (
  <div className="dashboard-search-results">
    {isLoading && !hasItems ? (
      <Loading variant="centered" showMessage={false} className="dashboard-search-loading py-5" />
    ) : !hasItems ? (
      <div className="dashboard-search-empty">
        <i className="bi bi-search dashboard-search-empty-icon" aria-hidden />
        <p className="dashboard-search-empty-text mb-0">{emptyMessage}</p>
      </div>
    ) : (
      <div className="dashboard-search-card-list">{children}</div>
    )}
  </div>
);

export default DashboardSearchResultsShell;
