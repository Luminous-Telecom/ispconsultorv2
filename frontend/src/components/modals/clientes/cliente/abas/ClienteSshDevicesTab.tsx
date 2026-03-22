import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import SshDeviceListModal from 'components/modals/ssh-manager/SshDeviceListModal';

interface ClienteSshDevicesTabProps {
  clienteId?: number;
}

const ClienteSshDevicesTab: React.FC<ClienteSshDevicesTabProps> = ({ clienteId }) => {
  const { t } = useI18n();

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        {t('messages.saveClientFirstSshDevices')}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <SshDeviceListModal
          key={`cliente-ssh-devices-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.sshDevicesSection')}
        />
      </div>
    </div>
  );
};

export default ClienteSshDevicesTab;
