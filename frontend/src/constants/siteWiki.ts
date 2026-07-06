/** Base pública da wiki VitePress (doc/). */
export function getWikiBaseUrl(): string {
  const fromEnv = process.env.REACT_APP_WIKI_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:4001`;
    }
  }

  return 'https://wiki-erp.ispconsultor.com.br';
}

/** Monta URL da wiki — paths começam com /doc/ */
export function wikiUrl(path = '/doc/'): string {
  const base = getWikiBaseUrl();
  if (!path || path === '/') return `${base}/`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
