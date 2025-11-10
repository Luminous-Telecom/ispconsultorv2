import { Request, Response } from 'express';
import { Cliente } from '../models/Cliente';
import { Plano } from '../models/Plano';
import { Banco } from '../models/Banco';
import { Titulo } from '../models/Titulo';
import { Contrato } from '../models/Contrato';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

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
      // Buscar todas as estatísticas e dados em paralelo
      const [statsData, titulosRecentes, titulosVencidos, clientes, planos, contratos, titulos] = await Promise.all([
        DashboardController.getStatsData(),
        DashboardController.getTitulosRecentesData(5),
        DashboardController.getTitulosVencidosData(10),
        Cliente.findAll({ attributes: ['id', 'ativo', 'created_at'] }),
        Plano.findAll({ attributes: ['id', 'status', 'nome_plano', 'tipo_servico'] }),
        Contrato.findAll({ attributes: ['id', 'status', 'plano_id', 'valor_final', 'data_inicio', 'data_fim', 'created_at'] }),
        Titulo.findAll({ attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at'] })
      ]);

      const aReceberMesAtual = await DashboardController.getReceberMesAtualData();

      const dashboardData = {
        stats: statsData,
        titulosRecentes,
        titulosVencidos,
        clientes: clientes.map(c => c.toJSON()),
        planos: planos.map(p => p.toJSON()),
        contratos: contratos.map(c => c.toJSON()),
        titulos: titulos.map(t => t.toJSON()),
        receitaUltimosMeses: {
          labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
          data: [0, 0, 0, 0, 0, 0] // Placeholder - pode ser implementado depois
        },
        clientesPorStatus: {
          labels: ['Ativos', 'Inativos'],
          data: [statsData.planosAtivos, statsData.totalClientes - statsData.planosAtivos]
        },
        aReceberMesAtual
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
      _totalPlanos,
      planosAtivos,
      _totalBancos,
      _bancosAtivos,
      _totalTitulos,
      titulosAtivos,
      _titulosPagos,
      _carnesPendentes
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

    return titulos.map(titulo => {
      const tituloWithCliente = titulo as TituloWithCliente;
      return {
        id: titulo.id,
        numero_titulo: titulo.numero_titulo,
        cliente: tituloWithCliente.cliente?.razao_social || 'N/A',
        valor: titulo.valor,
        status: titulo.status,
        data: titulo.created_at.toLocaleDateString('pt-BR')
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

  private static async getReceberMesAtualData() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mesIndex = agora.getMonth();
    const inicioMes = new Date(ano, mesIndex, 1, 0, 0, 0, 0);
    const fimMes = new Date(ano, mesIndex + 1, 0, 23, 59, 59, 999);
    const diasNoMes = fimMes.getDate();

    const titulosMes = await Titulo.findAll({
      attributes: ['valor', 'data_vencimento'],
      where: {
        data_vencimento: {
          [Op.between]: [inicioMes, fimMes]
        },
        status: {
          [Op.in]: ['pendente', 'vencido']
        }
      }
    });

    const valoresPorDia = new Array(diasNoMes).fill(0);

    for (const titulo of titulosMes) {
      if (!titulo.data_vencimento) {
        continue;
      }
      const data = new Date(titulo.data_vencimento);
      const dia = data.getDate();
      const indice = dia - 1;
      const valorTitulo = parseFloat(titulo.valor.toString());
      valoresPorDia[indice] += valorTitulo;
    }

    const labels = Array.from({ length: diasNoMes }, (_, index) => {
      const dia = index + 1;
      return `${String(dia).padStart(2, '0')}/${String(mesIndex + 1).padStart(2, '0')}`;
    });

    return {
      labels,
      data: valoresPorDia
    };
  }
}
