import { useMemo } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useBulkBtn } from 'components/ui';
import { IntegracaoIxcProvedor } from 'services/integracaoIxcProvedorService';
import { BulkAction } from './types';

export type IntegracaoIxcProvedorRow = IntegracaoIxcProvedor;

export interface UseContratoIxcBulkActionsParams {
  isEditMode: boolean;
  selectedIntegracaoIxcItems: IntegracaoIxcProvedorRow[];
  setSelectedIntegracaoIxcItems: (items: IntegracaoIxcProvedorRow[]) => void;
  setEditingIntegracaoIxcId: (id: number | null) => void;
  setShowIntegracaoIxcFormModal: (show: boolean) => void;
  setShowIntegracaoIxcLinkModal: (show: boolean) => void;
  testIntegracaoMutation: UseMutationResult<
    { success: boolean; message: string },
    Error,
    { id?: number; api_url?: string; api_token?: string },
    unknown
  >;
  unlinkIxcMutation: UseMutationResult<unknown, Error, number, unknown>;
}

export function useContratoIxcBulkActions({
  isEditMode,
  selectedIntegracaoIxcItems,
  setSelectedIntegracaoIxcItems,
  setEditingIntegracaoIxcId,
  setShowIntegracaoIxcFormModal,
  setShowIntegracaoIxcLinkModal,
  testIntegracaoMutation,
  unlinkIxcMutation,
}: UseContratoIxcBulkActionsParams) {
  const { t } = useI18n();
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
              label: bulkBtn.deletar.label,
              variant: bulkBtn.deletar.variant,
              action: async (selectedItems: IntegracaoIxcProvedorRow[]) => {
                const items =
                  selectedItems.length > 0 ? selectedItems : selectedIntegracaoIxcItems;
                if (items.length === 0) return;

                const confirmMessage =
                  items.length === 1
                    ? t('messages.confirmUnlinkIxcFromContract')
                    : t('messages.confirmUnlinkIxcFromContractMultiple', { count: items.length });
                if (!window.confirm(confirmMessage)) return;

                try {
                  for (const item of items) {
                    await unlinkIxcMutation.mutateAsync(item.id);
                  }
                  setSelectedIntegracaoIxcItems([]);
                } catch {
                  // Erro tratado pelo hook
                }
              },
              disabled: (selectedItems: IntegracaoIxcProvedorRow[]) =>
                selectedItems.length === 0 && selectedIntegracaoIxcItems.length === 0,
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
      selectedIntegracaoIxcItems,
      setSelectedIntegracaoIxcItems,
      setEditingIntegracaoIxcId,
      setShowIntegracaoIxcFormModal,
      setShowIntegracaoIxcLinkModal,
      testIntegracaoMutation,
      unlinkIxcMutation,
      bulkBtn,
      t,
    ]
  );

  return { integracaoIxcBulkActions };
}
