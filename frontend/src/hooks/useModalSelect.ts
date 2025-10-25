import { useState, useCallback } from 'react';

interface UseModalSelectReturn<T> {
  selectedItem: T | null;
  lastClickTime: number;
  lastClickedItem: T | null;
  setSelectedItem: (item: T | null) => void;
  setLastClickTime: (time: number) => void;
  setLastClickedItem: (item: T | null) => void;
  handleSelectionChange: (selectedItems: T[]) => void;
  clearSelection: () => void;
}

export const useModalSelect = <T extends { id: any }>(
  onSelect?: (item: T) => void
): UseModalSelectReturn<T> => {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedItem, setLastClickedItem] = useState<T | null>(null);

  const handleSelectionChange = useCallback((selectedItems: T[]) => {
    if (!onSelect) {
      // Modo normal: apenas atualizar seleção
      if (selectedItems.length > 0) {
        setSelectedItem(selectedItems[0]);
      } else {
        setSelectedItem(null);
      }
      return;
    }

    // Modo de seleção com duplo clique
    if (selectedItems.length > 1) {
      setSelectedItem(selectedItems[selectedItems.length - 1]);
    } else if (selectedItems.length === 1) {
      const currentItem = selectedItems[0];
      const currentTime = Date.now();

      if (lastClickedItem?.id === currentItem.id && (currentTime - lastClickTime) < 300) {
        onSelect(currentItem);
        setLastClickTime(0);
        setLastClickedItem(null);
      } else {
        setSelectedItem(currentItem);
        setLastClickTime(currentTime);
        setLastClickedItem(currentItem);
      }
    } else {
      setSelectedItem(null);
    }
  }, [onSelect, lastClickTime, lastClickedItem]);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
    setLastClickTime(0);
    setLastClickedItem(null);
  }, []);

  return {
    selectedItem,
    lastClickTime,
    lastClickedItem,
    setSelectedItem,
    setLastClickTime,
    setLastClickedItem,
    handleSelectionChange,
    clearSelection
  };
};
