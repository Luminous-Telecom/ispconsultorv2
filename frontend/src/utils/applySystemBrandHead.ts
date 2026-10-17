import { COLOR, readCssColor } from '../constants/colors';
import { SYSTEM_NAME, SYSTEM_TAGLINE } from '../constants/systemBrand';
import { ispConsultorIcon } from '../constants/systemBrandAssets';

function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function setLink(rel: string, href: string, sizes?: string): void {
  const selector = sizes
    ? `link[rel="${rel}"][sizes="${sizes}"]`
    : `link[rel="${rel}"]`;
  let link = document.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    if (sizes) {
      link.sizes = sizes;
    }
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = href;
}

/** Favicon, apple-touch-icon e manifest PWA a partir dos assets (webpack). */
export function applySystemBrandHead(): void {
  const iconUrl = toAbsoluteUrl(ispConsultorIcon);
  const appUrl = toAbsoluteUrl('/adm');
  const scopeUrl = toAbsoluteUrl('/');

  setLink('icon', iconUrl);
  setLink('icon', iconUrl, '512x512');
  setLink('icon', iconUrl, '32x32');
  setLink('icon', iconUrl, '16x16');
  ['180x180', '152x152', '120x120'].forEach((size) => {
    setLink('apple-touch-icon', iconUrl, size);
  });

  document.querySelectorAll('link[rel="manifest"]').forEach((el) => el.remove());

  const manifest = {
    name: SYSTEM_NAME,
    short_name: SYSTEM_NAME,
    description: SYSTEM_TAGLINE,
    display: 'standalone',
    background_color: readCssColor(COLOR.white),
    theme_color: readCssColor(COLOR.indigo),
    orientation: 'portrait-primary',
    start_url: appUrl,
    scope: scopeUrl,
    lang: 'pt-BR',
    categories: ['business', 'productivity'],
    icons: [
      { src: iconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: iconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Acesse o painel principal',
        url: appUrl,
        icons: [{ src: iconUrl, sizes: '192x192' }],
      },
    ],
  };

  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
  );
  document.head.appendChild(manifestLink);
}
