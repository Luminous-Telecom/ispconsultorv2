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

export const getApiBaseUrl = (): string => {
  // Priorizar window.__APP_CONFIG__ (configuração dinâmica do backend)
  const appConfig = typeof window !== 'undefined' && window.__APP_CONFIG__ 
    ? window.__APP_CONFIG__ 
    : { REACT_APP_API_URL: '/api' }; // Valor padrão hardcoded
  
  return ensureRelativeUrl(appConfig.REACT_APP_API_URL) || '/api';
};

