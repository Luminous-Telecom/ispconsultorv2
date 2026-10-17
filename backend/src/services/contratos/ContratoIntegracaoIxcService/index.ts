import { prisma } from '../../../db/prisma';
import { IntegracaoIxcProvedorService } from '../../integracao/IntegracaoIxcProvedorService';

export interface ContratoIntegracaoIxcItem {
  id: number;
  nome: string;
  api_url: string | null;
  ativo: boolean;
  has_api_token?: boolean;
}

export interface ContratoIntegracaoIxcResponse {
  integracoes: ContratoIntegracaoIxcItem[];
}

export class ContratoIntegracaoIxcService {
  static async listByContrato(contratoId: number): Promise<ContratoIntegracaoIxcResponse> {
    const contrato = await prisma.contratos.findUnique({
      where: { id: contratoId },
      select: { id: true },
    });
    if (!contrato) {
      return { integracoes: [] };
    }

    const vinculos = await prisma.contratos_integracao_ixc_vinculos.findMany({
      where: { contrato_id: contratoId },
      include: { integracao_ixc_provedor: true },
      orderBy: { integracao_ixc_provedor: { nome: 'asc' } },
    });

    return {
      integracoes: vinculos.map((vinculo) => {
        const integracao = vinculo.integracao_ixc_provedor;
        return {
          id: integracao.id,
          nome: integracao.nome ?? '',
          api_url: integracao.api_url ?? null,
          ativo: !!integracao.ativo,
          has_api_token: !!integracao.api_token,
        };
      }),
    };
  }

  static async link(
    contratoId: number,
    integracaoIxcProvedorId: number,
    empresaId: number | null
  ): Promise<ContratoIntegracaoIxcResponse> {
    const contrato = await prisma.contratos.findUnique({ where: { id: contratoId } });
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }

    const integracao = await IntegracaoIxcProvedorService.assertEmpresaAccess(
      integracaoIxcProvedorId,
      empresaId
    );
    if (!integracao) {
      throw new Error('Integração IXC Provedor não encontrada');
    }

    const existing = await prisma.contratos_integracao_ixc_vinculos.findFirst({
      where: {
        contrato_id: contratoId,
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
      },
    });

    if (!existing) {
      await prisma.contratos_integracao_ixc_vinculos.create({
        data: {
          empresa_id: contrato.empresa_id ?? empresaId,
          contrato_id: contratoId,
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
        },
      });
    }

    return ContratoIntegracaoIxcService.listByContrato(contratoId);
  }

  static async unlink(
    contratoId: number,
    integracaoIxcProvedorId: number,
    empresaId: number | null
  ): Promise<ContratoIntegracaoIxcResponse> {
    const contrato = await prisma.contratos.findUnique({ where: { id: contratoId } });
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }

    if (empresaId !== null && contrato.empresa_id !== empresaId) {
      throw new Error('Contrato não encontrado');
    }

    await prisma.contratos_integracao_ixc_vinculos.deleteMany({
      where: {
        contrato_id: contratoId,
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
      },
    });

    return ContratoIntegracaoIxcService.listByContrato(contratoId);
  }
}
