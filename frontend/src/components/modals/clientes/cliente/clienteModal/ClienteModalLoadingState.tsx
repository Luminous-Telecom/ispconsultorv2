import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { Spinner } from 'components/ui';

interface ClienteModalLoadingStateProps {
  isLoadingCliente: boolean;
  isEditing: boolean;
  cliente: unknown;
  children: React.ReactNode;
}

function ClienteModalLoadingState({
  isLoadingCliente,
  isEditing,
  cliente,
  children,
}: ClienteModalLoadingStateProps) {
  const { t } = useI18n();

  if (isLoadingCliente && isEditing) {
    return (
      <div className="text-center p-4">
        <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
        <p className="mt-2">{t('messages.loadingClientData')}</p>
      </div>
    );
  }

  if (!cliente && isEditing) {
    return (
      <div className="text-center p-4">
        <p>{t('messages.noData')}</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default ClienteModalLoadingState;
