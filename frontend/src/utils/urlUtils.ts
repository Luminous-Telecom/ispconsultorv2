export const ensureRelativeUrl = (url: string): string => {
  if (!url) return '';
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname || '';
    } catch {
      return '';
    }
  }
  
  return url.startsWith('/') ? url : '/' + url;
};

/** Evita imagem antiga em cache quando o arquivo é substituído no mesmo path (ex.: logo.png). */
export function withCacheBust(
  url: string | null | undefined,
  version?: string | number | Date | null
): string {
  if (!url) return '';
  const base = url.split('?')[0];
  if (version == null || version === '') return base;
  const raw =
    version instanceof Date
      ? version.getTime()
      : typeof version === 'string' || typeof version === 'number'
        ? version
        : String(version);
  if (raw === '') return base;
  return `${base}?v=${encodeURIComponent(String(raw))}`;
}

