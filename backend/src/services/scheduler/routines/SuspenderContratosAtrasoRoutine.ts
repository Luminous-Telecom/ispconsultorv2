import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import type { JsonValue } from '../../../types/index';
import Parametros from '../../../models/sistema/Parametros';
import { Contrato } from '../../../models/contratos/Contrato';
import { Titulo } from '../../../models/financeiro/Titulo';

/**
 * Rotina ERP (alvo erp_global): suspende contratos ativos com parcela em atraso
 * conforme `dias_suspender_atraso` em Parâmetros → Recursos do Sistema (por tenant).
 * 0 ou null = desabilitado para aquele tenant.
 */
export class SuspenderContratosAtrasoRoutine implements IRoutine {
  async execute(_config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    try {
      const configs = await Parametros.findAll({
        where: {
          dias_suspender_atraso: { [Op.gt]: 0 },
        },
        attributes: ['id', 'empresa_id', 'dias_suspender_atraso'],
      });

      if (configs.length === 0) {
        return {
          success: true,
          message: 'Suspensão por atraso desabilitada (nenhum tenant com dias_suspender_atraso configurado)',
          data: { contratosSuspensos: 0, tenantsProcessados: 0 },
        };
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let totalSuspensos = 0;
      let tenantsProcessados = 0;

      for (const config of configs) {
        const diasLimite = config.dias_suspender_atraso;
        if (diasLimite == null || diasLimite <= 0) continue;

        const dataLimite = new Date(hoje);
        dataLimite.setDate(dataLimite.getDate() - diasLimite);

        const whereTitulo: Record<string, unknown> = {
          pago: false,
          status: { [Op.in]: ['pendente', 'vencido'] },
          data_vencimento: { [Op.lte]: dataLimite },
          contrato_id: { [Op.ne]: null },
        };
        if (config.empresa_id != null) {
          whereTitulo.empresa_id = config.empresa_id;
        }

        const titulosAtraso = await Titulo.findAll({
          where: whereTitulo,
          attributes: ['contrato_id', 'data_vencimento'],
        });

        const contratoIds = new Set<number>();
        for (const t of titulosAtraso) {
          const contratoId = t.contrato_id;
          if (contratoId == null) continue;
          const venc = new Date(t.data_vencimento);
          venc.setHours(0, 0, 0, 0);
          const diasAtraso = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          if (diasAtraso >= diasLimite) {
            contratoIds.add(contratoId);
          }
        }

        if (contratoIds.size === 0) {
          tenantsProcessados++;
          continue;
        }

        const whereContrato: Record<string, unknown> = {
          id: { [Op.in]: Array.from(contratoIds) },
          status: 'ativo',
        };
        if (config.empresa_id != null) {
          whereContrato.empresa_id = config.empresa_id;
        }

        const [updated] = await Contrato.update({ status: 'suspenso' }, { where: whereContrato });

        totalSuspensos += updated;
        tenantsProcessados++;

        logger.info('SuspenderContratosAtrasoRoutine - tenant processado', {
          empresa_id: config.empresa_id,
          dias_limite: diasLimite,
          candidatos: contratoIds.size,
          suspensos: updated,
        });
      }

      return {
        success: true,
        message: `Rotina concluída. ${totalSuspensos} contrato(s) suspenso(s) em ${tenantsProcessados} tenant(s).`,
        data: { contratosSuspensos: totalSuspensos, tenantsProcessados },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('SuspenderContratosAtrasoRoutine - Erro', { error: msg });
      return {
        success: false,
        message: `Erro na rotina: ${msg}`,
        data: { contratosSuspensos: 0, tenantsProcessados: 0 },
      };
    }
  }
}
