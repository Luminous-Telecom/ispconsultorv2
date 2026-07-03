import React from 'react';
import IspConsultorLogo from 'components/common/IspConsultorLogo';
import { IconOnlyButton } from 'components/ui';
import type { TranslateFn } from 'components/layout/layout/types';

interface SaasSidebarHeaderProps {
  isMobile: boolean;
  t: TranslateFn;
  onCloseSidebar: () => void;
}

const SaasSidebarHeader: React.FC<SaasSidebarHeaderProps> = ({ isMobile, t, onCloseSidebar }) => (
  <div className="d-flex flex-column align-items-center justify-content-center p-3 pb-0 mb-0 position-relative w-100">
    <div className="sidebar-logo-wrapper w-100 d-flex flex-column align-items-center">
      <IspConsultorLogo width={200} height={65} />
      <div className="sidebar-title-wrapper overflow-hidden w-100 d-flex justify-content-center">
        <div className="sidebar-company-name text-truncate d-flex align-items-center justify-content-center gap-1">
          <i className="bi bi-shield-lock-fill text-warning"></i>
          <span className="text-warning fw-semibold">SuperAdmin</span>
        </div>
      </div>
    </div>
    {isMobile ? (
      <IconOnlyButton
        type="button"
        variant="ghost"
        size="sm"
        className="p-0 position-absolute top-0 end-0 m-2 sidebar-header-back-btn"
        onClick={onCloseSidebar}
        title={t('layout.closeMenu')}
        label={t('layout.closeMenu')}
        iconClassName="bi bi-arrow-left fs-4"
      />
    ) : null}
  </div>
);

export default SaasSidebarHeader;
