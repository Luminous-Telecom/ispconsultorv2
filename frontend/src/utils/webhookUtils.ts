import { API_CONFIG } from '../config/api';
import { slugify } from './stringUtils';

/**
 * Gera URL de callback webhook para ERP (com razão social na URL).
 * Ex: https://dominio.com/webhook/efi/minha-empresa-isp
 */
export function buildWebhookUrlErp(
  tipo: 'efi' | 'asaas',
  razaoSocial?: string | null,
  nomeFantasia?: string | null
): string {
  const base = API_CONFIG.WEBHOOK_BASE_URL;
  if (!base) return `/webhook/${tipo}`;
  const slug = slugify(String(razaoSocial || nomeFantasia || 'empresa').trim());
  const ident = slug || 'erp';
  return `${base}/webhook/${tipo}/${ident}`;
}

/**
 * Gera URL de callback webhook para SaaS.
 * Ex: https://dominio.com/webhook/efi/saas
 */
export function buildWebhookUrlSaas(tipo: 'efi' | 'asaas'): string {
  const base = API_CONFIG.WEBHOOK_BASE_URL;
  if (!base) return `/webhook/${tipo}/saas`;
  return `${base}/webhook/${tipo}/saas`;
}
