import { Contrato } from '../../../models/contratos/Contrato';
import { ContratoIntegracaoIxcVinculo } from '../../../models/contratos/ContratoIntegracaoIxcVinculo';
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
    const contrato = await Contrato.findByPk(contratoId);
    if (!contrato) {
      return { integracoes: [] };
    }

    const integracoes = await contrato.getIntegracaoIxcProvedores({
      order: [['nome', 'ASC']],
    });

    return {
      integracoes: integracoes.map((integracao) => {
        const json = integracao.toJSON() as Record<string, unknown>;
        return {
          id: Number(json.id),
          nome: String(json.nome ?? ''),
          api_url: (json.api_url as string | null | undefined) ?? null,
          ativo: !!json.ativo,
          has_api_token: !!json.has_api_token,
        };
      }),
    };
  }

  static async link(
    contratoId: number,
    integracaoIxcProvedorId: number,
    empresaId: number | null
  ): Promise<ContratoIntegracaoIxcResponse> {
    const contrato = await Contrato.findByPk(contratoId);
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

    const existing = await ContratoIntegracaoIxcVinculo.findOne({
      where: {
        contrato_id: contratoId,
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
      },
    });

    if (!existing) {
      await ContratoIntegracaoIxcVinculo.create({
        empresa_id: contrato.empresa_id ?? empresaId,
        contrato_id: contratoId,
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
      });
    }

    return ContratoIntegracaoIxcService.listByContrato(contratoId);
  }

  static async unlink(
    contratoId: number,
    integracaoIxcProvedorId: number,
    empresaId: number | null
  ): Promise<ContratoIntegracaoIxcResponse> {
    const contrato = await Contrato.findByPk(contratoId);
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }

    if (empresaId !== null && contrato.empresa_id !== empresaId) {
      throw new Error('Contrato não encontrado');
    }

    await ContratoIntegracaoIxcVinculo.destroy({
      where: {
        contrato_id: contratoId,
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
      },
    });

    return ContratoIntegracaoIxcService.listByContrato(contratoId);
  }
}
