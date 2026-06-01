import React, { useMemo } from 'react';
import { ModalFormActions } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { SshDeviceTab } from './types';

interface SshDeviceModalHeaderProps {
  activeTab: SshDeviceTab;
  isMobile: boolean;
  isSubmitting: boolean;
  formId: string;
  canOpenBackupsTab: boolean;
  basicDataLabel: string;
  backupsLabel: string;
  onClose: () => void;
  onTabChange: (tab: SshDeviceTab) => void;
}

const SshDeviceModalHeader: React.FC<SshDeviceModalHeaderProps> = ({
  activeTab,
  isMobile,
  isSubmitting,
  formId,
  canOpenBackupsTab,
  basicDataLabel,
  backupsLabel,
  onClose,
  onTabChange,
}) => {
  const tabs = useMemo(
    (): ModalTabItem<SshDeviceTab>[] => [
      { id: 'dados', label: basicDataLabel },
      { id: 'backups', label: backupsLabel, disabled: !canOpenBackupsTab },
    ],
    [basicDataLabel, backupsLabel, canOpenBackupsTab]
  );

  const handleTabChange = (tab: SshDeviceTab) => {
    if (tab === 'backups' && !canOpenBackupsTab) return;
    onTabChange(tab);
  };

  return (
    <div className="ssh-device-header-unified">
      <ModalFormActions
        className="ssh-device-header-buttons modal-header-actions"
        onCancel={onClose}
        formId={formId}
        isPending={isSubmitting}
      />
      <div className="ssh-device-header-tabs">
        <ModalTabsOverflow
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabsClassName={`plano-tabs-unified ${isMobile ? 'plano-tabs-mobile' : ''}`}
          isMobile={isMobile}
          id="sshDeviceTab"
        />
      </div>
    </div>
  );
};

export default SshDeviceModalHeader;
