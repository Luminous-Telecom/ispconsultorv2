import { useCallback, useRef, useState } from 'react';

function toIdSet(ids: Iterable<string>): Set<string> {
  return new Set(ids);
}

export function useSidebarFolderHover() {
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => new Set());
  const [pinnedFolderIds, setPinnedFolderIds] = useState<Set<string>>(() => new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedModalId, setSelectedModalId] = useState<string | null>(null);

  const openFolderIdsRef = useRef(openFolderIds);
  const pinnedFolderIdsRef = useRef(pinnedFolderIds);

  openFolderIdsRef.current = openFolderIds;
  pinnedFolderIdsRef.current = pinnedFolderIds;

  const isFolderOpen = useCallback(
    (folderId: string) => openFolderIds.has(folderId),
    [openFolderIds]
  );

  const toggleFolder = useCallback((folderId: string) => {
    const isOpen = openFolderIdsRef.current.has(folderId);
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (isOpen) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });

    if (isOpen) {
      setPinnedFolderIds((prev) => {
        if (!prev.has(folderId)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, []);

  const selectItem = useCallback((itemId: string, modalId: string, folderPath: string[]) => {
    const pathSet = toIdSet(folderPath);
    setSelectedItemId(itemId);
    setSelectedModalId(modalId);
    setPinnedFolderIds(pathSet);
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      folderPath.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  /** Fecha pastas pinadas ao fechar o modal da opção selecionada. */
  const clearSelection = useCallback(() => {
    const pinned = pinnedFolderIdsRef.current;
    setSelectedItemId(null);
    setSelectedModalId(null);
    setPinnedFolderIds(new Set());
    if (pinned.size === 0) {
      return;
    }
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      pinned.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  return {
    selectedItemId,
    selectedModalId,
    isFolderOpen,
    toggleFolder,
    selectItem,
    clearSelection,
  };
}
