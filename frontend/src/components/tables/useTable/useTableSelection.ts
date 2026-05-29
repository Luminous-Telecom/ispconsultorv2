import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseTableSelectionOptions } from './types';

export function useTableSelection<T extends { id: number | string }>({
  selectable,
  multiSelect,
  paginatedData,
  state,
  setState,
  onSelectionChangeRef,
}: UseTableSelectionOptions<T>) {
  const [pendingSelectionChange, setPendingSelectionChange] = useState<T[] | null>(null);

  useEffect(() => {
    if (pendingSelectionChange !== null) {
      onSelectionChangeRef.current?.(pendingSelectionChange);
      setPendingSelectionChange(null);
    }
  }, [pendingSelectionChange, onSelectionChangeRef]);

  const isAllSelected = useMemo(() => {
    if (!selectable || paginatedData.length === 0) return false;
    return paginatedData.every((item) =>
      state.selectedItems.some((selected) => selected.id === item.id)
    );
  }, [selectable, paginatedData, state.selectedItems]);

  const isPartiallySelected = useMemo(() => {
    if (!selectable) return false;
    const selectedCount = paginatedData.filter((item) =>
      state.selectedItems.some((selected) => selected.id === item.id)
    ).length;
    return selectedCount > 0 && selectedCount < paginatedData.length;
  }, [selectable, paginatedData, state.selectedItems]);

  const setSelectedItems = useCallback(
    (items: T[]) => {
      setState((prev) => ({ ...prev, selectedItems: items }));
      onSelectionChangeRef.current?.(items);
    },
    [setState, onSelectionChangeRef]
  );

  const selectAll = useCallback(() => {
    if (!selectable) return;
    if (multiSelect) {
      setState((prev) => ({ ...prev, selectedItems: paginatedData }));
      setPendingSelectionChange(paginatedData);
    } else {
      const firstItem = paginatedData[0];
      if (firstItem) {
        setState((prev) => ({ ...prev, selectedItems: [firstItem] }));
        setPendingSelectionChange([firstItem]);
      }
    }
  }, [selectable, multiSelect, paginatedData, setState]);

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedItems: [] }));
    setPendingSelectionChange([]);
  }, [setState]);

  const toggleSelection = useCallback(
    (item: T) => {
      if (!selectable) return;
      setState((prev) => {
        const isSelected = prev.selectedItems.some((selected) => selected.id === item.id);
        let newSelection: T[];
        if (isSelected) {
          newSelection = prev.selectedItems.filter((selected) => selected.id !== item.id);
        } else {
          newSelection = multiSelect ? [...prev.selectedItems, item] : [item];
        }
        setPendingSelectionChange(newSelection);
        return { ...prev, selectedItems: newSelection };
      });
    },
    [selectable, multiSelect, setState]
  );

  return {
    setPendingSelectionChange,
    isAllSelected,
    isPartiallySelected,
    setSelectedItems,
    selectAll,
    clearSelection,
    toggleSelection,
  };
}
