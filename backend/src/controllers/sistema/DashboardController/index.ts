import { toPlain } from '../../../utils/toPlain';
import { Request, Response } from 'express';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Contrato } from '../../../models/contratos/Contrato';
import { DashboardService } from '../../../services/sistema/DashboardService';
import { TituloService } from '../../../services/financeiro/TituloService';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { PlanoService } from '../../../services/cadastros/PlanoService';
import { BancoService } from '../../../services/cadastros/BancoService';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';
import { formatDateISOForAPI } from '../../../utils/timezoneUtils';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { parseListQuery, queryString } from '../../../utils/listQuery';
import { buildErpDashboardStatsGraficos } from '../../../services/sistema/dashboardGraficosStats';

interface TituloWithCliente extends Titulo {
  cliente?: Cliente | null;
  plano?: Plano | null;
  banco?: Banco | null;
}

interface TituloStatusData extends Record<string, string | number> {
  status: string;
  total: string | number;
}

interface ClienteCidadeData extends Record<string, string | number> {
  cidade: string;
  total: string | number;
}

function extractRawData(results: Array<Record<string, string | number>>): Array<Record<string, string | number>> {
  return results.map(item => {
    const data: Record<string, string | number> = {};
    for (const key in item) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        data[key] = item[key];
      }
    }
    return data;
  });
}

export class DashboardController {
  // Obter dados completos do dashboard
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const startDate = queryString(req.query.startDate);
      const endDate = queryString(req.query.endDate);

      const parsedStart = DashboardController.parseStartDate(startDate as string | undefined);
      const parsedEnd = DashboardController.parseEndDate(endDate as string | undefined, parsedStart);

      // Preparar filtros de data para o período selecionado
      const inicioPeriodo = new Date(parsedStart);
      inicioPeriodo.setHours(0, 0, 0, 0);
      const fimPeriodo = new Date(parsedEnd);
      fimPeriodo.setHours(23, 59, 59, 999);

      // Buscar todas as estatísticas e dados em paralelo (filtrados por empresa_id)
      const [statsData, titulosRecentes, titulosVencidos, contratos, contratosAtivosTodos, clientesPeriodo, planos, titulosPeriodo, clientesTodos, titulosTodos, contratosTodos, aReceberPeriodo, recebidosPeriodo, resumoPeriodo, receitaUltimosMeses, contasPagarUltimosMeses, clientesPorTipoPlano, ticketMedioPorTipoServico, backupStatusGrafico] = await Promise.all([
        DashboardService.getStatsData(inicioPeriodo, fimPeriodo, empresaId),
        DashboardService.getTitulosRecentesData(5, empresaId),
        DashboardService.getTitulosVencidosData(10, empresaId),
        DashboardService.getContratosPeriodo(inicioPeriodo, fimPeriodo, empresaId),
        DashboardService.getContratosAtivos(empresaId),
        DashboardService.getClientesPeriodo(inicioPeriodo, fimPeriodo, empresaId),
        DashboardService.getPlanosAtivos(empresaId),
        DashboardService.getTitulosPeriodo(inicioPeriodo, fimPeriodo, empresaId),
        DashboardService.getAllClientes(empresaId),
        DashboardService.getAllTitulos(empresaId),
        DashboardService.getAllContratos(empresaId),
        DashboardService.getReceberPorPeriodoData(parsedStart, parsedEnd, empresaId),
        DashboardService.getRecebidosPorPeriodoData(parsedStart, parsedEnd, empresaId),
        DashboardService.getResumoFinanceiroPeriodo(parsedStart, parsedEnd, empresaId),
        DashboardService.getReceitaUltimos12Meses(empresaId),
        DashboardService.getContasPagarUltimos12Meses(empresaId),
        DashboardService.getClientesPorTipoPlano(empresaId),
        DashboardService.getTicketMedioPorTipoServico(empresaId),
        DashboardService.getBackupStatusGrafico(...DashboardController.last7DaysRange(), empresaId),
      ]);

