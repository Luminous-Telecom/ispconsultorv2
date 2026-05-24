import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import RpkiCaListModal from 'components/modals/rpki/RpkiCaListModal';

interface ClienteRpkiCasTabProps {
  clienteId?: number;
}

const ClienteRpkiCasTab: React.FC<ClienteRpkiCasTabProps> = ({ clienteId }) => {
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
        <RpkiCaListModal
          key={`cliente-rpki-cas-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.rpkiCas')}
        />
      </div>
    </div>
  );
};

export default ClienteRpkiCasTab;
