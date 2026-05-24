import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import RpkiRoaListModal from 'components/modals/rpki/RpkiRoaListModal';

interface ClienteRpkiRoasTabProps {
  clienteId?: number;
}

const ClienteRpkiRoasTab: React.FC<ClienteRpkiRoasTabProps> = ({ clienteId }) => {
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
        <RpkiRoaListModal
          key={`cliente-rpki-roas-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.rpkiRoas')}
        />
      </div>
    </div>
  );
};

export default ClienteRpkiRoasTab;
