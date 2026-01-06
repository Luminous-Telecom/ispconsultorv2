import { Op } from 'sequelize';
import { Titulo } from '../../../models/Titulo';
import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import { JsonValue } from '../../../types/index';

export class VerificarVencimentosRoutine implements IRoutine {
  async execute(_config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    try {
      logger.info('Iniciando rotina de verificação de vencimentos');

      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999); // Final do dia

      // Buscar títulos pendentes que venceram
      const titulosVencidos = await Titulo.findAll({
        where: {
          data_vencimento: {
            [Op.lt]: hoje
          },
          status: 'pendente'
        },
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] }
        ]
      });

      logger.info(`Encontrados ${titulosVencidos.length} títulos vencidos para processar`);

      let titulosMarcadosVencidos = 0;
      let titulosAtualizados = 0;

      // Processar cada título vencido
      for (const titulo of titulosVencidos) {
        try {
          // Marcar como vencido
          await titulo.marcarComoVencida();
          titulosMarcadosVencidos++;

          // Usar dados já carregados via include (otimização N+1)
          const tituloComRelacoes = titulo as unknown as { cliente?: { razao_social?: string }; plano?: { nome_plano?: string } };
          logger.info('Título marcado como vencido', {
            titulo_id: titulo.id,
            numero_titulo: titulo.numero_titulo,
            data_vencimento: titulo.data_vencimento,
            cliente: tituloComRelacoes.cliente?.razao_social || 'N/A',
            plano: tituloComRelacoes.plano?.nome_plano || 'N/A'
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao marcar título como vencido', {
            titulo_id: titulo.id,
            error: errorMessage
          });
        }
      }

      // Buscar títulos que podem ter mudado de status
      const titulosParaVerificar = await Titulo.findAll({
        where: {
          status: ['pendente', 'vencido']
        },
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] }
        ]
      });

      // Verificar se algum título pendente ainda não venceu
      for (const titulo of titulosParaVerificar) {
        const dataVencimento = new Date(titulo.data_vencimento);
        const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const dataVencimentoSemHora = new Date(dataVencimento.getFullYear(), dataVencimento.getMonth(), dataVencimento.getDate());

        // Se o título está como vencido mas ainda não venceu, voltar para pendente
        if (titulo.status === 'vencido' && dataVencimentoSemHora > hojeSemHora) {
          await titulo.update({ status: 'pendente' });
          titulosAtualizados++;

          logger.info('Título voltou para pendente (ainda não venceu)', {
            titulo_id: titulo.id,
            numero_titulo: titulo.numero_titulo,
            data_vencimento: titulo.data_vencimento
          });
        }
      }

      const resultado = {
        titulosVerificados: titulosParaVerificar.length,
        titulosMarcadosVencidos,
        titulosAtualizados
      };

      logger.info('Rotina de verificação de vencimentos concluída', resultado);

      return {
        success: true,
        message: `Rotina executada com sucesso. ${titulosMarcadosVencidos} títulos marcados como vencidos, ${titulosAtualizados} títulos atualizados.`,
        data: {
          titulosVerificados: resultado.titulosVerificados,
          titulosMarcadosVencidos: resultado.titulosMarcadosVencidos,
          titulosAtualizados: resultado.titulosAtualizados
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro na rotina de verificação de vencimentos', {
        error: errorMessage,
        stack: errorStack
      });

      return {
        success: false,
        message: `Erro na rotina: ${errorMessage}`,
        data: {
          titulosVerificados: 0,
          titulosMarcadosVencidos: 0,
          titulosAtualizados: 0
        }
      };
    }
  }
}

