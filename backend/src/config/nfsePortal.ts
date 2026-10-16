export type AmbientePortalNacional = 'HOMOLOGACAO' | 'PRODUCAO';

const VAR_HOMOLOGACAO = 'NFSE_SEFIN_URL_HOMOLOGACAO';
const VAR_PRODUCAO = 'NFSE_SEFIN_URL_PRODUCAO';

/**
 * URL base da API Sefin Nacional (sem barra final).
 * Homologação e produção ficam no .env — a nota de homologação não tem valor fiscal.
 */
export function getSefinBaseUrl(ambiente: AmbientePortalNacional): string {
  const nome = ambiente === 'PRODUCAO' ? VAR_PRODUCAO : VAR_HOMOLOGACAO;
  const url = (process.env[nome] || '').trim().replace(/\/+$/, '');
  if (!url) {
    throw new Error(`Defina ${nome} no .env do backend.`);
  }
  return url;
}
