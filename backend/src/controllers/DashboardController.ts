import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Titulo } from '../models/Titulo';
import { Contrato } from '../models/Contrato';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { parseDateFromDb, formatDate } from '../utils/dateUtils';

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
      const { startDate, endDate } = req.query;

      const parsedStart = DashboardController.parseStartDate(startDate as string | undefined);
      const parsedEnd = DashboardController.parseEndDate(endDate as string | undefined, parsedStart);

      // Preparar filtros de data para o período selecionado
      const inicioPeriodo = new Date(parsedStart);
      inicioPeriodo.setHours(0, 0, 0, 0);
      const fimPeriodo = new Date(parsedEnd);
      fimPeriodo.setHours(23, 59, 59, 999);

      // Buscar contratos do período para análises do período
      const contratos = await Contrato.findAll({ 
        attributes: ['id', 'status', 'plano_id', 'cliente_id', 'valor_final', 'data_inicio', 'data_fim', 'created_at'],
        where: {
          [Op.and]: [
            {
              data_inicio: {
                [Op.lte]: fimPeriodo
              }
            },
            {
              [Op.or]: [
                {
                  data_fim: {
                    [Op.gte]: inicioPeriodo
                  }
                },
                {
                  data_fim: null
                }
              ]
            }
          ]
        }
      });
      
      // Buscar todos os contratos ativos para o gráfico "Clientes por Plano" (como na listagem de planos)
      const contratosAtivosTodos = await Contrato.findAll({
        attributes: ['id', 'status', 'plano_id', 'cliente_id'],
        where: { status: 'ativo' }
      });
      
      // Buscar todas as estatísticas e dados em paralelo
      const [statsData, titulosRecentes, titulosVencidos, clientesPeriodo, planos, titulosPeriodo, clientesTodos, titulosTodos, contratosTodos] = await Promise.all([
        DashboardController.getStatsData(inicioPeriodo, fimPeriodo),
        DashboardController.getTitulosRecentesData(5),
        DashboardController.getTitulosVencidosData(10),
        // Clientes do período (para outras análises)
        Cliente.findAll({ 
          attributes: ['id', 'ativo', 'created_at'],
          where: {
            created_at: {
              [Op.between]: [inicioPeriodo, fimPeriodo]
            }
          }
        }),
        // Buscar todos os planos ativos (para gráficos de status e distribuição)
        Plano.findAll({ 
          attributes: ['id', 'status', 'nome_plano', 'tipo_servico'],
          where: { status: 'ativo' }
        }),
        // Títulos do período (para análises do período)
        Titulo.findAll({ 
          attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at'],
          where: {
            data_vencimento: {
              [Op.between]: [inicioPeriodo, fimPeriodo]
            }
          }
        }),
        // TODOS os clientes (para gráfico de status de clientes)
        Cliente.findAll({ 
          attributes: ['id', 'ativo', 'created_at']
        }),
        // TODOS os títulos (para gráfico de status de pagamento)
        Titulo.findAll({ 
          attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at']
        }),
        // TODOS os contratos (para gráfico de status de contratos)
        Contrato.findAll({ 
          attributes: ['id', 'status', 'plano_id', 'cliente_id']
        })
      ]);

      const [aReceberPeriodo, recebidosPeriodo, resumoPeriodo] = await Promise.all([
        DashboardController.getReceberPorPeriodoData(parsedStart, parsedEnd),
        DashboardController.getRecebidosPorPeriodoData(parsedStart, parsedEnd),
        DashboardController.getResumoFinanceiroPeriodo(parsedStart, parsedEnd)
      ]);

      const receitaUltimosMeses = await DashboardController.getReceitaUltimos12Meses();

      const dashboardData = {
        stats: statsData,
        titulosRecentes,
        titulosVencidos,
        clientes: clientesPeriodo.map(c => c.toJSON()), // Clientes do período
        clientesTodos: clientesTodos.map(c => c.toJSON()), // TODOS os clientes para gráficos
        planos: planos.map(p => p.toJSON()),
        contratos: contratos.map(c => c.toJSON()), // Contratos do período
        contratosTodos: contratosTodos.map(c => c.toJSON()), // TODOS os contratos para gráficos
        contratosAtivosTodos: contratosAtivosTodos.map(c => c.toJSON()),
        titulos: titulosPeriodo.map(t => t.toJSON()), // Títulos do período
        titulosTodos: titulosTodos.map(t => t.toJSON()), // TODOS os títulos para gráficos
        receitaUltimosMeses,
        clientesPorStatus: {
          labels: ['Ativos', 'Inativos'],
          data: [statsData.planosAtivos, statsData.totalClientes - statsData.planosAtivos]
        },
        aReceberPeriodo,
        recebidosPeriodo,
        filtros: {
          startDate: parsedStart.toISOString(),
          endDate: parsedEnd.toISOString()
        },
        resumoPeriodo
      };


      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter dados do dashboard', {
        context: 'DashboardController',
        action: 'index',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Método auxiliar para obter estatísticas
  private static async getStatsData(startDate?: Date, endDate?: Date) {
    // Preparar filtros de data se fornecidos
    const inicioPeriodo = startDate ? new Date(startDate) : undefined;
    const fimPeriodo = endDate ? new Date(endDate) : undefined;
    
    if (inicioPeriodo) inicioPeriodo.setHours(0, 0, 0, 0);
    if (fimPeriodo) fimPeriodo.setHours(23, 59, 59, 999);

    // Construir condições de filtro
    const clienteWhere = inicioPeriodo && fimPeriodo ? {
      created_at: {
        [Op.between]: [inicioPeriodo, fimPeriodo]
      }
    } : {};

    const planoWhere = inicioPeriodo && fimPeriodo ? {
      created_at: {
        [Op.between]: [inicioPeriodo, fimPeriodo]
      }
    } : {};

    const tituloWhere = inicioPeriodo && fimPeriodo ? {
      data_vencimento: {
        [Op.between]: [inicioPeriodo, fimPeriodo]
      }
    } : {};

    const [
      totalClientes,
      clientesAtivos,
      _totalPlanos,
      planosAtivos,
      _totalBancos,
      _bancosAtivos,
      _totalTitulos,
      titulosAtivos,
      _titulosPagos,
      _carnesPendentes
    ] = await Promise.all([
      Cliente.count({ where: clienteWhere }),
      Cliente.count({ where: { ...clienteWhere, ativo: true } }),
      Plano.count({ where: planoWhere }),
      Plano.count({ where: { ...planoWhere, status: 'ativo' } }),
      Banco.count(),
      Banco.count({ where: { ativo: true } }),
      Titulo.count({ where: tituloWhere }),
      Titulo.count({ where: { ...tituloWhere, status: 'vencido' } }),
      Titulo.count({ where: { ...tituloWhere, status: 'pago' } }),
      Titulo.count({ where: { ...tituloWhere, status: 'pendente' } })
    ]);

    // Calcular valores monetários - filtrar por período se fornecido
    const titulos = await Titulo.findAll({
      where: tituloWhere
    });

    let _valorTotalTitulos = 0;
    let valorTotalPago = 0;
    let valorTotalPendente = 0;

    for (const titulo of titulos) {
      const valorTitulo = parseFloat(titulo.valor.toString());

      _valorTotalTitulos += valorTitulo;

      if (titulo.status === 'pago') {
        valorTotalPago += valorTitulo;
      } else if (titulo.status === 'pendente' || titulo.status === 'vencido') {
        valorTotalPendente += valorTitulo;
      }
    }

    // Filtrar contratos que se sobrepõem ao período
    const contratoWhere = inicioPeriodo && fimPeriodo ? {
      [Op.and]: [
        {
          data_inicio: {
            [Op.lte]: fimPeriodo
          }
        },
        {
          [Op.or]: [
            {
              data_fim: {
                [Op.gte]: inicioPeriodo
              }
            },
            {
              data_fim: null
            }
          ]
        }
      ]
    } : {};

    const contratos = await Contrato.findAll({ 
      attributes: ['cliente_id', 'valor_final'],
      where: contratoWhere
    });
    const totalValorContratos = contratos.reduce((acumulado, contrato) => {
      return acumulado + parseFloat(String(contrato.valor_final || 0));
    }, 0);

    // Calcular títulos vencidos no período
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const titulosVencidosWhere = inicioPeriodo && fimPeriodo ? {
      ...tituloWhere,
      data_vencimento: {
        [Op.and]: [
          { [Op.lte]: hoje },
          { [Op.between]: [inicioPeriodo, fimPeriodo] }
        ]
      },
      status: 'pendente'
    } : {
      data_vencimento: { [Op.lte]: hoje },
      status: 'pendente'
    };

    return {
      totalClientes: totalClientes,
      clientesAtivos: clientesAtivos,
      planosAtivos: planosAtivos,
      titulosAtivos: titulosAtivos,
      titulosVencidos: await Titulo.count({
        where: titulosVencidosWhere
      }),
      valorTotalReceber: valorTotalPendente,
      valorTotalRecebido: valorTotalPago,
      receitaMensal: valorTotalPago, // Simplificado
      crescimentoMensal: 0, // Placeholder
      ticketMedio: totalClientes > 0
        ? totalValorContratos / totalClientes
        : 0
    };
  }

  // Método auxiliar para obter títulos recentes
  private static async getTitulosRecentesData(limit: number) {
    const titulos = await Titulo.findAll({
      include: [
        { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
        { association: 'plano', attributes: ['id', 'nome_plano'] },
        { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return titulos.map(titulo => {
      const tituloWithCliente = titulo as TituloWithCliente;
      return {
        id: titulo.id,
        numero_titulo: titulo.numero_titulo,
        cliente: tituloWithCliente.cliente?.razao_social || 'N/A',
        valor: titulo.valor,
        status: titulo.status,
        data: formatDate(new Date(titulo.created_at)) || 'N/A'
      };
    });
  }

  // Método auxiliar para obter títulos vencidos
  private static async getTitulosVencidosData(limit: number) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const titulos = await Titulo.findAll({
      where: {
        data_vencimento: { [Op.lte]: hoje },
        status: 'pendente'
      },
      include: [
        { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email'] }
      ],
      order: [['data_vencimento', 'ASC']],
      limit
    });

    return titulos.map(titulo => {
      const tituloWithCliente = titulo as TituloWithCliente;
      return {
        id: titulo.id,
        numero_titulo: titulo.numero_titulo,
        valor: titulo.valor,
        data_vencimento: titulo.data_vencimento,
        cliente: tituloWithCliente.cliente?.razao_social || 'N/A',
        status: titulo.status
      };
    });
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
        Cliente.count(),
        Cliente.count({ where: { ativo: true } }),
        Plano.count(),
        Plano.count({ where: { status: 'ativo' } }),
        Banco.count(),
        Banco.count({ where: { ativo: true } }),
        Titulo.count(),
        Titulo.count({ where: { status: 'vencido' } }),
        Titulo.count({ where: { status: 'pago' } }),
        Titulo.count({ where: { status: 'pendente' } })
      ]);

      // Calcular valores monetários
      const titulos = await Titulo.findAll();

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

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter estatísticas do dashboard', {
        context: 'DashboardController',
        action: 'estatisticas',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Obter títulos recentes
  static async getTitulosRecentes(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 15;

      const titulos = await Titulo.findAll({
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['created_at', 'DESC']],
        limit
      });

      res.json({
        success: true,
        data: titulos
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter títulos recentes', {
        context: 'DashboardController',
        action: 'titulosRecentes',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Obter títulos vencidos
  static async getTitulosVencidos(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);

      const titulos = await Titulo.findAll({
        where: {
          data_vencimento: {
            [Op.lte]: hoje
          },
          status: 'pendente'
        },
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['data_vencimento', 'ASC']]
      });

      res.json({
        success: true,
        data: titulos
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter títulos vencidos', {
        context: 'DashboardController',
        action: 'titulosVencidos',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Obter títulos próximos do vencimento
  static async getTitulosProximosVencimento(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);

      const titulos = await Titulo.findAll({
        where: {
          data_vencimento: {
            [Op.between]: [hoje, proximos7Dias]
          },
          status: 'pendente'
        },
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
        ],
        order: [['data_vencimento', 'ASC']]
      });

      res.json({
        success: true,
        data: titulos
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter títulos próximos do vencimento', {
        context: 'DashboardController',
        action: 'titulosProximosVencimento',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Obter gráfico de títulos por status
  static async getGraficoTitulosPorStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!sequelize) {
        throw new Error('Sequelize não está inicializado');
      }

      const titulosPorStatusRaw = await Titulo.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        group: ['status'],
        raw: true
      });

      // Converter para objetos planos (raw: true retorna objetos planos)
      const titulosConvertidos = extractRawData(
        JSON.parse(JSON.stringify(titulosPorStatusRaw)) as Array<Record<string, string | number>>
      );

      const dados = titulosConvertidos.map((item) => {
        const data = item as TituloStatusData;
        return {
          status: String(data.status || ''),
          total: parseInt(String(data.total || 0))
        };
      });

      res.json({
        success: true,
        data: dados
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter gráfico de títulos por status', {
        context: 'DashboardController',
        action: 'graficoTitulosPorStatus',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Obter gráfico de clientes por cidade
  static async getGraficoClientesPorCidade(req: Request, res: Response): Promise<void> {
    try {
      if (!sequelize) {
        throw new Error('Sequelize não está inicializado');
      }

      const clientesPorCidadeRaw = await Cliente.findAll({
        attributes: [
          'cidade',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        where: {
          cidade: {
            [Op.ne]: null
          }
        },
        group: ['cidade'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      });

      // Converter para objetos planos (raw: true retorna objetos planos)
      const clientesConvertidos = extractRawData(
        JSON.parse(JSON.stringify(clientesPorCidadeRaw)) as Array<Record<string, string | number>>
      );

      const dados = clientesConvertidos.map((item) => {
        const data = item as ClienteCidadeData;
        return {
          cidade: String(data.cidade || ''),
          total: parseInt(String(data.total || 0))
        };
      });

      res.json({
        success: true,
        data: dados
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter gráfico de clientes por cidade', {
        context: 'DashboardController',
        action: 'graficoClientesPorCidade',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }

  // Obter resumo mensal
  static async getResumoMensal(req: Request, res: Response): Promise<void> {
    try {
      const { ano, mes } = req.query;
      const anoAtual = ano ? parseInt(ano as string) : new Date().getFullYear();
      const mesAtual = mes ? parseInt(mes as string) : new Date().getMonth() + 1;

      const inicioMes = new Date(anoAtual, mesAtual - 1, 1);
      const fimMes = new Date(anoAtual, mesAtual, 0, 23, 59, 59, 999);

      // Títulos criados no mês
      const titulosCriados = await Titulo.count({
        where: {
          created_at: {
            [Op.between]: [inicioMes, fimMes]
          }
        }
      });

      // Títulos pagos no mês
      const titulosPagos = await Titulo.count({
        where: {
          data_pagamento: {
            [Op.between]: [inicioMes, fimMes]
          },
          pago: true
        }
      });

      // Valor total pago no mês
      const titulosPagasMes = await Titulo.findAll({
        where: {
          data_pagamento: {
            [Op.between]: [inicioMes, fimMes]
          },
          pago: true
        }
      });

      const valorTotalPago = titulosPagasMes.reduce((total, titulo) => {
        return total + parseFloat(titulo.valor_pago?.toString() || titulo.valor.toString());
      }, 0);

      // Clientes novos no mês
      const clientesNovos = await Cliente.count({
        where: {
          created_at: {
            [Op.between]: [inicioMes, fimMes]
          }
        }
      });

      const resumo = {
        mes: mesAtual,
        ano: anoAtual,
        titulos_criados: titulosCriados,
        titulos_pagos: titulosPagos,
        valor_total_pago: valorTotalPago,
        clientes_novos: clientesNovos
      };

      res.json({
        success: true,
        data: resumo
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter resumo mensal', {
        context: 'DashboardController',
        action: 'resumoMensal',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
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

  private static async getReceberPorPeriodoData(startDate: Date, endDate: Date) {
    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulosPeriodo = await Titulo.findAll({
      attributes: ['valor', 'data_vencimento'],
      where: {
        data_vencimento: {
          [Op.between]: [inicio, fim]
        },
        status: {
          [Op.in]: ['pendente', 'vencido']
        }
      }
    });

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);

    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const titulo of titulosPeriodo) {
      if (!titulo.data_vencimento) {
        continue;
      }
      const dataTitulo = parseDateFromDb(titulo.data_vencimento);
      if (!dataTitulo) continue;
      
      dataTitulo.setHours(0, 0, 0, 0);
      const diff = dataTitulo.getTime() - inicio.getTime();
      const indice = Math.floor(diff / MS_POR_DIA);
      if (indice >= 0 && indice < valoresPorDia.length) {
        const valorTitulo = parseFloat(titulo.valor.toString());
        valoresPorDia[indice] += valorTitulo;
      }
    }

    const labels = valoresPorDia.map((_, index) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + index);
      return formatDate(data) || '';
    });

    return {
      labels,
      data: valoresPorDia
    };
  }

  private static async getRecebidosPorPeriodoData(startDate: Date, endDate: Date) {
    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulosPeriodo = await Titulo.findAll({
      attributes: ['valor', 'valor_pago', 'status', 'data_pagamento'],
      where: {
        data_pagamento: {
          [Op.between]: [inicio, fim]
        },
        status: {
          [Op.in]: ['pago', 'pago_atraso', 'parcial']
        }
      }
    });

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const titulo of titulosPeriodo) {
      if (!titulo.data_pagamento) {
        continue;
      }

      const dataPagamento = parseDateFromDb(titulo.data_pagamento);
      if (!dataPagamento) continue;

      dataPagamento.setHours(0, 0, 0, 0);
      const diff = dataPagamento.getTime() - inicio.getTime();
      const indice = Math.floor(diff / MS_POR_DIA);

      if (indice >= 0 && indice < valoresPorDia.length) {
        const valorPago = titulo.valor_pago !== null && titulo.valor_pago !== undefined
          ? parseFloat(titulo.valor_pago.toString())
          : parseFloat(titulo.valor.toString());

        valoresPorDia[indice] += valorPago;
      }
    }

    const labels = valoresPorDia.map((_, index) => {
      const data = new Date(inicio);
      data.setDate(inicio.getDate() + index);
      return formatDate(data) || '';
    });

    return {
      labels,
      data: valoresPorDia
    };
  }

  private static async getResumoFinanceiroPeriodo(startDate: Date, endDate: Date) {
    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const titulosPeriodo = await Titulo.findAll({
      attributes: ['valor', 'valor_pago', 'status', 'cliente_id', 'data_vencimento'],
      where: {
        data_vencimento: {
          [Op.between]: [inicio, fim]
        }
      }
    });

    let totalPrevisto = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    const clientesPeriodo = new Set<number>();

    for (const titulo of titulosPeriodo) {
      const valorTitulo = parseFloat(titulo.valor.toString());
      const valorPago = titulo.valor_pago !== null && titulo.valor_pago !== undefined
        ? parseFloat(titulo.valor_pago.toString())
        : valorTitulo;

      if (titulo.cliente_id) {
        clientesPeriodo.add(titulo.cliente_id);
      }

      switch (titulo.status) {
        case 'pago':
        case 'pago_atraso':
          totalRecebido += valorPago;
          // Receita prevista = total a receber + recebidos no período
          totalPrevisto += valorTitulo;
          break;
        case 'parcial':
          totalRecebido += Math.min(valorPago, valorTitulo);
          const valorPendenteParcial = Math.max(valorTitulo - valorPago, 0);
          totalPendente += valorPendenteParcial;
          // Receita prevista = total a receber + recebidos no período
          totalPrevisto += valorTitulo;
          break;
        case 'pendente':
        case 'vencido':
          totalPendente += valorTitulo;
          // Receita prevista = total a receber + recebidos no período
          totalPrevisto += valorTitulo;
          break;
        case 'cancelado':
          // Títulos cancelados não entram no previsto nem no pendente
          break;
        default:
          // Para outros status, considerar como pendente
          totalPendente += valorTitulo;
          totalPrevisto += valorTitulo;
          break;
      }
    }

    // Calcular ticket médio: soma dos valores dos planos com clientes / quantidade de clientes ativos com planos
    const contratosAtivos = await Contrato.findAll({
      attributes: ['id', 'cliente_id', 'valor_final', 'plano_id'],
      include: [
        {
          association: 'plano',
          attributes: ['id', 'valor_mensal']
        },
        {
          association: 'cliente',
          attributes: ['id', 'ativo'],
          where: { ativo: true }
        }
      ],
      where: {
        status: 'ativo'
      }
    });

    let valorTotalPlanos = 0;
    const clientesComPlanos = new Set<number>();

    interface ClienteJson {
      id?: number;
      ativo?: boolean;
    }
    
    interface PlanoJson {
      id?: number;
      nome_plano?: string;
      valor_mensal?: number | string;
    }
    
    interface ContratoJson extends Record<string, unknown> {
      cliente?: ClienteJson;
      plano?: PlanoJson;
    }
    
    for (const contrato of contratosAtivos) {
      const contratoJson = contrato.toJSON() as ContratoJson;
      const cliente = contratoJson.cliente;
      
      if (cliente && cliente.ativo === true) {
        const clienteId = contrato.cliente_id;
        if (clienteId) {
          clientesComPlanos.add(clienteId);
          
          // Usar valor_final do contrato se disponível, senão usar valor_mensal do plano
          if (contrato.valor_final && parseFloat(contrato.valor_final.toString()) > 0) {
            valorTotalPlanos += parseFloat(contrato.valor_final.toString());
          } else if (contratoJson.plano && contratoJson.plano.valor_mensal) {
            const valorMensal = typeof contratoJson.plano.valor_mensal === 'string' 
              ? parseFloat(contratoJson.plano.valor_mensal) 
              : contratoJson.plano.valor_mensal;
            valorTotalPlanos += valorMensal || 0;
          }
        }
      }
    }

    const ticketMedio = clientesComPlanos.size > 0 
      ? valorTotalPlanos / clientesComPlanos.size 
      : 0;

    return {
      totalPrevisto,
      totalRecebido,
      totalPendente,
      clientesComTitulos: clientesPeriodo.size,
      ticketMedio
    };
  }

  private static async getReceitaUltimos12Meses() {
    const hoje = new Date();
    const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    const inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1, 0, 0, 0, 0);

    const titulos = await Titulo.findAll({
      attributes: ['valor', 'valor_pago', 'status', 'data_pagamento', 'data_vencimento'],
      where: {
        data_vencimento: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        },
        status: {
          [Op.in]: ['pago', 'pago_atraso', 'parcial']
        }
      }
    });

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1, 0, 0, 0, 0);
      const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1, 0, 0, 0, 0);

      const totalMes = titulos.reduce((acumulado, titulo) => {
        const refRaw = titulo.data_pagamento ?? titulo.data_vencimento;
        const referencia = parseDateFromDb(refRaw);
        
        if (!referencia) {
          return acumulado;
        }

        if (referencia >= mes && referencia < proxMes) {
          if (titulo.status === 'parcial') {
            const valorPago = titulo.valor_pago !== null && titulo.valor_pago !== undefined
              ? parseFloat(titulo.valor_pago.toString())
              : 0;
            return acumulado + valorPago;
          }

          const valorTitulo = titulo.valor_pago !== null && titulo.valor_pago !== undefined
            ? parseFloat(titulo.valor_pago.toString())
            : parseFloat(titulo.valor.toString());
          return acumulado + valorTitulo;
        }

        return acumulado;
      }, 0);

      // Formatar como MM/AA (ex: 12/24, 01/25)
      const month = String(mes.getMonth() + 1).padStart(2, '0');
      const year = String(mes.getFullYear()).slice(-2);
      labels.push(`${month}/${year}`);
      data.push(totalMes);
    }

    return {
      labels,
      data
    };
  }
}
