/**
 * Aguarda o backend estar pronto após atualização (ex.: PM2 reload).
 * Faz polling em /health até responder status ok ou atingir o limite de tentativas.
 */
export async function waitForBackendHealth(
  options: { maxAttempts?: number; delayMs?: number; onAttempt?: (attempt: number) => void } = {}
): Promise<boolean> {
  const { maxAttempts = 45, delayMs = 1000, onAttempt } = options;
  const healthUrls = ['/health', '/api/health'];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt);

    for (const path of healthUrls) {
      try {
        const res = await fetch(path, { method: 'GET', credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data?.status === 'ok' || data?.status === 'OK') {
            return true;
          }
        }
      } catch {
        // ignorar e tentar próxima URL ou próxima tentativa
      }
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return false;
}
