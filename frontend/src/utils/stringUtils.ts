/**
 * Garante que um valor seja convertido para string
 * Evita problemas de [object Object] em formulários
 */
export const ensureString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * Remove acentos (NFD e elimina marcas combinantes).
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Sanitiza um domínio: remove protocolo, aspas, acentos, espaços.
 * Mantém hostname (incl. subdomínios), porta e caminho (path).
 * Remove: https://, http://, aspas, acentos, espaços. Query string (?...) é removida.
 * Exemplos:
 *   "https://encurtador.com/abc" -> "encurtador.com/abc"
 *   "verão777.com" -> "verao777.com"
 *   "betl 8k.app" -> "betl8k.app"
 *   "hympg.com:2087" -> "hympg.com:2087"
 *   '"wolfcassino.com"' -> "wolfcassino.com"
 */
export const sanitizeDominio = (dominio: string | null | undefined): string => {
  if (!dominio || typeof dominio !== 'string') return '';
  let cleaned = dominio.trim().toLowerCase();
  cleaned = cleaned.replace(/["'`]/g, ''); // remove aspas
  cleaned = removeAccents(cleaned);
  cleaned = cleaned.replace(/\s+/g, ''); // junta espaços (remove)
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  const firstQuery = cleaned.indexOf('?');
  if (firstQuery !== -1) cleaned = cleaned.slice(0, firstQuery);
  cleaned = cleaned.replace(/\/+$/, '').trim();
  const firstSlash = cleaned.indexOf('/');
  let hostPart = firstSlash === -1 ? cleaned : cleaned.slice(0, firstSlash);
  hostPart = hostPart.replace(/\.+$/, ''); // remove pontos no final (ex: meusite.com. -> meusite.com)
  const path = firstSlash === -1 ? '' : cleaned.slice(firstSlash);
  if (!hostPart || hostPart.includes('..')) return '';
  const portMatch = hostPart.match(/^(.+):(\d{1,5})$/);
  const hostname = portMatch ? portMatch[1] : hostPart;
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/i.test(hostname)) return '';
  if (path && !/^\/[a-z0-9/_-]*$/i.test(path)) return '';
  return hostPart + path;
};

