import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';

export interface UseCopyToClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  resetAfterMs?: number;
  useFallback?: boolean;
}

async function writeTextWithFallback(text: string, useFallback: boolean): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!useFallback) return false;
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textArea);
      return ok;
    } catch {
      return false;
    }
  }
}

export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { success, error } = useNotificationContext();
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    []
  );

  const scheduleReset = useCallback(() => {
    if (!options.resetAfterMs) return;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setCopiedValue(null);
      setCopiedKey(null);
    }, options.resetAfterMs);
  }, [options.resetAfterMs]);

  const copy = useCallback(
    async (text: string, key?: string) => {
      const ok = await writeTextWithFallback(text, options.useFallback ?? false);
      if (ok) {
        setCopiedValue(text);
        setCopiedKey(key ?? null);
        if (options.successMessage) {
          success(options.successMessage);
        }
        scheduleReset();
        return true;
      }
      if (options.errorMessage) {
        error(options.errorMessage);
      }
      return false;
    },
    [error, options.errorMessage, options.successMessage, options.useFallback, scheduleReset, success]
  );

  const readText = useCallback(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return null;
    }
  }, []);

  const isCopied = useCallback(
    (keyOrText?: string) => {
      if (!keyOrText) return copiedValue != null;
      return copiedKey === keyOrText || copiedValue === keyOrText;
    },
    [copiedKey, copiedValue]
  );

  const clearCopied = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setCopiedValue(null);
    setCopiedKey(null);
  }, []);

  return { copy, readText, copiedValue, copiedKey, isCopied, clearCopied };
}
