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
    <RpkiCaListModal
          key={`cliente-rpki-cas-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
        />
  );
};

export default ClienteRpkiCasTab;
