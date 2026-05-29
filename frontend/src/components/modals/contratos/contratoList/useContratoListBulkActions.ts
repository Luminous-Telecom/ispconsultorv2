import { useMemo } from 'react';
import { Contrato } from 'hooks/useContratos';

interface UseContratoListBulkActionsParams {
  onSelectContrato?: (contrato: Contrato) => void;
  onCreate: () => void;
  onEdit: (contratoId: number) => void;
  onDelete: (id: number) => Promise<void>;
  handleImprimirContrato: (contrato: Contrato) => Promise<void>;
  handleImprimirTermoAdesao: (contrato: Contrato) => Promise<void>;
  handleImprimirContratoPermanencia: (contrato: Contrato) => Promise<void>;
}

export function useContratoListBulkActions({
  onSelectContrato,
  onCreate,
  onEdit,
  onDelete,
  handleImprimirContrato,
  handleImprimirTermoAdesao,
  handleImprimirContratoPermanencia,
}: UseContratoListBulkActionsParams) {
  const bulkActions = useMemo(() => {
    if (onSelectContrato) {
      return [];
    }
    return [
      {
        label: 'Novo',
        variant: 'primary' as const,
        action: () => onCreate(),
      },
      {
        label: 'Editar',
        variant: 'primary' as const,
        disabled: (selectedItems: Contrato[]) => selectedItems.length === 0,
        action: (selectedItems: Contrato[]) => {
          if (selectedItems.length > 0) {
            onEdit(selectedItems[0].id);
          }
        },
      },
      {
        label: 'Deletar',
        variant: 'primary' as const,
        disabled: (selectedItems: Contrato[]) => selectedItems.length === 0,
        action: async (selectedItems: Contrato[]) => {
          if (selectedItems.length === 0) return;

          const confirmed = window.confirm(
            `Tem certeza que deseja deletar ${selectedItems.length} contrato(s)?`
          );
          if (confirmed) {
            for (const item of selectedItems) {
              await onDelete(item.id);
            }
          }
        },
      },
      {
        label: 'Imprimir',
        variant: 'primary' as const,
        disabled: (selectedItems: Contrato[]) => selectedItems.length === 0,
        dropdown: [
          {
            label: 'Contrato',
            action: async (selectedItems?: Contrato[]) => {
              const items = selectedItems || [];
              if (items.length > 0) {
                await handleImprimirContrato(items[0]);
              }
            },
          },
          {
            label: 'Termo de Adesão',
            action: async (selectedItems?: Contrato[]) => {
              const items = selectedItems || [];
              if (items.length > 0) {
                await handleImprimirTermoAdesao(items[0]);
              }
            },
          },
          {
            label: 'Contrato Permanência',
            action: async (selectedItems?: Contrato[]) => {
              const items = selectedItems || [];
              if (items.length > 0) {
                await handleImprimirContratoPermanencia(items[0]);
              }
            },
          },
        ],
      },
    ];
  }, [
    onSelectContrato,
    onCreate,
    onEdit,
    onDelete,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
  ]);

  return { bulkActions };
}
