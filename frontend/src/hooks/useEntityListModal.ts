import { useState, useCallback } from 'react';
import { useTableFilters } from './useTableFilters';
import { useModalSelect } from './useModalSelect';
import { useAuditoria } from './useAuditoria';
import { useBulkBtn } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { normalizeListPagination, type BackendPaginationShape } from 'utils/pagination';
import type { ListModalProps } from 'types/modal';

type BulkAction<T> = NonNullable<ListModalProps<T>['bulkActions']>[number];

export interface UseEntityListModalOptions<T extends { id: number | string }> {
  onClose: () => void;
  onSelect?: (item: T) => void;
  initialSearchField?: string;
}

export interface CrudBulkActionsConfig<T> {
  onNew: () => void;
  onEdit: (item: T) => void;
  onDelete: (id: number) => void | Promise<void>;
}

export function useEntityListModal<T extends { id: number | string }>({
  onClose,
  onSelect,
  initialSearchField,
}: UseEntityListModalOptions<T>) {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const auditoria = useAuditoria();

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialSearchField,
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const {
    selectedItem,
    handleSelectionChange,
    clearSelection,
  } = useModalSelect<T>(
    onSelect
      ? (item) => {
          onSelect(item);
          onClose();
        }
      : undefined
  );

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);

  const resolveItem = useCallback(
    (selectedItems?: T[]) => {
      if (selectedItems && selectedItems.length > 0) {
        return selectedItems[0];
      }
      return selectedItem;
    },
    [selectedItem]
  );

  const isNothingSelected = useCallback(
    (selectedItems: T[]) => selectedItems.length === 0 && !selectedItem,
    [selectedItem]
  );

  const handleModalClose = useCallback(() => {
    clearSelection();
    onClose();
  }, [clearSelection, onClose]);

  const handleSearchChange = useCallback(
    (search: string, field?: string) => {
      tableFilters.setSearch(search);
      if (field) {
        tableFilters.setSearchField(field);
      }
    },
    [tableFilters]
  );

  const handleSearchFieldChange = useCallback(
    (field: string) => {
      tableFilters.setSearchField(field);
    },
    [tableFilters]
  );

  const openCreateForm = useCallback(() => {
    setSelectedEntityId(null);
    setShowFormModal(true);
  }, []);

  const openEditForm = useCallback((item: T) => {
    setSelectedEntityId(Number(item.id));
    setShowFormModal(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setShowFormModal(false);
    setSelectedEntityId(null);
  }, []);

  const buildPagination = useCallback(
    (backendPagination: BackendPaginationShape | undefined | null) =>
      normalizeListPagination(backendPagination, tableFilters.page, tableFilters.limit),
    [tableFilters.page, tableFilters.limit]
  );

  const buildSelectBulkActions = useCallback((): BulkAction<T>[] => {
    const handleSelect = (selectedItems?: T[]) => {
      const item = resolveItem(selectedItems);
      if (item) {
        clearSelection();
        onSelect?.(item);
        onClose();
      }
    };

    return [
      {
        label: bulkBtn.cancelar.label,
        variant: bulkBtn.cancelar.variant,
        action: () => {
          clearSelection();
          onClose();
        },
      },
      {
        label: bulkBtn.selecionar.label,
        variant: bulkBtn.selecionar.variant,
        disabled: (selectedItems: T[]) => isNothingSelected(selectedItems),
        action: (selectedItems: T[]) => handleSelect(selectedItems),
      },
    ];
  }, [
    bulkBtn,
    clearSelection,
    isNothingSelected,
    onClose,
    onSelect,
    resolveItem,
  ]);

  const buildCrudBulkActions = useCallback(
    ({ onNew, onEdit, onDelete }: CrudBulkActionsConfig<T>): BulkAction<T>[] => [
      {
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        action: () => onNew(),
      },
      {
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        disabled: (selectedItems: T[]) => isNothingSelected(selectedItems),
        action: (selectedItems: T[]) => {
          const item = resolveItem(selectedItems);
          if (item) {
            onEdit(item);
          }
        },
      },
      {
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (selectedItems: T[]) => isNothingSelected(selectedItems),
        action: async (selectedItems: T[]) => {
          const item = resolveItem(selectedItems);
          if (!item) return;
          if (!window.confirm(t('messages.confirmDelete'))) return;
          await onDelete(Number(item.id));
        },
      },
    ],
    [bulkBtn, isNothingSelected, resolveItem, t]
  );

  return {
    t,
    bulkBtn,
    auditoria,
    tableFilters,
    selectedItem,
    handleSelectionChange,
    clearSelection,
    showFormModal,
    setShowFormModal,
    selectedEntityId,
    setSelectedEntityId,
    resolveItem,
    isNothingSelected,
    handleModalClose,
    handleSearchChange,
    handleSearchFieldChange,
    openCreateForm,
    openEditForm,
    closeFormModal,
    buildPagination,
    buildSelectBulkActions,
    buildCrudBulkActions,
  };
}
