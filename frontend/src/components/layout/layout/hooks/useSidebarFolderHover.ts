import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersRealHover } from 'hooks/usePrefersRealHover';

/** Hover: abre quase na hora; fecha um pouco depois ao sair do lateral. */
export const SIDEBAR_FOLDER_OPEN_DELAY_MS = 40;
export const SIDEBAR_FOLDER_CLOSE_DELAY_MS = 80;

function toIdSet(ids: Iterable<string>): Set<string> {
  return new Set(ids);
}

export function useSidebarFolderHover() {
  const prefersHover = usePrefersRealHover();
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => new Set());
  const [pinnedFolderIds, setPinnedFolderIds] = useState<Set<string>>(() => new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedModalId, setSelectedModalId] = useState<string | null>(null);

  const openFolderIdsRef = useRef(openFolderIds);
  const pinnedFolderIdsRef = useRef(pinnedFolderIds);
  const openTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  openFolderIdsRef.current = openFolderIds;
  pinnedFolderIdsRef.current = pinnedFolderIds;

  const clearOpenTimer = useCallback((folderId: string) => {
    const timer = openTimersRef.current.get(folderId);
    if (timer !== undefined) {
      clearTimeout(timer);
      openTimersRef.current.delete(folderId);
    }
  }, []);

  const clearAllOpenTimers = useCallback(() => {
    openTimersRef.current.forEach((timer) => clearTimeout(timer));
    openTimersRef.current.clear();
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearAllOpenTimers();
      clearCloseTimer();
    },
    [clearAllOpenTimers, clearCloseTimer]
  );

  const isFolderOpen = useCallback(
    (folderId: string) => openFolderIds.has(folderId),
    [openFolderIds]
  );

  const scheduleFolderOpen = useCallback(
    (folderId: string) => {
      if (!prefersHover) {
        return;
      }
      clearCloseTimer();
      if (openFolderIdsRef.current.has(folderId)) {
        return;
      }
      clearOpenTimer(folderId);
      const timer = setTimeout(() => {
        openTimersRef.current.delete(folderId);
        setOpenFolderIds((prev) => {
          if (prev.has(folderId)) {
            return prev;
          }
          const next = new Set(prev);
          next.add(folderId);
          return next;
        });
      }, SIDEBAR_FOLDER_OPEN_DELAY_MS);
      openTimersRef.current.set(folderId, timer);
    },
    [prefersHover, clearCloseTimer, clearOpenTimer]
  );

  /** Cancela abertura pendente ao sair da pasta (ex.: passou rápido para outra). */
  const cancelFolderOpen = useCallback(
    (folderId: string) => {
      if (!prefersHover) {
        return;
      }
      clearOpenTimer(folderId);
    },
    [prefersHover, clearOpenTimer]
  );

  const handleSidebarMouseEnter = useCallback(() => {
    if (!prefersHover) {
      return;
    }
    clearCloseTimer();
  }, [prefersHover, clearCloseTimer]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!prefersHover) {
      return;
    }
    clearAllOpenTimers();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpenFolderIds(toIdSet(pinnedFolderIdsRef.current));
    }, SIDEBAR_FOLDER_CLOSE_DELAY_MS);
  }, [prefersHover, clearAllOpenTimers, clearCloseTimer]);

  /** Clique abre/fecha na hora — mais rápido que esperar o hover. */
  const toggleFolder = useCallback(
    (folderId: string) => {
      clearOpenTimer(folderId);
      clearCloseTimer();

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
    },
    [clearOpenTimer, clearCloseTimer]
  );

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
    prefersHover,
    selectedItemId,
    selectedModalId,
    isFolderOpen,
    scheduleFolderOpen,
    cancelFolderOpen,
    handleSidebarMouseEnter,
    handleSidebarMouseLeave,
    toggleFolder,
    selectItem,
    clearSelection,
  };
}
