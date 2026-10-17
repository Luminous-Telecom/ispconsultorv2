import { logger } from '../../../utils/logger';
import type { MetaTemplateComponentRaw, MetaTemplateStructure } from './types';
import { parseMetaTemplateStructure } from './parseMetaTemplateStructure';

const langNorm = (l: string) => (l || '').toLowerCase().replace(/-/g, '_');

async function resolveWabaId(servidor: {
  whatsapp_cloud_token?: string | null;
  whatsapp_cloud_business_account_id?: string | null;
  whatsapp_cloud_phone_number_id?: string | null;
}): Promise<string | null> {
  if (servidor.whatsapp_cloud_business_account_id) {
    return servidor.whatsapp_cloud_business_account_id;
  }
  if (!servidor.whatsapp_cloud_token || !servidor.whatsapp_cloud_phone_number_id) {
    return null;
  }
  const phoneRes = await fetch(
    `https://graph.facebook.com/v18.0/${servidor.whatsapp_cloud_phone_number_id}?fields=whatsapp_business_account`,
    { headers: { Authorization: `Bearer ${servidor.whatsapp_cloud_token}` } }
  );
  const phoneData = await phoneRes.json().catch(() => ({}));
  return (phoneData as { whatsapp_business_account?: { id?: string } })?.whatsapp_business_account?.id ?? null;
}

export async function fetchMetaTemplateStructure(
  servidor: {
    whatsapp_cloud_token?: string | null;
    whatsapp_cloud_business_account_id?: string | null;
    whatsapp_cloud_phone_number_id?: string | null;
  },
  templateName: string,
  language: string
): Promise<MetaTemplateStructure | null> {
  try {
    if (!servidor.whatsapp_cloud_token) return null;

    const wabaId = await resolveWabaId(servidor);
    if (!wabaId) return null;

    const templateQuery = new URLSearchParams({
      name: templateName,
      fields: 'name,language,components,status',
      limit: '20',
    });

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${wabaId}/message_templates?${templateQuery.toString()}`,
      { headers: { Authorization: `Bearer ${servidor.whatsapp_cloud_token}` } }
    );
    const data = await res.json().catch(() => ({}));
    const templates = (data as {
      data?: Array<{ name?: string; language?: string; components?: MetaTemplateComponentRaw[] }>;
    })?.data ?? [];

    const template = templates.find(
      (t) => t.name === templateName && langNorm(t.language || '') === langNorm(language || 'pt_BR')
    );

    if (!template) {
      logger.info('[Meta Template] Template não encontrado na Meta', {
        templateName,
        language,
        total: templates.length,
      });
      return null;
    }

    const structure = parseMetaTemplateStructure({
      name: template.name || templateName,
      language: template.language || language,
      components: template.components,
    });

    logger.info('[Meta Template] Estrutura parseada', {
      template: structure.name,
      language: structure.language,
      bodyParamCount: structure.bodyParamCount,
      headerFormat: structure.header?.format ?? null,
      buttons: structure.buttons.map((b) => `${b.type}@${b.index}${b.requiresParameter ? '*' : ''}`).join(', ') || 'nenhum',
      requiresStructuredButtons: structure.requiresStructuredButtons,
    });

    return structure;
  } catch (error) {
    logger.error('[Meta Template] Erro ao buscar estrutura', {
      templateName,
      language,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
