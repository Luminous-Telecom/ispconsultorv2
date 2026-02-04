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
 * Sanitiza um domínio: remove apenas protocolo e www., mantém hostname e caminho.
 * Remove: https://, http://, www. (no início). Query string (?...) é removida.
 * Exemplos: "https://encurtador.com/abc" -> "encurtador.com/abc"; "https://meusite.com" -> "meusite.com"
 */
export const sanitizeDominio = (dominio: string | null | undefined): string => {
  if (!dominio || typeof dominio !== 'string') return '';
  let cleaned = dominio.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  const firstQuery = cleaned.indexOf('?');
  if (firstQuery !== -1) cleaned = cleaned.slice(0, firstQuery);
  cleaned = cleaned.replace(/\/+$/, '').trim();
  const firstSlash = cleaned.indexOf('/');
  let hostname = firstSlash === -1 ? cleaned : cleaned.slice(0, firstSlash);
  hostname = hostname.replace(/\.+$/, ''); // remove pontos no final (ex: meusite.com. -> meusite.com)
  const path = firstSlash === -1 ? '' : cleaned.slice(firstSlash);
  if (!hostname || hostname.includes('..')) return '';
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/i.test(hostname)) return '';
  if (path && !/^\/[a-z0-9/_-]*$/i.test(path)) return '';
  return hostname + path;
};

