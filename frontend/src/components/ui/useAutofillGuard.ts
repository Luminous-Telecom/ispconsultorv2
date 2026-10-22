import { useCallback, useState } from 'react';

const KEPT_AUTOCOMPLETE = new Set([
  'new-password',
  'current-password',
  'one-time-code',
  'username',
]);

/**
 * Cadastros não devem herdar o cadastro anterior via autofill do navegador.
 * Tokens de senha/usuário continuam válidos quando o campo pede explicitamente.
 */
export function resolveFormFieldAutoComplete(explicit?: string): string {
  if (explicit && KEPT_AUTOCOMPLETE.has(explicit)) return explicit;
  return 'off';
}

type GuardElement = { readOnly: boolean };

export function useAutofillGuard(enabled: boolean, readOnly: boolean) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlock = useCallback(
    (element: GuardElement) => {
      if (!enabled || readOnly) return;
      element.readOnly = false;
      setIsUnlocked(true);
    },
    [enabled, readOnly]
  );

  const isLocked = enabled && !readOnly && !isUnlocked;

  return {
    enabled,
    readOnly: readOnly || isLocked,
    unlock,
    domProps: {
      ...(enabled
        ? {
            autoComplete: 'off' as const,
            'data-1p-ignore': 'true',
            'data-lpignore': 'true',
            'data-form-type': 'other',
          }
        : {}),
      ...(isLocked ? { 'data-autofill-guard': '' } : {}),
    },
  };
}
