import { prisma } from '../../../../db/prisma';
import { logger } from '../../../../utils/logger';

export class ContratoDataLoader {
  static async loadRelatedData(contratoIds: number[], diaVencimentoIds: number[]) {
    const results = await Promise.allSettled([
      prisma.financeiro_titulos.findMany({
        where: { contrato_id: { in: contratoIds }, status: { in: ['pendente', 'vencido'] }, pago: false },
        select: { id: true, contrato_id: true, data_vencimento: true },
      }),
      prisma.financeiro_titulos.findMany({
        where: { contrato_id: { in: contratoIds }, status: { not: 'cancelado' } },
        select: { id: true, contrato_id: true, data_vencimento: true, status: true },
      }),
      prisma.cadastros_dias_vencimento.findMany({
        where: { id: { in: diaVencimentoIds } },
        select: { id: true, dia: true },
      }),
      prisma.contratos_planos_adicionais.findMany({
        where: { contrato_id: { in: contratoIds }, status: 'ativo' },
        select: {
          id: true,
          contrato_id: true,
          status: true,
          cadastros_planos: { select: { id: true, nome_plano: true, valor_mensal: true } },
        },
      }),
    ]);

    const titulosEmAbertoTodos = results[0].status === 'fulfilled' ? results[0].value : [];
    const todosTitulosTodos = results[1].status === 'fulfilled' ? results[1].value : [];
    const diasVencimentoTodos = results[2].status === 'fulfilled' ? results[2].value : [];
    const servicosAdicionaisTodos = results[3].status === 'fulfilled'
      ? results[3].value.map((row) => ({
          ...row,
          plano: {
            ...row.cadastros_planos,
            valor_mensal: Number(row.cadastros_planos.valor_mensal),
          },
        }))
      : [];

    const labels = ['títulos em aberto', 'todos os títulos', 'dias de vencimento', 'serviços adicionais'];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`Erro ao buscar ${labels[index]}`, {
          context: 'RoutineExecutionService',
          action: 'executeGeracaoTitulos',
          error: result.reason instanceof Error ? result.reason.message : 'Erro desconhecido',
        });
      }
    });

    return { titulosEmAbertoTodos, todosTitulosTodos, diasVencimentoTodos, servicosAdicionaisTodos };
  }

  static groupDataByContrato(
    titulosEmAbertoTodos: Array<{ contrato_id: number | null }>,
    todosTitulosTodos: Array<{ contrato_id: number | null }>,
    diasVencimentoTodos: Array<{ id: number; dia: number }>,
    servicosAdicionaisTodos: Array<{ contrato_id: number }>
  ) {
    const group = <T extends { contrato_id: number | null }>(rows: T[]) => {
      const map = new Map<number, T[]>();
      for (const row of rows) {
        if (row.contrato_id == null) continue;
        const list = map.get(row.contrato_id) ?? [];
        list.push(row);
        map.set(row.contrato_id, list);
      }
      return map;
    };
    return {
      titulosEmAbertoPorContrato: group(titulosEmAbertoTodos),
      todosTitulosPorContrato: group(todosTitulosTodos),
      diasVencimentoPorId: new Map(diasVencimentoTodos.map((dia) => [dia.id, dia])),
      servicosAdicionaisPorContrato: group(servicosAdicionaisTodos),
    };
  }
}
