import { useMemo } from 'react';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { useBulkBtn } from 'components/ui';
import { ContratoPlanoAdicional } from 'services/contratoPlanoAdicionalService';
import { extractApiErrorMessageSync } from 'utils/apiErrorHelper';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { BulkAction } from './types';

export interface UseContratoServicosBulkActionsParams {
  isEditMode: boolean;
  internalContratoId: number | null;
  setEditingServicoAdicional: (servico: ContratoPlanoAdicional | null) => void;
  setShowServicoAdicionalModal: (show: boolean) => void;
  deleteServicoAdicionalMutation: UseMutationResult<unknown, Error, number, unknown>;
  queryClient: QueryClient;
}

export function useContratoServicosBulkActions({
  isEditMode,
  internalContratoId,
  setEditingServicoAdicional,
  setShowServicoAdicionalModal,
  deleteServicoAdicionalMutation,
  queryClient,
}: UseContratoServicosBulkActionsParams) {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const servicosAdicionaisBulkActions: BulkAction<ContratoPlanoAdicional>[] = useMemo(
    () =>
      isEditMode
        ? [
            {
              label: bulkBtn.novo.label,
              variant: bulkBtn.novo.variant,
              action: () => {
                setEditingServicoAdicional(null);
                setShowServicoAdicionalModal(true);
              },
            },
            {
              label: bulkBtn.editar.label,
              variant: bulkBtn.editar.variant,
              action: (selectedItems: ContratoPlanoAdicional[]) => {
                if (selectedItems.length > 0) {
                  const servico = selectedItems[0];
                  setEditingServicoAdicional(servico);
                  setShowServicoAdicionalModal(true);
                }
              },
              disabled: (selectedItems: ContratoPlanoAdicional[]) => selectedItems.length === 0,
            },
            {
              label: bulkBtn.deletar.label,
              variant: bulkBtn.deletar.variant,
              action: async (selectedItems: ContratoPlanoAdicional[]) => {
                if (selectedItems.length === 0) return;

                const confirmMessage =
                  selectedItems.length === 1
                    ? t('messages.confirmDeleteAdditionalService')
                    : t('messages.confirmDeleteAdditionalServices', {
                        count: selectedItems.length,
                      });
                const confirmed = window.confirm(confirmMessage);
                if (confirmed) {
                  try {
                    let successCount = 0;
                    let errorCount = 0;

                    for (const item of selectedItems) {
                      try {
                        await deleteServicoAdicionalMutation.mutateAsync(item.id);
                        successCount++;
                      } catch (err: unknown) {
                        errorCount++;
                        const errorMessage = extractApiErrorMessageSync(err, {
                          defaultMessage: CONTEXT_ERROR_MESSAGES.SERVICO_ADICIONAL_DELETE_ERROR,
                        });
                        if (selectedItems.length === 1) {
                          showApiError(errorMessage);
                        }
                      }
                    }

                    if (successCount > 0) {
                      const message =
                        successCount === 1
                          ? t('messages.successDeleteAdditionalService')
                          : t('messages.successDeleteAdditionalServices', { count: successCount });
                      success(message);
                    }

                    if (errorCount > 0 && selectedItems.length > 1) {
                      showApiError(
                        t('messages.errorDeleteAdditionalServices', { count: errorCount })
                      );
                    }

                    queryClient.invalidateQueries({
                      queryKey: ['contrato-planos-adicionais', internalContratoId],
                    });
                  } catch (err: unknown) {
                    const errorMessage = extractApiErrorMessageSync(err, {
                      defaultMessage: CONTEXT_ERROR_MESSAGES.SERVICOS_ADICIONAIS_DELETE_ERROR,
                    });
                    showApiError(errorMessage);
                  }
                }
              },
              disabled: (selectedItems: ContratoPlanoAdicional[]) => selectedItems.length === 0,
            },
          ]
        : [],
    [
      isEditMode,
      internalContratoId,
      setEditingServicoAdicional,
      setShowServicoAdicionalModal,
      deleteServicoAdicionalMutation,
      queryClient,
      t,
      bulkBtn,
      success,
      showApiError,
    ]
  );

  return { servicosAdicionaisBulkActions };
}
