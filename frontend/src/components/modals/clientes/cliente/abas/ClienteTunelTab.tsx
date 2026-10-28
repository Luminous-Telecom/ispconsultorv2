import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import AgentListModal from 'components/modals/agent/AgentListModal';

interface ClienteTunelTabProps {
  clienteId?: number;
}

const ClienteTunelTab: React.FC<ClienteTunelTabProps> = ({ clienteId }) => {
  const { t } = useI18n();

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        {t('messages.saveClientFirstTunnel')}
      </div>
    );
  }

  return (
    <AgentListModal
          key={`cliente-tunel-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
        />
  );
};

export default ClienteTunelTab;
