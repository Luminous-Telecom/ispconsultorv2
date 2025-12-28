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

