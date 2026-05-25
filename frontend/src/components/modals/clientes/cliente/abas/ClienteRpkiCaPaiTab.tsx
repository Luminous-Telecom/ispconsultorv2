import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import RpkiCaParentListModal from 'components/modals/rpki/RpkiCaParentListModal';

interface ClienteRpkiCaPaiTabProps {
  clienteId?: number;
}

const ClienteRpkiCaPaiTab: React.FC<ClienteRpkiCaPaiTabProps> = ({ clienteId }) => {
  const { t } = useI18n();

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        {t('messages.saveClientFirstRpki')}
      </div>
    );
  }

  return (
    <RpkiCaParentListModal
          key={`cliente-rpki-cas-pai-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
          tableTitle={t('tabs.rpkiCaPai')}
        />
  );
};

export default ClienteRpkiCaPaiTab;
