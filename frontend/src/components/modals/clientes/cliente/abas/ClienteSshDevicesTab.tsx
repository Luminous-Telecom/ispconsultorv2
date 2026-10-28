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
    <SshDeviceListModal
          key={`cliente-ssh-devices-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
        />
  );
};

export default ClienteSshDevicesTab;
