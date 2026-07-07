import React, { useMemo } from 'react';
import { AppButton, ModalFormActions } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { SshDeviceTab } from './types';

interface SshDeviceModalHeaderProps {
  activeTab: SshDeviceTab;
  isMobile: boolean;
  isSubmitting: boolean;
  formId: string;
  canOpenBackupsTab: boolean;
  canOpenTerminal: boolean;
  canTestConnection: boolean;
  canManualBackup: boolean;
  isTestPending: boolean;
  isManualBackupPending: boolean;
  terminalLabel: string;
  testLabel: string;
  manualBackupLabel: string;
  basicDataLabel: string;
  backupsLabel: string;
  onClose: () => void;
  onTabChange: (tab: SshDeviceTab) => void;
  onOpenTerminal: () => void;
  onTestConnection: () => void;
  onManualBackup: () => void;
}

const SshDeviceModalHeader: React.FC<SshDeviceModalHeaderProps> = ({
  activeTab,
  isMobile,
  isSubmitting,
  formId,
  canOpenBackupsTab,
  canOpenTerminal,
  canTestConnection,
  canManualBackup,
  isTestPending,
  isManualBackupPending,
  terminalLabel,
  testLabel,
  manualBackupLabel,
  basicDataLabel,
  backupsLabel,
  onClose,
  onTabChange,
  onOpenTerminal,
  onTestConnection,
  onManualBackup,
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
      <div className="ssh-device-header-buttons modal-header-actions d-flex align-items-center gap-2 flex-wrap">
        <ModalFormActions
          className="d-flex gap-2"
          onCancel={onClose}
          formId={formId}
          isPending={isSubmitting}
        />
        {canOpenTerminal && (
          <AppButton
            type="button"
            label={terminalLabel}
            variant="primary"
            size="sm"
            onClick={onOpenTerminal}
          />
        )}
        {canTestConnection && (
          <AppButton
            type="button"
            label={testLabel}
            variant="primary"
            size="sm"
            disabled={isTestPending}
            isPending={isTestPending}
            onClick={onTestConnection}
          />
        )}
        {canManualBackup && (
          <AppButton
            type="button"
            label={manualBackupLabel}
            variant="primary"
            size="sm"
            disabled={isManualBackupPending}
            isPending={isManualBackupPending}
            onClick={onManualBackup}
          />
        )}
      </div>
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
