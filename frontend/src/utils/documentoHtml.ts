function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * HTML gravado escapado (`&lt;table&gt;` ou `&amp;lt;table&amp;gt;`) volta a ser marcação.
 * HTML já real não passa pelo textarea: isso apagaria as tags.
 */
export function decodeEscapedDocumentHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;

  let current = html;
  for (let i = 0; i < 3; i += 1) {
    const trimmed = current.trimStart();
    if (!trimmed.startsWith('&lt;') && !trimmed.startsWith('&amp;lt;')) break;
    const next = decodeHtmlEntities(current);
    if (!next || next === current) break;
    current = next;
  }
  return current;
}

function toArquivosPath(path: string): string {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/^\/uploads\//i, '/arquivos/');
}

/** `http://host/arquivos/...` e o caminho antigo `uploads/...` viram `/arquivos/...`. */
export function normalizeDocumentImageUrls(html: string): string {
  if (!html) return html;
  return html.replace(
    /(<img\b[^>]*?\bsrc\s*=\s*["'])(?:(?:https?:)?\/\/[^/"']+)?(\/?(?:arquivos|uploads)\/[^"']+)(["'])/gi,
    (_match, prefix: string, path: string, suffix: string) => `${prefix}${toArquivosPath(path)}${suffix}`
  );
}

export function prepareDocumentEditorHtml(html: string): string {
  if (!html) return '';
  const withoutBlob = html.replace(/<img[^>]*src=["']blob:[^"']*["'][^>]*>/gi, '');
  return normalizeDocumentImageUrls(decodeEscapedDocumentHtml(withoutBlob));
}
