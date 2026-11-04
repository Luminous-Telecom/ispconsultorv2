/** Queda da conexão SSE depois que a atualização já começou no servidor. */
export function isUpdateStreamDisconnect(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  if (name === 'AbortError') return true;
  return (
    name === 'TypeError' ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('terminated') ||
    message.includes('aborted')
  );
}
