import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import type { JsonValue } from '../../../types/index';

export class SuspenderContratosAtrasoRoutine implements IRoutine {
  async execute(_config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    try {
      const configs = await prisma.sistema_parametros.findMany({
        where: { dias_suspender_atraso: { gt: 0 } },
        select: { id: true, empresa_id: true, dias_suspender_atraso: true },
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

        const titulosAtraso = await prisma.financeiro_titulos.findMany({
          where: {
            pago: false,
            status: { in: ['pendente', 'vencido'] },
            data_vencimento: { lte: dataLimite },
            contrato_id: { not: null },
            ...(config.empresa_id != null ? { empresa_id: config.empresa_id } : {}),
          },
          select: { contrato_id: true, data_vencimento: true },
        });

        const contratoIds = new Set<number>();
        for (const t of titulosAtraso) {
          if (t.contrato_id == null) continue;
          const venc = new Date(t.data_vencimento);
          venc.setHours(0, 0, 0, 0);
          const diasAtraso = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
          if (diasAtraso >= diasLimite) contratoIds.add(t.contrato_id);
        }

        if (contratoIds.size === 0) {
          tenantsProcessados++;
          continue;
        }

        const updated = await prisma.contratos.updateMany({
          where: {
            id: { in: Array.from(contratoIds) },
            status: 'ativo',
            ...(config.empresa_id != null ? { empresa_id: config.empresa_id } : {}),
          },
          data: { status: 'suspenso' },
        });
        totalSuspensos += updated.count;
        tenantsProcessados++;
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
