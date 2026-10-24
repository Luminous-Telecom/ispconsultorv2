import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseTableSelectionOptions } from './types';

export type RowSelectionMode = 'replace' | 'additive';

export function resolveRowSelection<T extends { id: number | string }>(
  selectedItems: T[],
  item: T,
  options: { multiSelect: boolean; mode: RowSelectionMode }
): T[] {
  const isSelected = selectedItems.some((selected) => selected.id === item.id);
  const additive = options.multiSelect && options.mode === 'additive';

  if (!additive) {
    if (isSelected && selectedItems.length === 1) return [];
    return [item];
  }

  if (isSelected) {
    return selectedItems.filter((selected) => selected.id !== item.id);
  }
  return [...selectedItems, item];
}

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
    (item: T, mode: RowSelectionMode = 'additive') => {
      if (!selectable) return;
      setState((prev) => {
        const newSelection = resolveRowSelection(prev.selectedItems, item, { multiSelect, mode });
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