      const contratosAtrasoPeriodo = DashboardService.computeContratosAtrasoPeriodo(
        contratosTodos.map((c) => toPlain(c) as { id: number; status: string; cliente_id: number }),
        titulosTodos.map((t) =>
          toPlain(t) as {
            contrato_id?: number | null;
            cliente_id: number;
            pago: boolean;
            status: string;
            data_vencimento: string | Date;
          }
        )
      );

      const contratosParaPlano =
        contratosAtivosTodos.length > 0 ? contratosAtivosTodos : contratos;

      const statsGraficos = buildErpDashboardStatsGraficos({
        clientesTodos: clientesTodos.map((c) => toPlain(c) as { ativo: boolean }),
        clientesPeriodo: clientesPeriodo.map((c) => toPlain(c) as { ativo: boolean; created_at?: string | Date }),
        planos: planos.map((p) => toPlain(p) as { id: number; status?: string; nome_plano: string }),
        contratosTodos: contratosTodos.map(
          (c) => toPlain(c) as { status: string; isento_mensalidade?: boolean }
        ),
        titulosTodos: titulosTodos.map(
          (t) =>
            toPlain(t) as {
              status: string;
              pago?: boolean;
              data_vencimento: string | Date;
            }
        ),
        contratosEmAtraso: contratosAtrasoPeriodo.contratosEmAtraso,
        contratosAtivosDashboard: contratosAtrasoPeriodo.contratosAtivosDashboard,
        contratosParaPlano: contratosParaPlano.map(
          (c) => toPlain(c) as { status: string; plano_id?: number; cliente_id?: number }
        ),
        receitaUltimosMeses,
        recebidosPeriodo,
        aReceberPeriodo,
        contasPagarUltimosMeses,
      });

      const dashboardData = {
        stats: statsData,
        titulosRecentes,
        titulosVencidos,
        clientes: clientesPeriodo.map(c => toPlain(c)), // Clientes do período
        clientesTodos: clientesTodos.map(c => toPlain(c)), // TODOS os clientes para gráficos
        planos: planos.map(p => toPlain(p)),
        contratos: contratos.map(c => toPlain(c)), // Contratos do período
        contratosTodos: contratosTodos.map(c => toPlain(c)), // TODOS os contratos para gráficos
        contratosAtivosTodos: contratosAtivosTodos.map(c => toPlain(c)),
        clientesPorTipoPlano,
        ticketMedioPorTipoServico,
        titulos: titulosPeriodo.map(t => toPlain(t)), // Títulos do período
        titulosTodos: titulosTodos.map(t => toPlain(t)), // TODOS os títulos para gráficos
        receitaUltimosMeses,
        clientesPorStatus: {
          labels: ['Ativos', 'Inativos'],
          data: [statsData.planosAtivos, statsData.totalClientes - statsData.planosAtivos]
        },
        aReceberPeriodo,
        recebidosPeriodo,
        contasPagarUltimosMeses,
        filtros: {
          startDate: formatDateISOForAPI(parsedStart) || '',
          endDate: formatDateISOForAPI(parsedEnd) || ''
        },
        resumoPeriodo,
        contratosEmAtraso: contratosAtrasoPeriodo.contratosEmAtraso,
        contratosAtivosDashboard: contratosAtrasoPeriodo.contratosAtivosDashboard,
        statsGraficos,
        backupStatusGrafico,
      };


