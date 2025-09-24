import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Carne } from '../models/Carne';
import { CarneParcela } from '../models/CarneParcela';
import { Op } from 'sequelize';

export class DashboardController {
  // Obter dados completos do dashboard
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      // Buscar todas as estatísticas e dados em paralelo
      const [statsData, carnesRecentes, parcelasVencidas] = await Promise.all([
        DashboardController.getStatsData(),
        DashboardController.getCarnesRecentesData(5),
        DashboardController.getParcelasVencidasData(10)
      ]);

      const dashboardData = {
        stats: statsData,
        carnesRecentes,
        parcelasVencidas,
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
      totalCarnes,
      carnesAtivos,
      carnesPagos,
      carnesPendentes
    ] = await Promise.all([
      Cliente.count(),
      Cliente.count({ where: { ativo: true } }),
      Plano.count(),
      Plano.count({ where: { status: 'ativo' } }),
      Banco.count(),
      Banco.count({ where: { ativo: true } }),
      Carne.count(),
      Carne.count({ where: { status: 'ativo' } }),
      Carne.count({ where: { status: 'pago' } }),
      Carne.count({ where: { status: 'pendente' } })
    ]);

    // Calcular valores monetários
    const carnes = await Carne.findAll({
      include: [{ association: 'parcelas' }]
    });

    let valorTotalCarnes = 0;
    let valorTotalPago = 0;
    let valorTotalPendente = 0;

    for (const carne of carnes) {
      const parcelas = await carne.getParcelas();
      const valorCarne = parcelas.reduce((total, parcela) => {
        return total + parseFloat(parcela.valor_parcela.toString());
      }, 0);

      valorTotalCarnes += valorCarne;

      if (carne.status === 'pago') {
        valorTotalPago += valorCarne;
      } else if (carne.status === 'pendente' || carne.status === 'ativo') {
        valorTotalPendente += valorCarne;
      }
    }

