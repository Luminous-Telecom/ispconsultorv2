import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import type { JsonValue } from '../../../types/index';
import { registrarAtualizacaoSistema } from '../../sistema/AuditoriaService';

export class DesbloquearBlockdomiRoutine implements IRoutine {
  async execute(config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    try {
      const hoje = new Date();
      const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      const empresaId = config.empresa_id as number | null | undefined;
      const where = {
        data_fim_bloqueio: { lte: new Date(`${hojeStr}T00:00:00.000Z`) },
        ativo: true,
        ...(empresaId != null ? { empresa_id: empresaId } : {}),
      };

      const [dominios, ipv4List, ipv6List] = await Promise.all([
        prisma.blockdomi_dominios.findMany({ where }),
        prisma.blockdomi_ipv4.findMany({ where }),
        prisma.blockdomi_ipv6.findMany({ where }),
      ]);

      const observacao = 'Desbloqueio automático por data fim de bloqueio (rotina agendada)';
      const inativar = async (
        entidade: 'Dominio' | 'IPv4' | 'IPv6',
        delegate: 'blockdomi_dominios' | 'blockdomi_ipv4' | 'blockdomi_ipv6',
        rows: Array<{ id: number; empresa_id: number | null }>
      ) => {
        for (const record of rows) {
          const client = prisma[delegate] as unknown as {
            findUnique(args: { where: { id: number } }): Promise<Record<string, unknown> | null>;
            update(args: { where: { id: number }; data: { ativo: boolean } }): Promise<unknown>;
          };
          const atual = await client.findUnique({ where: { id: record.id } });
          if (!atual) continue;
          const dadosAnteriores = { ...atual };
          await client.update({ where: { id: record.id }, data: { ativo: false } });
          await registrarAtualizacaoSistema(
            entidade,
            record.id,
            dadosAnteriores,
            { ...dadosAnteriores, ativo: false },
            observacao,
            record.empresa_id ?? null
          );
        }
      };

      await inativar('Dominio', 'blockdomi_dominios', dominios);
      await inativar('IPv4', 'blockdomi_ipv4', ipv4List);
      await inativar('IPv6', 'blockdomi_ipv6', ipv6List);

      const total = dominios.length + ipv4List.length + ipv6List.length;
      return {
        success: true,
        message: `Desbloqueio concluído. ${dominios.length} domínio(s), ${ipv4List.length} IPv4 e ${ipv6List.length} IPv6 inativados por data fim de bloqueio.`,
        data: {
          dominios_inativados: dominios.length,
          ipv4_inativados: ipv4List.length,
          ipv6_inativados: ipv6List.length,
          total,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro na rotina de desbloqueio blockdomi', { error: errorMessage });
      return {
        success: false,
        message: `Erro na rotina: ${errorMessage}`,
        data: { dominios_inativados: 0, ipv4_inativados: 0, ipv6_inativados: 0, total: 0 },
      };
    }
  }
}
