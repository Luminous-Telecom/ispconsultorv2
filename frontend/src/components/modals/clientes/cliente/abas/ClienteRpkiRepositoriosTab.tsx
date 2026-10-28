import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import RpkiRepositoryListModal from 'components/modals/rpki/RpkiRepositoryListModal';

interface ClienteRpkiRepositoriosTabProps {
  clienteId?: number;
}

const ClienteRpkiRepositoriosTab: React.FC<ClienteRpkiRepositoriosTabProps> = ({ clienteId }) => {
  const { t } = useI18n();

  if (!clienteId) {
    return (
      <div className="alert alert-info">
        {t('messages.saveClientFirstRpki')}
      </div>
    );
  }

  return (
    <RpkiRepositoryListModal
          key={`cliente-rpki-repositorios-${clienteId}`}
          show
          onClose={() => {}}
          skipWrapper
          clienteIdFilter={clienteId}
        />
  );
};

export default ClienteRpkiRepositoriosTab;
