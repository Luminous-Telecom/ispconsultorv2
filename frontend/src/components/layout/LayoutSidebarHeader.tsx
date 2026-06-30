import React from 'react';
import BackNetLogo from '../common/BackNetLogo';
import Button from '../ui/Button';
import { useI18n } from 'contexts/I18nContext';

interface LayoutSidebarHeaderProps {
  companyName: string;
  isMobile: boolean;
  onCloseSidebar: () => void;
}

const LayoutSidebarHeader: React.FC<LayoutSidebarHeaderProps> = ({
  companyName,
  isMobile,
  onCloseSidebar,
}) => {
  const { t } = useI18n();

  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-3 pb-0 mb-0 position-relative w-100">
      <div className="sidebar-logo-wrapper w-100 d-flex flex-column align-items-center">
        <BackNetLogo width={200} height={65} />
        {companyName && (
          <div className="sidebar-title-wrapper overflow-hidden w-100 d-flex justify-content-center">
            <div className="sidebar-company-name text-truncate d-flex align-items-center justify-content-center gap-1">
              <i className="bi bi-building" />
              <span>{companyName}</span>
            </div>
          </div>
        )}
      </div>
      {isMobile && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="p-0 position-absolute top-0 end-0 m-2 sidebar-header-back-btn"
          onClick={onCloseSidebar}
          title={t('layout.closeMenu')}
          aria-label={t('layout.closeMenu')}
        >
          <i className="bi bi-arrow-left fs-4" aria-hidden />
        </Button>
      )}
    </div>
  );
};

export default LayoutSidebarHeader;
