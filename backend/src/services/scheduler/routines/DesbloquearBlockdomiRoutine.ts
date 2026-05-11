import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import type { JsonValue } from '../../../types/index';
import { registrarAtualizacaoSistema } from '../../sistema/AuditoriaService';

/**
 * Rotina que inativa domínios, IPv4 e IPv6 do blockdomi cuja data_fim_bloqueio
 * é menor ou igual a hoje. Registra cada atualização na auditoria (banco e Elasticsearch).
 */
export class DesbloquearBlockdomiRoutine implements IRoutine {
  async execute(config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    try {
      const hoje = new Date();
      const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

      const { Dominio } = await import('../../../models/blockdomi/Dominio');
      const { IPv4 } = await import('../../../models/blockdomi/IPv4');
      const { IPv6 } = await import('../../../models/blockdomi/IPv6');

      const empresaId = config.empresa_id as number | null | undefined;
      const whereDataFimPassada: Record<string, unknown> = {
        data_fim_bloqueio: { [Op.and]: [{ [Op.ne]: null }, { [Op.lte]: hojeStr }] },
        ativo: true
      };
      if (empresaId != null) {
        whereDataFimPassada.empresa_id = empresaId;
      }

      const [dominios, ipv4List, ipv6List] = await Promise.all([
        Dominio.findAll({ where: whereDataFimPassada }),
        IPv4.findAll({ where: whereDataFimPassada }),
        IPv6.findAll({ where: whereDataFimPassada })
      ]);

      const observacao = 'Desbloqueio automático por data fim de bloqueio (rotina agendada)';

      for (const record of dominios) {
        const dadosAnteriores = record.get({ plain: true }) as Record<string, unknown>;
        await record.update({ ativo: false });
        const dadosNovos = { ...dadosAnteriores, ativo: false };
        await registrarAtualizacaoSistema(
          'Dominio',
          record.id,
          dadosAnteriores,
          dadosNovos,
          observacao,
          record.empresa_id ?? null
        );
      }
      for (const record of ipv4List) {
        const dadosAnteriores = record.get({ plain: true }) as Record<string, unknown>;
        await record.update({ ativo: false });
        const dadosNovos = { ...dadosAnteriores, ativo: false };
        await registrarAtualizacaoSistema(
          'IPv4',
          record.id,
          dadosAnteriores,
          dadosNovos,
          observacao,
          record.empresa_id ?? null
        );
      }
      for (const record of ipv6List) {
        const dadosAnteriores = record.get({ plain: true }) as Record<string, unknown>;
        await record.update({ ativo: false });
        const dadosNovos = { ...dadosAnteriores, ativo: false };
        await registrarAtualizacaoSistema(
          'IPv6',
          record.id,
          dadosAnteriores,
          dadosNovos,
          observacao,
          record.empresa_id ?? null
        );
      }

      const countDominios = dominios.length;
      const countIPv4 = ipv4List.length;
      const countIPv6 = ipv6List.length;
      const total = countDominios + countIPv4 + countIPv6;

      return {
        success: true,
        message: `Desbloqueio concluído. ${countDominios} domínio(s), ${countIPv4} IPv4 e ${countIPv6} IPv6 inativados por data fim de bloqueio.`,
        data: {
          dominios_inativados: countDominios,
          ipv4_inativados: countIPv4,
          ipv6_inativados: countIPv6,
          total
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Erro na rotina de desbloqueio blockdomi', {
        error: errorMessage,
        stack: errorStack
      });

      return {
        success: false,
        message: `Erro na rotina: ${errorMessage}`,
        data: {
          dominios_inativados: 0,
          ipv4_inativados: 0,
          ipv6_inativados: 0,
          total: 0
        }
      };
    }
  }
}
