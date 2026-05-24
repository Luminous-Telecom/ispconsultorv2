import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import RpkiAspaListModal from 'components/modals/rpki/RpkiAspaListModal';

interface ClienteRpkiAspasTabProps {
  clienteId?: number;
}

const ClienteRpkiAspasTab: React.FC<ClienteRpkiAspasTabProps> = ({ clienteId }) => {
  const { t } = useI18n();

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        {t('messages.saveClientFirstRpki')}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <RpkiAspaListModal
          key={`cliente-rpki-aspas-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.rpkiAspas')}
        />
      </div>
    </div>
  );
};

export default ClienteRpkiAspasTab;
