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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <AgentListModal
          key={`cliente-tunel-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.tunnelAgents')}
        />
      </div>
    </div>
  );
};

export default ClienteTunelTab;
