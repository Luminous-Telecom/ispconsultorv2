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
    <RpkiAspaListModal
          key={`cliente-rpki-aspas-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.rpkiAspas')}
        />
  );
};

export default ClienteRpkiAspasTab;
