import { API_CONFIG } from '../config/api';

function absoluteWebhookPath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_CONFIG.WEBHOOK_BASE_URL;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

/** Ex: https://dominio.com/webhook/efi/42 */
export function buildWebhookUrlErp(
  tipo: 'efi' | 'asaas',
  bancoId?: number | null
): string {
  const suffix = bancoId != null ? `/${bancoId}` : '';
  return absoluteWebhookPath(`/webhook/${tipo}${suffix}`);
}

/** Ex: https://dominio.com/webhook/efi/saas */
export function buildWebhookUrlSaas(tipo: 'efi' | 'asaas'): string {
  return absoluteWebhookPath(`/webhook/${tipo}/saas`);
}
