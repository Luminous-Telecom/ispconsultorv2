import React from 'react';
import { ModalFormActions } from 'components/ui';
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
}) => (
  <div className="ssh-device-header-unified">
    <ModalFormActions
      className="ssh-device-header-buttons modal-header-actions"
      onCancel={onClose}
      formId={formId}
      isPending={isSubmitting}
    />
    <div className="ssh-device-header-tabs">
      <ul
        className={`nav nav-tabs plano-tabs-unified ${isMobile ? 'plano-tabs-mobile' : ''}`}
        id="sshDeviceTab"
        role="tablist"
        style={{
          margin: 0,
          padding: 0,
          borderBottom: 'none',
          backgroundColor: 'transparent',
        }}
      >
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link modal-tab-hover ${activeTab === 'dados' ? 'active' : ''}`}
            onClick={() => onTabChange('dados')}
          >
            {basicDataLabel}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link modal-tab-hover ${activeTab === 'backups' ? 'active' : ''}`}
            disabled={!canOpenBackupsTab}
            onClick={() => {
              if (canOpenBackupsTab) onTabChange('backups');
            }}
          >
            {backupsLabel}
          </button>
        </li>
      </ul>
    </div>
  </div>
);

export default SshDeviceModalHeader;
