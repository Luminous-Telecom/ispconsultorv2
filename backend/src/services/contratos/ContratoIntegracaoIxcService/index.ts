import { Contrato } from '../../../models/contratos/Contrato';
import { IntegracaoIxcProvedorService } from '../../integracao/IntegracaoIxcProvedorService';

export interface ContratoIntegracaoIxcLink {
  integracao_ixc_provedor_id: number | null;
  integracao?: Record<string, unknown> | null;
}

export class ContratoIntegracaoIxcService {
  static async getByContrato(contratoId: number): Promise<ContratoIntegracaoIxcLink> {
    const contrato = await Contrato.findByPk(contratoId, {
      include: [{ association: 'integracaoIxcProvedor', required: false }],
    });

    if (!contrato) {
      return { integracao_ixc_provedor_id: null, integracao: null };
    }

    const integracao = await contrato.getIntegracaoIxcProvedor();

    return {
      integracao_ixc_provedor_id: contrato.integracao_ixc_provedor_id ?? null,
      integracao: integracao ? integracao.toJSON() : null,
    };
  }

  static async link(
    contratoId: number,
    integracaoIxcProvedorId: number | null,
    empresaId: number | null
  ): Promise<ContratoIntegracaoIxcLink> {
    const contrato = await Contrato.findByPk(contratoId);
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }

    if (integracaoIxcProvedorId != null) {
      const integracao = await IntegracaoIxcProvedorService.assertEmpresaAccess(
        integracaoIxcProvedorId,
        empresaId
      );
      if (!integracao) {
        throw new Error('Integração IXC Provedor não encontrada');
      }
    }

    await contrato.update({ integracao_ixc_provedor_id: integracaoIxcProvedorId });
    return ContratoIntegracaoIxcService.getByContrato(contratoId);
  }
}
