/**
 * Converte um texto para slug URL-safe.
 * Ex: "Minha Empresa ISP" → "minha-empresa-isp"
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
