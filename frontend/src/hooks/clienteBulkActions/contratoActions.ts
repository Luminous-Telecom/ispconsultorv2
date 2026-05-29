import { useCallback, useMemo } from 'react';
import { useApiError } from '../useApiError';
import { CONTEXT_ERROR_MESSAGES } from '../../constants/ErrorMessages';
import { useDeleteContrato, Contrato } from '../useContratos';
import { BulkAction } from '../../components/modals/clientes/cliente/types';
import { useI18n } from '../../contexts/I18nContext';
import { useBulkBtn } from '../../components/ui';

interface UseContratoActionsParams {
  onRefreshContratos: () => void | Promise<void>;
  setSelectedContratosItems: React.Dispatch<React.SetStateAction<Contrato[]>>;
  selectedContratosItems: Contrato[];
  onShowContratoCreateModal: () => void;
  onShowContratoEditModal: (contratoId: number) => void;
  handleImprimirContrato: (contratoId: number) => Promise<void>;
  handleImprimirTermoAdesao: (contratoId: number) => Promise<void>;
  handleImprimirContratoPermanencia: (contratoId: number) => Promise<void>;
}

export function useContratoActions({
  onRefreshContratos,
  setSelectedContratosItems,
  selectedContratosItems,
  onShowContratoCreateModal,
  onShowContratoEditModal,
  handleImprimirContrato,
  handleImprimirTermoAdesao,
  handleImprimirContratoPermanencia,
}: UseContratoActionsParams) {
  const { showApiError } = useApiError();
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const deleteContratoMutation = useDeleteContrato();

  const handleDeletarContratos = useCallback(
    async (items: Contrato[]) => {
      if (items.length === 0) return;

      const confirmMessage =
        items.length === 1
          ? t('messages.confirmDelete')
          : t('messages.confirmDeleteAdditionalServices', { count: items.length });
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        try {
          for (const item of items) {
            try {
              await deleteContratoMutation.mutateAsync(item.id);
            } catch (err) {
              showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_DELETE_ERROR);
            }
          }
          onRefreshContratos();
          setSelectedContratosItems([]);
        } catch {
          showApiError(t('contracts.messages.deleteError'));
        }
      }
    },
    [t, deleteContratoMutation, onRefreshContratos, setSelectedContratosItems, showApiError]
  );

  const contratosBulkActions: BulkAction<Contrato>[] = useMemo(() => [
    {
      key: 'novo',
      label: bulkBtn.novo.label,
      variant: bulkBtn.novo.variant,
      onClick: () => onShowContratoCreateModal(),
    },
    {
      key: 'editar',
      label: bulkBtn.editar.label,
      variant: bulkBtn.editar.variant,
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: (selectedItems) => {
        if (selectedItems.length > 0) {
          onShowContratoEditModal(selectedItems[0].id);
        }
      },
    },
    {
      key: 'excluir',
      label: bulkBtn.deletar.label,
      variant: bulkBtn.deletar.variant,
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: handleDeletarContratos,
      confirm: {
        title: t('contracts.confirmDelete'),
        message: t('contracts.confirmDeleteMessage'),
        confirmText: t('actions.delete'),
        cancelText: t('actions.cancel'),
      },
    },
    {
      key: 'imprimir',
      label: bulkBtn.imprimir.label,
      variant: bulkBtn.imprimir.variant,
      disabled: (selectedItems) => selectedItems.length === 0,
      dropdown: [
        {
          label: t('contracts.title'),
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirContrato(selectedContratosItems[0].id);
            }
          },
        },
        {
          label: t('contracts.termAdesao'),
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirTermoAdesao(selectedContratosItems[0].id);
            }
          },
        },
        {
          label: t('contracts.permanencia'),
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirContratoPermanencia(selectedContratosItems[0].id);
            }
          },
        },
      ],
    },
  ], [
    bulkBtn,
    t,
    onShowContratoCreateModal,
    onShowContratoEditModal,
    handleDeletarContratos,
    selectedContratosItems,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
  ]);

  return {
    contratosBulkActions,
    handleDeletarContratos,
  };
}
