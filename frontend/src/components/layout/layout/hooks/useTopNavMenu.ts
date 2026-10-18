import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersRealHover } from 'hooks/usePrefersRealHover';

/** Hover: mesmo atraso curto para abrir e fechar. */
export const TOP_NAV_OPEN_DELAY_MS = 100;
export const TOP_NAV_CLOSE_DELAY_MS = 100;

export function useTopNavMenu() {
  const prefersHover = usePrefersRealHover();
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [openNestedFolderId, setOpenNestedFolderId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedModalId, setSelectedModalId] = useState<string | null>(null);

  const openFolderIdRef = useRef(openFolderId);
  const openNestedFolderIdRef = useRef(openNestedFolderId);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nestedOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nestedCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  openFolderIdRef.current = openFolderId;
  openNestedFolderIdRef.current = openNestedFolderId;

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearNestedOpenTimer = useCallback(() => {
    if (nestedOpenTimerRef.current !== null) {
      clearTimeout(nestedOpenTimerRef.current);
      nestedOpenTimerRef.current = null;
    }
  }, []);

  const clearNestedCloseTimer = useCallback(() => {
    if (nestedCloseTimerRef.current !== null) {
      clearTimeout(nestedCloseTimerRef.current);
      nestedCloseTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearOpenTimer();
      clearNestedOpenTimer();
      clearNestedCloseTimer();
      clearCloseTimer();
    },
    [clearOpenTimer, clearNestedOpenTimer, clearNestedCloseTimer, clearCloseTimer]
  );

  const isFolderOpen = useCallback(
    (folderId: string) => openFolderId === folderId,
    [openFolderId]
  );

  const isNestedFolderOpen = useCallback(
    (folderId: string) => openNestedFolderId === folderId,
    [openNestedFolderId]
  );

  const scheduleFolderOpen = useCallback(
    (folderId: string) => {
      if (!prefersHover) {
        return;
      }
      clearCloseTimer();
      if (openFolderIdRef.current === folderId) {
        return;
      }
      clearOpenTimer();
      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        clearNestedOpenTimer();
        setOpenNestedFolderId(null);
        setOpenFolderId(folderId);
      }, TOP_NAV_OPEN_DELAY_MS);
    },
    [prefersHover, clearCloseTimer, clearOpenTimer, clearNestedOpenTimer]
  );

  const cancelFolderOpen = useCallback(
    (folderId: string) => {
      if (!prefersHover) {
        return;
      }
      if (openFolderIdRef.current === folderId) {
        return;
      }
      clearOpenTimer();
    },
    [prefersHover, clearOpenTimer]
  );

  const scheduleNestedFolderOpen = useCallback(
    (folderId: string) => {
      if (!prefersHover) {
        return;
      }
      clearNestedCloseTimer();
      if (openNestedFolderIdRef.current === folderId) {
        return;
      }
      clearNestedOpenTimer();
      nestedOpenTimerRef.current = setTimeout(() => {
        nestedOpenTimerRef.current = null;
        setOpenNestedFolderId(folderId);
      }, TOP_NAV_OPEN_DELAY_MS);
    },
    [prefersHover, clearNestedOpenTimer, clearNestedCloseTimer]
  );

  /** Fecha subpasta com atraso — permite ir do item ao flyout fora do overflow. */
  const scheduleNestedFolderClose = useCallback(
    (folderId: string) => {
      clearNestedOpenTimer();
      clearNestedCloseTimer();
      nestedCloseTimerRef.current = setTimeout(() => {
        nestedCloseTimerRef.current = null;
        setOpenNestedFolderId((current) => (current === folderId ? null : current));
      }, TOP_NAV_OPEN_DELAY_MS);
    },
    [clearNestedOpenTimer, clearNestedCloseTimer]
  );

  const keepNestedFolderOpen = useCallback(
    (folderId: string) => {
      clearNestedCloseTimer();
      clearNestedOpenTimer();
      setOpenNestedFolderId(folderId);
    },
    [clearNestedCloseTimer, clearNestedOpenTimer]
  );

  /** Fecha subpasta na hora (troca de pasta pai / seleção). */
  const closeNestedFolder = useCallback(
    (folderId?: string) => {
      clearNestedOpenTimer();
      clearNestedCloseTimer();
      if (!folderId) {
        setOpenNestedFolderId(null);
        return;
      }
      setOpenNestedFolderId((current) => (current === folderId ? null : current));
    },
    [clearNestedOpenTimer, clearNestedCloseTimer]
  );

  const handleMenuMouseEnter = useCallback(() => {
    if (!prefersHover) {
      return;
    }
    clearCloseTimer();
  }, [prefersHover, clearCloseTimer]);

  const handleMenuMouseLeave = useCallback(() => {
    if (!prefersHover) {
      return;
    }
    clearOpenTimer();
    clearNestedOpenTimer();
    clearNestedCloseTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setOpenFolderId(null);
      setOpenNestedFolderId(null);
    }, TOP_NAV_CLOSE_DELAY_MS);
  }, [prefersHover, clearOpenTimer, clearNestedOpenTimer, clearNestedCloseTimer, clearCloseTimer]);

  const toggleFolder = useCallback(
    (folderId: string) => {
      clearOpenTimer();
      clearNestedOpenTimer();
      clearNestedCloseTimer();
      clearCloseTimer();
      setOpenNestedFolderId(null);
      setOpenFolderId((current) => (current === folderId ? null : folderId));
    },
    [clearOpenTimer, clearNestedOpenTimer, clearNestedCloseTimer, clearCloseTimer]
  );

  const toggleNestedFolder = useCallback(
    (folderId: string) => {
      clearNestedOpenTimer();
      clearNestedCloseTimer();
      setOpenNestedFolderId((current) => (current === folderId ? null : folderId));
    },
    [clearNestedOpenTimer, clearNestedCloseTimer]
  );

  const selectItem = useCallback((itemId: string, modalId: string) => {
    setSelectedItemId(itemId);
    setSelectedModalId(modalId);
    setOpenFolderId(null);
    setOpenNestedFolderId(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItemId(null);
    setSelectedModalId(null);
    setOpenFolderId(null);
    setOpenNestedFolderId(null);
  }, []);

  return {
    selectedItemId,
    selectedModalId,
    isFolderOpen,
    isNestedFolderOpen,
    scheduleFolderOpen,
    cancelFolderOpen,
    scheduleNestedFolderOpen,
    scheduleNestedFolderClose,
    keepNestedFolderOpen,
    closeNestedFolder,
    handleMenuMouseEnter,
    handleMenuMouseLeave,
    toggleFolder,
    toggleNestedFolder,
    selectItem,
    clearSelection,
  };
}
