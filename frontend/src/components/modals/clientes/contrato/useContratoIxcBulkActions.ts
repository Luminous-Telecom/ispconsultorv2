import { useMemo } from 'react';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { useApiError } from 'hooks/useApiError';
import { useBulkBtn } from 'components/ui';
import { IntegracaoIxcProvedor } from 'services/integracaoIxcProvedorService';
import { extractApiErrorMessageSync } from 'utils/apiErrorHelper';
import { BulkAction } from './types';

export type IntegracaoIxcProvedorRow = IntegracaoIxcProvedor;

export interface UseContratoIxcBulkActionsParams {
  isEditMode: boolean;
  setEditingIntegracaoIxcId: (id: number | null) => void;
  setShowIntegracaoIxcFormModal: (show: boolean) => void;
  deleteIntegracaoMutation: UseMutationResult<unknown, Error, number, unknown>;
  testIntegracaoMutation: UseMutationResult<
    { success: boolean; message: string },
    Error,
    { id?: number; api_url?: string; api_token?: string },
    unknown
  >;
  queryClient: QueryClient;
}

export function useContratoIxcBulkActions({
  isEditMode,
  setEditingIntegracaoIxcId,
  setShowIntegracaoIxcFormModal,
  deleteIntegracaoMutation,
  testIntegracaoMutation,
  queryClient,
}: UseContratoIxcBulkActionsParams) {
  const bulkBtn = useBulkBtn();
  const { showApiError } = useApiError();

  const integracaoIxcBulkActions: BulkAction<IntegracaoIxcProvedorRow>[] = useMemo(
    () =>
      isEditMode
        ? [
            {
              label: bulkBtn.novo.label,
              variant: bulkBtn.novo.variant,
              action: () => {
                setEditingIntegracaoIxcId(null);
                setShowIntegracaoIxcFormModal(true);
              },
            },
            {
              label: bulkBtn.editar.label,
              variant: bulkBtn.editar.variant,
              action: (selectedItems: IntegracaoIxcProvedorRow[]) => {
                if (selectedItems.length > 0) {
                  setEditingIntegracaoIxcId(selectedItems[0].id);
                  setShowIntegracaoIxcFormModal(true);
                }
              },
              disabled: (selectedItems: IntegracaoIxcProvedorRow[]) => selectedItems.length === 0,
            },
            {
              label: bulkBtn.deletar.label,
              variant: bulkBtn.deletar.variant,
              action: async (selectedItems: IntegracaoIxcProvedorRow[]) => {
                if (selectedItems.length === 0) return;

                const confirmMessage =
                  selectedItems.length === 1
                    ? 'Excluir integração IXC Provedor?'
                    : `Excluir ${selectedItems.length} integrações IXC Provedor?`;
                if (!window.confirm(confirmMessage)) return;

                try {
                  let errorCount = 0;

                  for (const item of selectedItems) {
                    try {
                      await deleteIntegracaoMutation.mutateAsync(item.id);
                    } catch {
                      errorCount++;
                    }
                  }

                  if (errorCount > 0 && selectedItems.length > 1) {
                    showApiError(`${errorCount} integração(ões) não puderam ser excluídas`);
                  }

                  queryClient.invalidateQueries({ queryKey: ['integracao-ixc-provedor'] });
                  queryClient.invalidateQueries({ queryKey: ['contrato-integracao-ixc'] });
                } catch (err: unknown) {
                  showApiError(extractApiErrorMessageSync(err, { defaultMessage: 'Erro ao excluir integração' }));
                }
              },
              disabled: (selectedItems: IntegracaoIxcProvedorRow[]) => selectedItems.length === 0,
            },
            {
              label: 'Testar integração',
              variant: bulkBtn.editar.variant,
              action: async (selectedItems: IntegracaoIxcProvedorRow[]) => {
                if (selectedItems.length !== 1) return;
                try {
                  await testIntegracaoMutation.mutateAsync({ id: selectedItems[0].id });
                } catch {
                  // Erro tratado pelo hook
                }
              },
              disabled: (selectedItems: IntegracaoIxcProvedorRow[]) => selectedItems.length !== 1,
            },
          ]
        : [],
    [
      isEditMode,
      setEditingIntegracaoIxcId,
      setShowIntegracaoIxcFormModal,
      deleteIntegracaoMutation,
      testIntegracaoMutation,
      queryClient,
      bulkBtn,
      showApiError,
    ]
  );

  return { integracaoIxcBulkActions };
}
