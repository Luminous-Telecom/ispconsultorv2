import { Op } from 'sequelize';
import { logger } from '../../../../utils/logger';

export class ContratoDataLoader {
  /**
   * Busca todos os dados relacionados aos contratos de uma vez (otimização N+1)
   */
  static async loadRelatedData(contratoIds: number[], diaVencimentoIds: number[]) {
    const { Titulo } = await import('../../../../models/financeiro/Titulo');
    const { DiasVencimento } = await import('../../../../models/cadastros/DiasVencimento');
    const { ContratoPlanoAdicional } = await import('../../../../models/contratos/ContratoPlanoAdicional');
    const { Plano } = await import('../../../../models/cadastros/Plano');

    const results = await Promise.allSettled([
      Titulo.findAll({
        where: {
          contrato_id: { [Op.in]: contratoIds },
          status: ['pendente', 'vencido'],
          pago: false
        },
        attributes: ['id', 'contrato_id', 'data_vencimento']
      }),
      Titulo.findAll({
        where: {
          contrato_id: { [Op.in]: contratoIds },
          status: { [Op.ne]: 'cancelado' }
        },
        attributes: ['id', 'contrato_id', 'data_vencimento', 'status']
      }),
      DiasVencimento.findAll({
        where: {
          id: { [Op.in]: diaVencimentoIds }
        },
        attributes: ['id', 'dia']
      }),
      ContratoPlanoAdicional.findAll({
        where: {
          contrato_id: { [Op.in]: contratoIds },
          status: 'ativo'
        },
        include: [
          {
            model: Plano,
            as: 'plano',
            attributes: ['id', 'nome_plano', 'valor_mensal']
          }
        ],
        attributes: ['id', 'contrato_id', 'status']
      })
    ]);

    const titulosEmAbertoTodos = results[0].status === 'fulfilled' ? results[0].value : [];
    const todosTitulosTodos = results[1].status === 'fulfilled' ? results[1].value : [];
    const diasVencimentoTodos = results[2].status === 'fulfilled' ? results[2].value : [];
    const servicosAdicionaisTodos = results[3].status === 'fulfilled' ? results[3].value : [];

    // Logar erros
    if (results[0].status === 'rejected') {
      logger.error('Erro ao buscar títulos em aberto', {
        context: 'RoutineExecutionService',
        action: 'executeGeracaoTitulos',
        error: results[0].reason instanceof Error ? results[0].reason.message : 'Erro desconhecido'
      });
    }
    if (results[1].status === 'rejected') {
      logger.error('Erro ao buscar todos os títulos', {
        context: 'RoutineExecutionService',
        action: 'executeGeracaoTitulos',
        error: results[1].reason instanceof Error ? results[1].reason.message : 'Erro desconhecido'
      });
    }
    if (results[2].status === 'rejected') {
      logger.error('Erro ao buscar dias de vencimento', {
        context: 'RoutineExecutionService',
        action: 'executeGeracaoTitulos',
        error: results[2].reason instanceof Error ? results[2].reason.message : 'Erro desconhecido'
      });
    }
    if (results[3].status === 'rejected') {
      logger.error('Erro ao buscar serviços adicionais', {
        context: 'RoutineExecutionService',
        action: 'executeGeracaoTitulos',
        error: results[3].reason instanceof Error ? results[3].reason.message : 'Erro desconhecido'
      });
    }

    return {
      titulosEmAbertoTodos,
      todosTitulosTodos,
      diasVencimentoTodos,
      servicosAdicionaisTodos
    };
  }

  /**
   * Agrupa dados por contrato_id para acesso rápido
   */
  static groupDataByContrato(
    titulosEmAbertoTodos: Array<{ contrato_id: number | null; data_vencimento: Date }>,
    todosTitulosTodos: Array<{ contrato_id: number | null; data_vencimento: Date; status?: string }>,
    diasVencimentoTodos: Array<{ id: number; dia?: number }>,
    servicosAdicionaisTodos: Array<{ contrato_id: number | null; [key: string]: any }>
  ) {
    const titulosEmAbertoPorContrato = new Map<number, Array<typeof titulosEmAbertoTodos[0]>>();
    const todosTitulosPorContrato = new Map<number, Array<typeof todosTitulosTodos[0]>>();
    const diasVencimentoPorId = new Map<number, typeof diasVencimentoTodos[0]>();
    const servicosAdicionaisPorContrato = new Map<number, Array<typeof servicosAdicionaisTodos[0]>>();

    titulosEmAbertoTodos.forEach(titulo => {
      const contratoId = titulo.contrato_id;
      if (contratoId !== null && contratoId !== undefined) {
        if (!titulosEmAbertoPorContrato.has(contratoId)) {
          titulosEmAbertoPorContrato.set(contratoId, []);
        }
        const titulos = titulosEmAbertoPorContrato.get(contratoId);
        if (titulos) {
          titulos.push(titulo);
        }
      }
    });

    todosTitulosTodos.forEach((titulo: typeof todosTitulosTodos[0]) => {
      const contratoId = titulo.contrato_id;
      if (contratoId !== null && contratoId !== undefined) {
        if (!todosTitulosPorContrato.has(contratoId)) {
          todosTitulosPorContrato.set(contratoId, []);
        }
        const todosTitulos = todosTitulosPorContrato.get(contratoId);
        if (todosTitulos) {
          todosTitulos.push(titulo);
        }
      }
    });

    diasVencimentoTodos.forEach(diaVenc => {
      diasVencimentoPorId.set(diaVenc.id, diaVenc);
    });

    servicosAdicionaisTodos.forEach(servico => {
      const contratoId = servico.contrato_id;
      if (contratoId !== null && contratoId !== undefined) {
        if (!servicosAdicionaisPorContrato.has(contratoId)) {
          servicosAdicionaisPorContrato.set(contratoId, []);
        }
        const servicos = servicosAdicionaisPorContrato.get(contratoId);
        if (servicos) {
          servicos.push(servico);
        }
      }
    });

    return {
      titulosEmAbertoPorContrato,
      todosTitulosPorContrato,
      diasVencimentoPorId,
      servicosAdicionaisPorContrato
    };
  }
}
