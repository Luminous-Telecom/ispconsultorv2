import { useMemo } from 'react';
import { ContaPagar } from 'types';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useI18n } from 'contexts/I18nContext';

interface UseContasPagarBulkActionsParams {
  list: ReturnType<typeof useEntityListModal<ContaPagar>>;
  onSelectContaPagar?: (contaPagar: ContaPagar) => void;
  onClose: () => void;
  handleDelete: (contaPagarId: number) => Promise<void>;
  handleDuplicar: (contaPagarId: number) => Promise<void>;
  setShowCreateModal: (show: boolean) => void;
  setShowEditModal: (show: boolean) => void;
  setShowPagamentoModal: (show: boolean) => void;
  setSelectedContaPagarId: (id: number | null) => void;
}

export function useContasPagarBulkActions({
  list,
  onSelectContaPagar,
  onClose,
  handleDelete,
  handleDuplicar,
  setShowCreateModal,
  setShowEditModal,
  setShowPagamentoModal,
  setSelectedContaPagarId,
}: UseContasPagarBulkActionsParams) {
  const { t } = useI18n();

  return useMemo(() => {
    if (onSelectContaPagar) {
      return [
        {
          label: list.bulkBtn.cancelar.label,
          variant: list.bulkBtn.cancelar.variant,
          action: () => {
            list.clearSelection();
            onClose();
          },
        },
        {
          label: list.bulkBtn.inserir.label,
          variant: list.bulkBtn.inserir.variant,
          disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
          action: (selectedItems: ContaPagar[]) => {
            const item = list.resolveItem(selectedItems);
            if (item) {
              list.clearSelection();
              onSelectContaPagar(item);
              onClose();
            }
          },
        },
      ];
    }

    return [
      {
        label: list.bulkBtn.novo.label,
        variant: list.bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: list.bulkBtn.editar.label,
        variant: list.bulkBtn.editar.variant,
        disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) {
            setSelectedContaPagarId(item.id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.deletar.label,
        variant: list.bulkBtn.deletar.variant,
        disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
        action: async (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (!item) return;
          if (!window.confirm(t('messages.confirmDeleteAccountPayable'))) return;
          await handleDelete(item.id);
        },
      },
      {
        label: list.bulkBtn.pagar.label,
        variant: list.bulkBtn.pagar.variant,
        disabled: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          return !item || item.status === 'PAGO' || item.status === 'CANCELADO';
        },
        action: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) {
            setSelectedContaPagarId(item.id);
            setShowPagamentoModal(true);
          }
        },
      },
      {
        label: list.bulkBtn.duplicar.label,
        variant: list.bulkBtn.duplicar.variant,
        disabled: (selectedItems: ContaPagar[]) => list.isNothingSelected(selectedItems),
        action: (selectedItems: ContaPagar[]) => {
          const item = list.resolveItem(selectedItems);
          if (item) handleDuplicar(item.id);
        },
      },
    ];
  }, [
    onSelectContaPagar,
    list,
    onClose,
    t,
    handleDelete,
    handleDuplicar,
    setShowCreateModal,
    setShowEditModal,
    setShowPagamentoModal,
    setSelectedContaPagarId,
  ]);
}
