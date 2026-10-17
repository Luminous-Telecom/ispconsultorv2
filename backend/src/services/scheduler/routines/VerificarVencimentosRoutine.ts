import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import { JsonValue } from '../../../types/index';

export class VerificarVencimentosRoutine implements IRoutine {
  async execute(_config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    try {
      logger.info('Iniciando rotina de verificação de vencimentos');

      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);

      const titulosVencidos = await prisma.financeiro_titulos.findMany({
        where: { data_vencimento: { lt: hoje }, status: 'pendente' },
        include: {
          clientes: { select: { id: true, razao_social: true } },
          cadastros_planos: { select: { id: true, nome_plano: true } },
        },
      });

      logger.info(`Encontrados ${titulosVencidos.length} títulos vencidos para processar`);

      let titulosMarcadosVencidos = 0;
      let titulosAtualizados = 0;

      for (const titulo of titulosVencidos) {
        try {
          if (titulo.status === 'pendente') {
            await prisma.financeiro_titulos.update({
              where: { id: titulo.id },
              data: { status: 'vencido' },
            });
          }
          titulosMarcadosVencidos++;
          logger.info('Título marcado como vencido', {
            titulo_id: titulo.id,
            numero_titulo: titulo.numero_titulo,
            data_vencimento: titulo.data_vencimento,
            cliente: titulo.clientes?.razao_social || 'N/A',
            plano: titulo.cadastros_planos?.nome_plano || 'N/A',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao marcar título como vencido', { titulo_id: titulo.id, error: errorMessage });
        }
      }

      const titulosParaVerificar = await prisma.financeiro_titulos.findMany({
        where: { status: { in: ['pendente', 'vencido'] } },
      });

      for (const titulo of titulosParaVerificar) {
        const dataVencimento = new Date(titulo.data_vencimento);
        const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const dataVencimentoSemHora = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth(), dataVencimento.getDate());
        if (titulo.status === 'vencido' && dataVencimentoSemHora > hojeSemHora) {
          await prisma.financeiro_titulos.update({
            where: { id: titulo.id },
            data: { status: 'pendente' },
          });
          titulosAtualizados++;
        }
      }

      return {
        success: true,
        message: `Rotina executada com sucesso. ${titulosMarcadosVencidos} títulos marcados como vencidos, ${titulosAtualizados} títulos atualizados.`,
        data: {
          titulosVerificados: titulosParaVerificar.length,
          titulosMarcadosVencidos,
          titulosAtualizados,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro na rotina de verificação de vencimentos', { error: errorMessage });
      return {
        success: false,
        message: `Erro na rotina: ${errorMessage}`,
        data: { titulosVerificados: 0, titulosMarcadosVencidos: 0, titulosAtualizados: 0 },
      };
    }
  }
}
