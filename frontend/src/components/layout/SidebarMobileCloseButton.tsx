import React from 'react';
import { Button } from 'components/ui/Button';
import { useI18n } from 'contexts/I18nContext';

interface SidebarMobileCloseButtonProps {
  onClose: () => void;
}

const SidebarMobileCloseButton: React.FC<SidebarMobileCloseButtonProps> = ({ onClose }) => {
  const { t } = useI18n();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="p-0 position-absolute top-0 end-0 m-2 sidebar-header-back-btn"
      onClick={onClose}
      title={t('layout.closeMenu')}
      aria-label={t('layout.closeMenu')}
    >
      <i className="bi bi-arrow-left fs-4" aria-hidden />
    </Button>
  );
};

export default SidebarMobileCloseButton;
