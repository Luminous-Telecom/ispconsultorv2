import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import type { JsonValue } from '../../../types/index';
import SaasParametros from '../../../models/saas/SaasParametros';
import SaasDadosEmpresa from '../../../models/saas/SaasDadosEmpresa';
import SaasTitulo from '../../../models/saas/SaasTitulo';

/**
 * Rotina SaaS que verifica faturas em atraso e bloqueia empresas
 * quando o número de dias configurado (dias_atraso_bloqueio) for atingido.
 * Também desbloqueia empresas cujas faturas foram pagas.
 * Respeita data_fim_desbloqueio_manual: empresas em desbloqueio manual não são
 * bloqueadas até que a data passe. Após a data, rebloqueia.
 */
export class BloquearSaasAtrasoRoutine implements IRoutine {
  async execute(_config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    try {
      const parametros = await SaasParametros.findOne();
      const diasLimite = parametros?.dias_atraso_bloqueio ?? null;

      if (diasLimite == null || diasLimite <= 0) {
        return {
          success: true,
          message: 'Bloqueio por atraso desabilitado (dias_atraso_bloqueio não configurado ou zero)',
          empresasBloqueadas: 0,
          empresasDesbloqueadas: 0
        };
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const dataLimite = new Date(hoje);
      dataLimite.setDate(dataLimite.getDate() - diasLimite);

      const titulosVencidosAtraso = await SaasTitulo.findAll({
        where: {
          pago: false,
          status: { [Op.in]: ['pendente', 'vencido'] },
          data_vencimento: { [Op.lte]: dataLimite }
        },
        attributes: ['id', 'empresa_id', 'data_vencimento', 'valor', 'numero_titulo', 'url_boleto']
      });

      const empresasComAtraso = new Map<number, { titulo_id: number; url_boleto: string | null; dias_atraso: number }>();
      for (const t of titulosVencidosAtraso) {
        const venc = new Date(t.data_vencimento);
        venc.setHours(0, 0, 0, 0);
        const diasAtraso = Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
        if (diasAtraso >= diasLimite) {
          const existente = empresasComAtraso.get(t.empresa_id);
          if (!existente || existente.dias_atraso < diasAtraso) {
            empresasComAtraso.set(t.empresa_id, {
              titulo_id: t.id,
              url_boleto: t.url_boleto ?? null,
              dias_atraso: diasAtraso
            });
          }
        }
      }

      const hojeStr = hoje.toISOString().slice(0, 10);

      const idsComAtraso = Array.from(empresasComAtraso.keys());
      const empresasComAtrasoData = idsComAtraso.length > 0
        ? await SaasDadosEmpresa.findAll({
            where: { id: { [Op.in]: idsComAtraso } },
            attributes: ['id', 'bloqueado_por_atraso', 'data_fim_desbloqueio_manual']
          })
        : [];
      const mapaEmpresas = new Map(empresasComAtrasoData.map(e => [e.id, e]));

      const empresasBloqueadas = await SaasDadosEmpresa.findAll({
        where: { bloqueado_por_atraso: true },
        attributes: ['id']
      });
      const idsBloqueados = new Set(empresasBloqueadas.map(e => e.id));

      let bloqueadas = 0;
      let desbloqueadas = 0;

      for (const [empresaId, _info] of empresasComAtraso) {
        const emp = mapaEmpresas.get(empresaId);
        const emDesbloqueioManual = emp?.data_fim_desbloqueio_manual && emp.data_fim_desbloqueio_manual >= hojeStr;
        if (emDesbloqueioManual) continue;

        if (!idsBloqueados.has(empresaId)) {
          await SaasDadosEmpresa.update(
            { bloqueado_por_atraso: true, data_fim_desbloqueio_manual: null },
            { where: { id: empresaId } }
          );
          bloqueadas++;
          logger.info('BloquearSaasAtrasoRoutine - Empresa bloqueada por atraso', {
            empresa_id: empresaId,
            dias_limite: diasLimite
          });
        } else if (emp?.data_fim_desbloqueio_manual && emp.data_fim_desbloqueio_manual < hojeStr) {
          await SaasDadosEmpresa.update(
            { data_fim_desbloqueio_manual: null },
            { where: { id: empresaId } }
          );
        }
      }

      const empresasSemAtraso = await SaasDadosEmpresa.findAll({
        where: {
          bloqueado_por_atraso: true,
          id: { [Op.notIn]: Array.from(empresasComAtraso.keys()) }
        },
        attributes: ['id', 'nome_empresa']
      });

      for (const emp of empresasSemAtraso) {
        const titulosAberto = await SaasTitulo.count({
          where: {
            empresa_id: emp.id,
            pago: false,
            status: { [Op.in]: ['pendente', 'vencido'] },
            data_vencimento: { [Op.lte]: dataLimite }
          }
        });
        if (titulosAberto === 0) {
          await SaasDadosEmpresa.update(
            { bloqueado_por_atraso: false },
            { where: { id: emp.id } }
          );
          desbloqueadas++;
          logger.info('BloquearSaasAtrasoRoutine - Empresa desbloqueada (sem faturas em atraso)', {
            empresa_id: emp.id,
            nome_empresa: emp.nome_empresa
          });
        }
      }

      return {
        success: true,
        message: `Rotina concluída. ${bloqueadas} empresa(s) bloqueada(s), ${desbloqueadas} empresa(s) desbloqueada(s).`,
        empresasBloqueadas: bloqueadas,
        empresasDesbloqueadas: desbloqueadas
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('BloquearSaasAtrasoRoutine - Erro', { error: msg });
      return {
        success: false,
        message: `Erro na rotina: ${msg}`,
        empresasBloqueadas: 0,
        empresasDesbloqueadas: 0
      };
    }
  }
}