      sendSuccess(res, dashboardData);
    } catch (error) {
      sendError(res, error, 'Erro ao obter dados do dashboard', 500, true, {
        context: 'DashboardController',
        action: 'index'
      });
    }
  }

  /** Equipamentos agregados por dia e status de backup (eventos persistidos, não logs ES). */
  static async getBackupStatusDetalhe(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const data = queryString(req.query.data);
      const status = queryString(req.query.status);
      const dataStr = typeof data === 'string' ? data : '';
      const statusStr = typeof status === 'string' ? status : '';
      const items = await DashboardService.getBackupStatusDetalhe(dataStr, statusStr, empresaId);
      sendSuccess(res, { items });
    } catch (error) {
      sendError(res, error, 'Erro ao listar detalhe de backup', 500, true, {
        context: 'DashboardController',
        action: 'backupStatusDetalhe',
      });
    }
  }

  // Obter estatísticas gerais do dashboard
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      // Contar total de registros
      const [
        totalClientes,
        clientesAtivos,
        totalPlanos,
        planosAtivos,
        totalBancos,
        bancosAtivos,
        totalTitulos,
        titulosAtivos,
        titulosPagos,
        titulosPendentes
      ] = await Promise.all([
        ClienteService.count(),
        ClienteService.count({ ativo: true }),
        Plano.count(),
        Plano.count({ where: { status: 'ativo' } }),
        Banco.count(),
        Banco.count({ where: { ativo: true } }),
        TituloService.count(),
        TituloService.count({ status: 'vencido' }),
        TituloService.count({ status: 'pago' }),
        TituloService.count({ status: 'pendente' })
      ]);

      // Calcular valores monetários
      const titulos = await TituloService.findAllWithFilters();

      let valorTotalTitulos = 0;
      let valorTotalPago = 0;
      let valorTotalPendente = 0;

      for (const titulo of titulos) {
        const valorTitulo = parseFloat(titulo.valor.toString());

        valorTotalTitulos += valorTitulo;

        if (titulo.status === 'pago') {
          valorTotalPago += valorTitulo;
        } else if (titulo.status === 'pendente' || titulo.status === 'vencido') {
          valorTotalPendente += valorTitulo;
        }
      }

      const stats = {
        total_clientes: totalClientes,
        clientes_ativos: clientesAtivos,
        total_planos: totalPlanos,
        planos_ativos: planosAtivos,
        total_bancos: totalBancos,
        bancos_ativos: bancosAtivos,
        total_titulos: totalTitulos,
        titulos_ativos: titulosAtivos,
        titulos_pagos: titulosPagos,
        titulos_pendentes: titulosPendentes,
        valor_total_titulos: valorTotalTitulos,
        valor_total_pago: valorTotalPago,
        valor_total_pendente: valorTotalPendente,
        ticket_medio: totalClientes > 0 ? valorTotalPago / totalClientes : 0
      };

      sendSuccess(res, stats);
    } catch (error) {
      sendError(res, error, 'Erro ao obter estatísticas do dashboard', 500, true, {
        context: 'DashboardController',
        action: 'estatisticas'
      });
    }
  }

  // Obter títulos recentes
  static async getTitulosRecentes(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = parseListQuery(req.query);

      const titulos = await TituloService.findAllWithFilters(undefined, {
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['created_at', 'DESC']],
        limit
      });

      sendSuccess(res, titulos);
    } catch (error) {
      sendError(res, error, 'Erro ao obter títulos recentes', 500, true, {
        context: 'DashboardController',
        action: 'titulosRecentes'
      });
    }
  }

  // Obter títulos vencidos
  static async getTitulosVencidos(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);

      const titulos = await TituloService.findAllWithFilters({
        data_vencimento: { lte: hoje },
        status: 'pendente'
      }, {
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['data_vencimento', 'ASC']]
      });

      sendSuccess(res, titulos);
    } catch (error) {
      sendError(res, error, 'Erro ao obter títulos vencidos', 500, true, {
        context: 'DashboardController',
        action: 'titulosVencidos'
      });
    }
  }

  // Obter títulos próximos do vencimento
  static async getTitulosProximosVencimento(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);

      const titulos = await TituloService.findAllWithFilters({
        data_vencimento: { gte: hoje, lte: proximos7Dias },
        status: 'pendente'
      }, {
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['data_vencimento', 'ASC']]
      });

      sendSuccess(res, titulos);
    } catch (error) {
      sendError(res, error, 'Erro ao obter títulos próximos do vencimento', 500, true, {
        context: 'DashboardController',
        action: 'titulosProximosVencimento'
      });
    }
  }

  // Obter gráfico de títulos por status
  static async getGraficoTitulosPorStatus(req: Request, res: Response): Promise<void> {
    try {
      const grouped = await prisma.financeiro_titulos.groupBy({
        by: ['status'],
        _count: { id: true },
      });
      const dados = grouped.map((item) => ({
        status: String(item.status || ''),
        total: item._count.id,
      }));

      sendSuccess(res, dados);
    } catch (error) {
      sendError(res, error, 'Erro ao obter gráfico de títulos por status', 500, true, {
        context: 'DashboardController',
        action: 'graficoTitulosPorStatus'
      });
    }
  }

  // Obter gráfico de clientes por cidade
  static async getGraficoClientesPorCidade(req: Request, res: Response): Promise<void> {
    try {
      const grouped = await prisma.clientes.groupBy({
        by: ['cidade'],
        where: { cidade: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });
      const dados = grouped.map((item) => ({
        cidade: String(item.cidade || ''),
        total: item._count.id,
      }));

      sendSuccess(res, dados);
    } catch (error) {
      sendError(res, error, 'Erro ao obter gráfico de clientes por cidade', 500, true, {
        context: 'DashboardController',
        action: 'graficoClientesPorCidade'
      });
    }
  }

  // Obter resumo mensal
  static async getResumoMensal(req: Request, res: Response): Promise<void> {
    try {
      const ano = queryString(req.query.ano);
      const mes = queryString(req.query.mes);
      const anoAtual = ano ? parseInt(ano as string) : new Date().getFullYear();
      const mesAtual = mes ? parseInt(mes as string) : new Date().getMonth() + 1;

      const inicioMes = new Date(anoAtual, mesAtual - 1, 1);
      const fimMes = new Date(anoAtual, mesAtual, 0, 23, 59, 59, 999);

      // Títulos criados no mês
      const titulosCriados = await TituloService.count({
        where: {
          created_at: { gte: inicioMes, lte: fimMes }
        }
      });

      // Títulos pagos no mês
      const titulosPagos = await TituloService.count({
        where: {
          data_pagamento: { gte: inicioMes, lte: fimMes },
          pago: true
        }
      });

      // Valor total pago no mês
      const titulosPagasMes = await TituloService.findAllWithFilters({
        data_pagamento: { gte: inicioMes, lte: fimMes },
        pago: true
      });

      const valorTotalPago = titulosPagasMes.reduce((total, titulo) => {
        return total + parseFloat(titulo.valor_pago?.toString() || titulo.valor.toString());
      }, 0);

      // Clientes novos no mês
      const clientesNovos = await ClienteService.count({
        created_at: { gte: inicioMes, lte: fimMes }
      });

      const resumo = {
        mes: mesAtual,
        ano: anoAtual,
        titulos_criados: titulosCriados,
        titulos_pagos: titulosPagos,
        valor_total_pago: valorTotalPago,
        clientes_novos: clientesNovos
      };

      sendSuccess(res, resumo);
    } catch (error) {
      sendError(res, error, 'Erro ao obter resumo mensal', 500, true, {
        context: 'DashboardController',
        action: 'resumoMensal',
        query: req.query
      });
    }
  }

  /** Retorna [início, fim] dos últimos 7 dias corridos (hoje − 6 … hoje), horário local. */
  private static last7DaysRange(): [Date, Date] {
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);
    const inicio = new Date(fim);
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
    return [inicio, fim];
  }

  private static parseStartDate(start?: string) {
    if (start) {
      // Criar data local sem timezone para evitar problemas de conversão
      // Formato esperado: YYYY-MM-DD
      const [year, month, day] = start.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
        return parsed;
      }
    }
    const hoje = new Date();
    const data = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0);
    return data;
  }

  private static parseEndDate(end: string | undefined, start: Date) {
    if (end) {
      // Criar data local sem timezone para evitar problemas de conversão
      // Formato esperado: YYYY-MM-DD
      const [year, month, day] = end.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const parsed = new Date(year, month - 1, day, 23, 59, 59, 999);
        if (parsed < start) {
          const ajustado = new Date(start);
          ajustado.setHours(23, 59, 59, 999);
          return ajustado;
        }
        return parsed;
      }
    }
    const data = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return data;
  }

}
