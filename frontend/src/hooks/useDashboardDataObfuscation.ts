import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'dashboard-data-obfuscated';
const listeners = new Set<() => void>();

function readObfuscated(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function writeObfuscated(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* storage indisponível */
  }
  listeners.forEach((listener) => listener());
}

export function useDashboardDataObfuscation() {
  const isObfuscated = useSyncExternalStore(subscribe, readObfuscated, () => false);

  const toggle = useCallback(() => {
    writeObfuscated(!readObfuscated());
  }, []);

  return { isObfuscated, toggle };
}
