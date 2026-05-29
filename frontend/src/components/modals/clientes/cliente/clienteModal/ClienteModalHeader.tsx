import React from 'react';
import { ModalTabItem } from 'components/common/ModalTabsOverflow';
import ModalTabsOverflow from 'components/common/ModalTabsOverflow';
import { ModalFormActions } from 'components/ui';

interface ClienteModalHeaderProps {
  isMobile: boolean;
  activeTab: string;
  isSubmitting: boolean;
  clienteTabs: ModalTabItem[];
  onClose: () => void;
  onSave: () => void;
  onTabChange: (tab: string) => void;
}

function ClienteModalHeader({
  isMobile,
  activeTab,
  isSubmitting,
  clienteTabs,
  onClose,
  onSave,
  onTabChange,
}: ClienteModalHeaderProps) {
  return (
    <div className="cliente-header-unified">
      <ModalFormActions
        className="cliente-header-buttons modal-header-actions"
        onCancel={onClose}
        isPending={isSubmitting}
        saveType="button"
        onSave={onSave}
      />

      <div className="cliente-header-tabs">
        <ModalTabsOverflow
          tabs={clienteTabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          tabsClassName={`cliente-tabs-unified ${isMobile ? 'cliente-tabs-mobile' : ''}`}
          disabledClassName="cliente-tab-disabled"
          isMobile={isMobile}
          id="clienteTabs"
        />
      </div>
    </div>
  );
}

export default ClienteModalHeader;
