let lastRequiredToastAt = 0;

export function isRequiredValidationMessage(message: unknown): message is string {
  if (typeof message !== 'string') return false;

  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return (
    normalized.includes('obrigatorio') ||
    normalized.includes('obrigatoria') ||
    normalized.includes('obrigatorios') ||
    normalized.includes('obrigatorias')
  );
}

export function shouldShowInlineValidationMessage(message: unknown): boolean {
  return typeof message === 'string' && !isRequiredValidationMessage(message);
}

export function shouldNotifyRequiredValidationToast(windowMs = 300): boolean {
  const now = Date.now();
  if (now - lastRequiredToastAt < windowMs) return false;

  lastRequiredToastAt = now;
  return true;
}

export function getRequiredValidationMessage(
  errors: Record<string, { message?: unknown } | undefined>
): string | null {
  for (const error of Object.values(errors)) {
    if (isRequiredValidationMessage(error?.message)) {
      return error.message;
    }
  }

  return null;
}
