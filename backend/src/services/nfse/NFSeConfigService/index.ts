import type { Prisma, nfse_config } from '@prisma/client';
import { prisma } from '../../../db/prisma';

const DEFAULT_NFSE = {
  codigo_servico_municipal: null,
  aliquota_iss: 0,
  descricao_servico: null,
  serie_nf: '80000',
  numero_dps: 1,
  portal_nacional_username: null,
  portal_nacional_password: null,
  portal_nacional_base_url: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
  portal_nacional_ambiente: 'HOMOLOGACAO' as const,
  asaas_api_key: null,
  asaas_sandbox: false,
  provider: 'PORTAL_NACIONAL' as const,
  op_simples_nacional: 1,
  regime_especial_tributacao: 0,
  regime_apuracao_sn: null,
  tp_ret_issqn: 1,
};

function whereEmpresa(empresaId?: number | null): Prisma.nfse_configWhereInput {
  if (empresaId == null) return {};
  return { OR: [{ empresa_id: empresaId }, { empresa_id: null }] };
}

export class NFSeConfigService {
  static async get(empresaId?: number | null): Promise<nfse_config | null> {
    return prisma.nfse_config.findFirst({
      where: whereEmpresa(empresaId),
      orderBy: { id: 'asc' },
    });
  }

  static getConfig = NFSeConfigService.get;

  static async update(
    dados: Prisma.nfse_configUpdateInput,
    empresaId?: number | null
  ): Promise<nfse_config> {
    const existing = await prisma.nfse_config.findFirst({
      where: whereEmpresa(empresaId),
      orderBy: { id: 'asc' },
    });

    if (!existing) {
      return prisma.nfse_config.create({
        data: {
          ...DEFAULT_NFSE,
          ...(dados as Prisma.nfse_configUncheckedCreateInput),
          empresa_id: (dados as { empresa_id?: number | null }).empresa_id ?? empresaId ?? null,
        },
      });
    }

    return prisma.nfse_config.update({
      where: { id: existing.id },
      data: { ...dados, updated_at: new Date() },
    });
  }
}