    return {
      totalClientes: totalClientes,
      clientesAtivos: clientesAtivos,
      planosAtivos: planosAtivos,
      carnesAtivos: carnesAtivos,
      parcelasVencidas: await CarneParcela.count({
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

  // Método auxiliar para obter carnês recentes
  private static async getCarnesRecentesData(limit: number) {
    const carnes = await Carne.findAll({
      include: [
        { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
        { association: 'plano', attributes: ['id', 'nome_plano'] },
        { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return carnes.map(carne => ({
      id: carne.id,
      numero_carne: carne.numero_carne,
      cliente: (carne as any).cliente?.razao_social || 'N/A',
      valor_total: carne.valor_total,
      status: carne.status,
      data: carne.created_at.toLocaleDateString('pt-BR')
    }));
  }

  // Método auxiliar para obter parcelas vencidas
  private static async getParcelasVencidasData(limit: number) {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const parcelas = await CarneParcela.findAll({
      where: {
        data_vencimento: { [Op.lte]: hoje },
        status: 'pendente'
      },
      include: [
        { 
          association: 'carne',
          include: [
            { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email'] }
          ]
        }
      ],
      order: [['data_vencimento', 'ASC']],
      limit
    });

    return parcelas.map(parcela => ({
      id: parcela.id,
      numero_parcela: parcela.numero_parcela,
      valor_parcela: parcela.valor_parcela,
      data_vencimento: parcela.data_vencimento,
      cliente: (parcela as any).carne?.cliente?.razao_social || 'N/A',
      status: parcela.status
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
        totalCarnes,
        carnesAtivos,
        carnesPagos,
        carnesPendentes
      ] = await Promise.all([
        Cliente.count(),
        Cliente.count({ where: { ativo: true } }),
        Plano.count(),
        Plano.count({ where: { status: 'ativo' } }),
        Banco.count(),
        Banco.count({ where: { ativo: true } }),
        Carne.count(),
        Carne.count({ where: { status: 'ativo' } }),
        Carne.count({ where: { status: 'pago' } }),
        Carne.count({ where: { status: 'pendente' } })
      ]);

      // Calcular valores monetários
      const carnes = await Carne.findAll({
        include: [{ association: 'parcelas' }]
      });

      let valorTotalCarnes = 0;
      let valorTotalPago = 0;
      let valorTotalPendente = 0;

      for (const carne of carnes) {
        const parcelas = await carne.getParcelas();
        const valorCarne = parcelas.reduce((total, parcela) => {
          return total + parseFloat(parcela.valor_parcela.toString());
        }, 0);

        valorTotalCarnes += valorCarne;

        if (carne.status === 'pago') {
          valorTotalPago += valorCarne;
        } else if (carne.status === 'pendente' || carne.status === 'ativo') {
          valorTotalPendente += valorCarne;
        }
      }

      const stats = {
        total_clientes: totalClientes,
        clientes_ativos: clientesAtivos,
        total_planos: totalPlanos,
        planos_ativos: planosAtivos,
        total_bancos: totalBancos,
        bancos_ativos: bancosAtivos,
        total_carnes: totalCarnes,
        carnes_ativos: carnesAtivos,
        carnes_pagos: carnesPagos,
        carnes_pendentes: carnesPendentes,
        valor_total_carnes: valorTotalCarnes,
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

  // Obter carnês recentes
  static async getCarnesRecentes(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 15;

      const carnes = await Carne.findAll({
        include: [
          { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
          { association: 'plano', attributes: ['id', 'nome_plano'] },
          { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] },
          { association: 'parcelas', limit: 1, order: [['numero_parcela', 'ASC']] }
        ],
        order: [['created_at', 'DESC']],
        limit
      });

      res.json({
        success: true,
        data: carnes
      });
    } catch (error) {
      console.error('Erro ao obter carnês recentes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter parcelas vencidas
  static async getParcelasVencidas(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);

      const parcelas = await CarneParcela.findAll({
        where: {
          data_vencimento: {
            [Op.lte]: hoje
          },
          status: 'pendente'
        },
        include: [
          { 
            association: 'carne',
            include: [
              { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
              { association: 'plano', attributes: ['id', 'nome_plano'] },
              { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
            ]
          }
        ],
        order: [['data_vencimento', 'ASC']]
      });

      res.json({
        success: true,
        data: parcelas
      });
    } catch (error) {
      console.error('Erro ao obter parcelas vencidas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter parcelas próximas do vencimento
  static async getParcelasProximasVencimento(req: Request, res: Response): Promise<void> {
    try {
      const hoje = new Date();
      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);

      const parcelas = await CarneParcela.findAll({
        where: {
          data_vencimento: {
            [Op.between]: [hoje, proximos7Dias]
          },
          status: 'pendente'
        },
        include: [
          { 
            association: 'carne',
            include: [
              { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email', 'telefone'] },
              { association: 'plano', attributes: ['id', 'nome_plano'] },
              { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
            ]
          }
        ],
        order: [['data_vencimento', 'ASC']]
      });

      res.json({
        success: true,
        data: parcelas
      });
    } catch (error) {
      console.error('Erro ao obter parcelas próximas do vencimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Obter gráfico de carnês por status
  static async getGraficoCarnesPorStatus(req: Request, res: Response): Promise<void> {
    try {
      const carnesPorStatus = await Carne.findAll({
        attributes: [
          'status',
          [Carne.sequelize!.fn('COUNT', Carne.sequelize!.col('id')), 'total']
        ],
        group: ['status'],
        raw: true
      });

      const dados = carnesPorStatus.map((item: any) => ({
        status: item.status,
        total: parseInt(item.total)
      }));

      res.json({
        success: true,
        data: dados
      });
    } catch (error) {
      console.error('Erro ao obter gráfico de carnês por status:', error);
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

      // Carnês criados no mês
      const carnesCriados = await Carne.count({
        where: {
          created_at: {
            [Op.between]: [inicioMes, fimMes]
          }
        }
      });

      // Parcelas pagas no mês
      const parcelasPagas = await CarneParcela.count({
        where: {
          data_pagamento: {
            [Op.between]: [inicioMes, fimMes]
          },
          pago: true
        }
      });

      // Valor total pago no mês
      const parcelasPagasMes = await CarneParcela.findAll({
        where: {
          data_pagamento: {
            [Op.between]: [inicioMes, fimMes]
          },
          pago: true
        }
      });

      const valorTotalPago = parcelasPagasMes.reduce((total, parcela) => {
        return total + parseFloat(parcela.valor_pago?.toString() || parcela.valor_parcela.toString());
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
        carnes_criados: carnesCriados,
        parcelas_pagas: parcelasPagas,
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
