import { Titulo } from '../../models/Titulo';
import { logger } from '../../utils/logger';

export interface VerificarVencimentosConfig {
  // Configurações futuras se necessário
}

export class VerificarVencimentosRoutine {
  async execute(config: VerificarVencimentosConfig): Promise<{
    success: boolean;
    message: string;
    data: {
      titulosVerificados: number;
      titulosMarcadosVencidos: number;
      titulosAtualizados: number;
    };
  }> {
    try {
      logger.info('Iniciando rotina de verificação de vencimentos');

      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999); // Final do dia

      // Buscar títulos pendentes que venceram
      const titulosVencidos = await Titulo.findAll({
        where: {
          data_vencimento: {
            [require('sequelize').Op.lt]: hoje
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

          logger.info('Título marcado como vencido', {
            titulo_id: titulo.id,
            numero_titulo: titulo.numero_titulo,
            data_vencimento: titulo.data_vencimento,
            cliente: titulo.getCliente ? (await titulo.getCliente())?.razao_social : 'N/A',
            plano: titulo.getPlano ? (await titulo.getPlano())?.nome_plano : 'N/A'
          });

        } catch (error: any) {
          logger.error('Erro ao marcar título como vencido', {
            titulo_id: titulo.id,
            error: error.message
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
        data: resultado
      };

    } catch (error: any) {
      logger.error('Erro na rotina de verificação de vencimentos', {
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        message: `Erro na rotina: ${error.message}`,
        data: {
          titulosVerificados: 0,
          titulosMarcadosVencidos: 0,
          titulosAtualizados: 0
        }
      };
    }
  }
}

