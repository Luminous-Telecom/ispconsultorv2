import { useMemo } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useBulkBtn } from 'components/ui';
import { IntegracaoIxcProvedor } from 'services/integracaoIxcProvedorService';
import { BulkAction } from './types';

export type IntegracaoIxcProvedorRow = IntegracaoIxcProvedor;

export interface UseContratoIxcBulkActionsParams {
  isEditMode: boolean;
  setEditingIntegracaoIxcId: (id: number | null) => void;
  setShowIntegracaoIxcFormModal: (show: boolean) => void;
  setShowIntegracaoIxcLinkModal: (show: boolean) => void;
  testIntegracaoMutation: UseMutationResult<
    { success: boolean; message: string },
    Error,
    { id?: number; api_url?: string; api_token?: string },
    unknown
  >;
}

export function useContratoIxcBulkActions({
  isEditMode,
  setEditingIntegracaoIxcId,
  setShowIntegracaoIxcFormModal,
  setShowIntegracaoIxcLinkModal,
  testIntegracaoMutation,
}: UseContratoIxcBulkActionsParams) {
  const bulkBtn = useBulkBtn();

  const integracaoIxcBulkActions: BulkAction<IntegracaoIxcProvedorRow>[] = useMemo(
    () =>
      isEditMode
        ? [
            {
              label: bulkBtn.novo.label,
              variant: bulkBtn.novo.variant,
              action: () => {
                setShowIntegracaoIxcLinkModal(true);
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
      setShowIntegracaoIxcLinkModal,
      testIntegracaoMutation,
      bulkBtn,
    ]
  );

  return { integracaoIxcBulkActions };
}
