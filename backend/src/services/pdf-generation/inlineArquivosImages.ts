import fs from 'fs';
import path from 'path';
import { resolveArquivosPath } from '../../utils/pathUtils';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function storageRelative(pathname: string): string | null {
  const marked = pathname.match(/\/(?:arquivos|uploads)\/([^?#]+)/i);
  if (marked?.[1]) return marked[1];

  const bare = pathname.replace(/^\.?\//, '');
  const prefix = bare.match(/^(?:arquivos|uploads)\/([^?#]+)/i);
  return prefix?.[1] ?? null;
}

function arquivoPathFromSrc(src: string): string | null {
  let pathname = src.trim();
  if (!pathname || pathname.startsWith('data:')) return null;

  if (/^https?:\/\//i.test(pathname)) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }

  const relativeRaw = storageRelative(pathname);
  if (!relativeRaw) return null;

  const relative = decodeURIComponent(relativeRaw.split('?')[0].split('#')[0]);
  if (!relative || relative.includes('..')) return null;

  const parts = relative.split('/').filter(Boolean);
  const root = path.resolve(resolveArquivosPath());
  const absolute = path.resolve(resolveArquivosPath(...parts));
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) return null;
  return absolute;
}

/**
 * Embute imagens de `/arquivos/` no HTML do PDF.
 * Arquivo ausente ou URL externa permanece como está — a impressão não depende delas.
 */
export function inlineArquivosImages(html: string): string {
  if (!html) return html;

  return html.replace(
    /(<img\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi,
    (full, prefix: string, quote: string, src: string) => {
      const filePath = arquivoPathFromSrc(src);
      if (!filePath || !fs.existsSync(filePath)) return full;

      const mime = MIME_BY_EXT[path.extname(filePath).toLowerCase()];
      if (!mime) return full;

      const base64 = fs.readFileSync(filePath).toString('base64');
      return `${prefix}${quote}data:${mime};base64,${base64}${quote}`;
    }
  );
}
