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
    <RpkiRoaListModal
          key={`cliente-rpki-roas-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.rpkiRoas')}
        />
  );
};

export default ClienteRpkiRoasTab;
