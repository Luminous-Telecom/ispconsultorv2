import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Titulo } from '../models/Titulo';
import { Op } from 'sequelize';

export class DashboardController {
  // Obter dados completos do dashboard
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      // Buscar todas as estatísticas e dados em paralelo
      const [statsData, titulosRecentes, titulosVencidos] = await Promise.all([
        DashboardController.getStatsData(),
        DashboardController.getTitulosRecentesData(5),
        DashboardController.getTitulosVencidosData(10)
      ]);

      const dashboardData = {
        stats: statsData,
        titulosRecentes,
        titulosVencidos,
        receitaUltimosMeses: {
          labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
          data: [0, 0, 0, 0, 0, 0] // Placeholder - pode ser implementado depois
        },
        clientesPorStatus: {
          labels: ['Ativos', 'Inativos'],
          data: [statsData.planosAtivos, statsData.totalClientes - statsData.planosAtivos]
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Erro ao obter dados do dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Método auxiliar para obter estatísticas
  private static async getStatsData() {
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
      carnesPendentes
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

    return {
      totalClientes: totalClientes,
      clientesAtivos: clientesAtivos,
      planosAtivos: planosAtivos,
      titulosAtivos: titulosAtivos,
      titulosVencidos: await Titulo.count({
        where: {
          data_vencimento: { [Op.lte]: new Date() },
          status: 'pendente'
        }
      }),
      valorTotalReceber: valorTotalPendente,
      valorTotalRecebido: valorTotalPago,
      receitaMensal: valorTotalPago, // Simplificado
      crescimentoMensal: 0 // Placeholder
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

    return titulos.map(titulo => ({
      id: titulo.id,
      numero_titulo: titulo.numero_titulo,
      cliente: (titulo as any).cliente?.razao_social || 'N/A',
      valor: titulo.valor,
      status: titulo.status,
      data: titulo.created_at.toLocaleDateString('pt-BR')
    }));
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

    return titulos.map(titulo => ({
      id: titulo.id,
      numero_titulo: titulo.numero_titulo,
      valor: titulo.valor,
      data_vencimento: titulo.data_vencimento,
      cliente: (titulo as any).cliente?.razao_social || 'N/A',
      status: titulo.status
    }));
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
        valor_total_pendente: valorTotalPendente
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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
      console.error('Erro ao obter títulos recentes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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
      console.error('Erro ao obter títulos vencidos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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
      console.error('Erro ao obter títulos próximos do vencimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter gráfico de títulos por status
  static async getGraficoTitulosPorStatus(req: Request, res: Response): Promise<void> {
    try {
      const titulosPorStatus = await Titulo.findAll({
        attributes: [
          'status',
          [Titulo.sequelize!.fn('COUNT', Titulo.sequelize!.col('id')), 'total']
        ],
        group: ['status'],
        raw: true
      });

      const dados = titulosPorStatus.map((item: any) => ({
        status: item.status,
        total: parseInt(item.total)
      }));

      res.json({
        success: true,
        data: dados
      });
    } catch (error) {
      console.error('Erro ao obter gráfico de títulos por status:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter gráfico de clientes por cidade
  static async getGraficoClientesPorCidade(req: Request, res: Response): Promise<void> {
    try {
      const clientesPorCidade = await Cliente.findAll({
        attributes: [
          'cidade',
          [Cliente.sequelize!.fn('COUNT', Cliente.sequelize!.col('id')), 'total']
        ],
        where: {
          cidade: {
            [Op.ne]: null
          }
        },
        group: ['cidade'],
        order: [[Cliente.sequelize!.fn('COUNT', Cliente.sequelize!.col('id')), 'DESC']],
        limit: 10,
        raw: true
      });

      const dados = clientesPorCidade.map((item: any) => ({
        cidade: item.cidade,
        total: parseInt(item.total)
      }));

      res.json({
        success: true,
        data: dados
      });
    } catch (error) {
      console.error('Erro ao obter gráfico de clientes por cidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
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
      console.error('Erro ao obter resumo mensal:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
