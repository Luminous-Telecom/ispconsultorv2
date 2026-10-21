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

/** `http://host/arquivos/...` vira `/arquivos/...` para carregar no mesmo origem (HTTPS). */
export function normalizeDocumentImageUrls(html: string): string {
  if (!html) return html;
  return html.replace(
    /(<img\b[^>]*?\bsrc\s*=\s*["'])(?:https?:)?\/\/[^/"']+(\/arquivos\/[^"']+)(["'])/gi,
    '$1$2$3'
  );
}

export function prepareDocumentEditorHtml(html: string): string {
  if (!html) return '';
  const withoutBlob = html.replace(/<img[^>]*src=["']blob:[^"']*["'][^>]*>/gi, '');
  return normalizeDocumentImageUrls(decodeEscapedDocumentHtml(withoutBlob));
}
