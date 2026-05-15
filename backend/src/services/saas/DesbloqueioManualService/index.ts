import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import SaasParametros from '../../../models/saas/SaasParametros';
import { cache } from '../../../utils/cache';

export interface DesbloqueioManualResult {
  success: boolean;
  message: string;
  data?: { data_fim_desbloqueio_manual: string };
}

/**
 * Desbloqueia manualmente um tenant bloqueado por atraso.
 * Define data_fim_desbloqueio_manual = hoje + dias_desbloqueio_manual.
 */
export class DesbloqueioManualService {
  static async desbloquear(empresaId: number): Promise<DesbloqueioManualResult> {
    const empresa = await DadosEmpresa.findByPk(empresaId, {
      attributes: ['id', 'bloqueado_por_atraso', 'razao_social', 'nome_fantasia'],
    });

    if (!empresa) {
      return { success: false, message: 'Empresa não encontrada' };
    }

    if (!empresa.bloqueado_por_atraso) {
      return { success: false, message: 'Empresa não está bloqueada por atraso' };
    }

    const parametros = await SaasParametros.findOne({
      attributes: ['dias_desbloqueio_manual'],
    });

    const dias = parametros?.dias_desbloqueio_manual ?? null;
    if (dias == null || dias <= 0) {
      return {
        success: false,
        message: 'Configure "Dias para desbloqueio manual" em Parâmetros > Recursos do Sistema',
      };
    }

    const hoje = new Date();
    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + dias);
    const dataFimStr = dataFim.toISOString().slice(0, 10);

    await DadosEmpresa.update(
      { bloqueado_por_atraso: false, data_fim_desbloqueio_manual: dataFimStr },
      { where: { id: empresaId } }
    );
    cache.delete(`dados_empresa:config:${empresaId}`);
    cache.delete('dados_empresa:config');

    return {
      success: true,
      message: `Empresa desbloqueada. Prazo para regularizar: ${dias} dias (até ${dataFimStr})`,
      data: { data_fim_desbloqueio_manual: dataFimStr },
    };
  }
}
