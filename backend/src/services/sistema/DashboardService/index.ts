import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Contrato } from '../../../models/contratos/Contrato';
import { ContaPagar } from '../../../models/financeiro/ContaPagar';
import { Op } from 'sequelize';

export class DashboardService {
  /**
   * Buscar contratos do período
   */
  static async getContratosPeriodo(inicioPeriodo: Date, fimPeriodo: Date): Promise<Contrato[]> {
    return await Contrato.findAll({ 
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
  }

  /**
   * Buscar contratos ativos
   */
  static async getContratosAtivos(): Promise<Contrato[]> {
    return await Contrato.findAll({
      attributes: ['id', 'status', 'plano_id', 'cliente_id', 'valor_final'],
      where: { status: 'ativo' },
      include: [
        {
          association: 'cliente',
          attributes: ['id', 'ativo']
        },
        {
          association: 'plano',
          attributes: ['id', 'nome_plano', 'valor_mensal']
        }
      ]
    });
  }

  /**
   * Buscar todos os contratos
   */
  static async getAllContratos(): Promise<Contrato[]> {
    return await Contrato.findAll({ 
      attributes: ['id', 'status', 'plano_id', 'cliente_id', 'isento_mensalidade']
    });
  }

  /**
   * Buscar clientes do período
   */
  static async getClientesPeriodo(inicioPeriodo: Date, fimPeriodo: Date): Promise<Cliente[]> {
    return await Cliente.findAll({ 
      attributes: ['id', 'ativo', 'created_at'],
      where: {
        created_at: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        }
      }
    });
  }

  /**
   * Buscar todos os clientes
   */
  static async getAllClientes(): Promise<Cliente[]> {
    return await Cliente.findAll({ 
      attributes: ['id', 'ativo', 'created_at']
    });
  }

  /**
   * Buscar planos ativos
   */
  static async getPlanosAtivos(): Promise<Plano[]> {
    return await Plano.findAll({ 
      attributes: ['id', 'status', 'nome_plano', 'tipo_servico'],
      where: { status: 'ativo' }
    });
  }

  /**
   * Buscar títulos do período
   */
  static async getTitulosPeriodo(inicioPeriodo: Date, fimPeriodo: Date): Promise<Titulo[]> {
    return await Titulo.findAll({ 
      attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at'],
      where: {
        data_vencimento: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        }
      }
    });
  }

  /**
   * Buscar todos os títulos
   */
  static async getAllTitulos(): Promise<Titulo[]> {
    return await Titulo.findAll({ 
      attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at']
    });
  }

  /**
   * Buscar títulos com filtros
   */
  static async getTitulos(where: any, attributes?: string[]): Promise<Titulo[]> {
    return await Titulo.findAll({
      attributes: attributes || ['id', 'valor', 'status', 'data_vencimento', 'created_at'],
      where
    });
  }

  /**
   * Buscar clientes com filtros
   */
  static async getClientes(where: any, attributes?: string[]): Promise<Cliente[]> {
    return await Cliente.findAll({
      attributes: attributes || ['id', 'ativo', 'created_at'],
      where
    });
  }

  /**
   * Buscar títulos com includes
   */
  static async getTitulosWithIncludes(where: any, options?: { limit?: number; order?: any[]; include?: any[] }): Promise<Titulo[]> {
    const { TituloService } = await import('../../financeiro/TituloService');
    return await TituloService.findAllWithFilters(where, {
      include: options?.include || [],
      order: options?.order || [['created_at', 'DESC']],
      limit: options?.limit
    });
  }

  /**
   * Obter estatísticas do dashboard
   */
  static async getStatsData(startDate?: Date, endDate?: Date) {
    const { ClienteService } = await import('../../clientes/ClienteService');
    const { PlanoService } = await import('../../cadastros/PlanoService');
    const { BancoService } = await import('../../cadastros/BancoService');
    const { TituloService } = await import('../../financeiro/TituloService');

    const inicioPeriodo = startDate ? new Date(startDate) : undefined;
    const fimPeriodo = endDate ? new Date(endDate) : undefined;
    
    if (inicioPeriodo) inicioPeriodo.setHours(0, 0, 0, 0);
    if (fimPeriodo) fimPeriodo.setHours(23, 59, 59, 999);

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
      planosAtivos,
      titulosAtivos
    ] = await Promise.all([
      ClienteService.count(clienteWhere),
      ClienteService.count({ ...clienteWhere, ativo: true }),
      PlanoService.count({ ...planoWhere, status: 'ativo' }),
      TituloService.count({ ...tituloWhere, status: 'vencido' })
    ]);

    const titulos = await TituloService.findAllWithFilters(tituloWhere);

    let valorTotalPago = 0;
    let valorTotalPendente = 0;

    for (const titulo of titulos) {
      const valorTitulo = parseFloat(titulo.valor.toString());
      if (titulo.status === 'pago') {
        valorTotalPago += valorTitulo;
      } else if (titulo.status === 'pendente' || titulo.status === 'vencido') {
        valorTotalPendente += valorTitulo;
      }
    }

    const contratos = await this.getContratosAtivos();
    const totalValorContratos = contratos.reduce((acumulado, contrato) => {
      return acumulado + parseFloat(String(contrato.valor_final || 0));
    }, 0);

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
      titulosVencidos: await TituloService.count(titulosVencidosWhere),
      valorTotalReceber: valorTotalPendente,
      valorTotalRecebido: valorTotalPago,
      receitaMensal: valorTotalPago,
      crescimentoMensal: 0,
      ticketMedio: totalClientes > 0
        ? totalValorContratos / totalClientes
        : 0
    };
  }

  /**
   * Obter títulos recentes formatados
   */
  static async getTitulosRecentesData(limit: number): Promise<Array<{
    id: number;
    numero_titulo: string;
    cliente: string;
    valor: number;
    status: string;
    data: string;
  }>> {
    const { formatDate } = await import('../../../utils/dateUtils');
    const titulos = await this.getTitulosWithIncludes({}, {
      limit,
      order: [['created_at', 'DESC']],
      include: [
        { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia'] },
        { association: 'plano', attributes: ['id', 'nome_plano'] },
        { association: 'banco', attributes: ['id', 'nome', 'tipo_banco'] }
      ]
    });

    return titulos.map(titulo => {
      const tituloWithCliente = titulo as any;
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

  /**
   * Obter títulos vencidos formatados
   */
  static async getTitulosVencidosData(limit: number): Promise<Array<{
    id: number;
    numero_titulo: string;
    cliente: string;
    valor: number;
    status: string;
    data_vencimento: string;
    dias_atraso: number;
  }>> {
    const { TituloService } = await import('../../financeiro/TituloService');
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const titulos = await TituloService.findAllWithFilters({
      data_vencimento: { [Op.lte]: hoje },
      status: 'pendente'
    }, {
      include: [
        { association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'email'] }
      ],
      order: [['data_vencimento', 'ASC']],
      limit
    });

    const { formatDate } = await import('../../../utils/dateUtils');
    
    return titulos.map(titulo => {
      const tituloWithCliente = titulo as any;
      const dataVencimento = titulo.data_vencimento ? new Date(titulo.data_vencimento) : new Date();
      const diasAtraso = Math.floor((hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: Number(titulo.id),
        numero_titulo: titulo.numero_titulo,
        valor: Number(titulo.valor),
        data_vencimento: formatDate(dataVencimento) || 'N/A',
        cliente: tituloWithCliente.cliente?.razao_social || 'N/A',
        status: titulo.status,
        dias_atraso: Math.max(0, diasAtraso)
      };
    });
  }

  /**
   * Obter receber por período
   */
  static async getReceberPorPeriodoData(startDate: Date, endDate: Date) {
    const { TituloService } = await import('../../financeiro/TituloService');
    const { formatDate, parseDateFromDb } = await import('../../../utils/dateUtils');

    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulosPeriodo = await TituloService.findAllWithFilters({
      data_vencimento: {
        [Op.between]: [inicio, fim]
      },
      status: {
        [Op.in]: ['pendente', 'vencido']
      }
    }, {
      attributes: ['valor', 'data_vencimento']
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

  /**
   * Obter recebidos por período
   */
  static async getRecebidosPorPeriodoData(startDate: Date, endDate: Date) {
    const { TituloService } = await import('../../financeiro/TituloService');
    const { formatDate, parseDateFromDb } = await import('../../../utils/dateUtils');

    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulosPeriodo = await TituloService.findAllWithFilters({
      data_pagamento: {
        [Op.between]: [inicio, fim]
      },
      status: {
        [Op.in]: ['pago', 'pago_atraso', 'parcial']
      }
    }, {
      attributes: ['valor', 'valor_pago', 'status', 'data_pagamento']
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

  /**
   * Obter resumo financeiro do período
   */
  static async getResumoFinanceiroPeriodo(startDate: Date, endDate: Date) {
    const { TituloService } = await import('../../financeiro/TituloService');
    
    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const titulosPeriodo = await TituloService.findAllWithFilters({
      data_vencimento: {
        [Op.between]: [inicio, fim]
      }
    }, {
      attributes: ['valor', 'valor_pago', 'status', 'cliente_id', 'data_vencimento']
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
          totalPrevisto += valorTitulo;
          break;
        case 'parcial':
          totalRecebido += Math.min(valorPago, valorTitulo);
          const valorPendenteParcial = Math.max(valorTitulo - valorPago, 0);
          totalPendente += valorPendenteParcial;
          totalPrevisto += valorTitulo;
          break;
        case 'pendente':
        case 'vencido':
          totalPendente += valorTitulo;
          totalPrevisto += valorTitulo;
          break;
        case 'cancelado':
          break;
        default:
          totalPendente += valorTitulo;
          totalPrevisto += valorTitulo;
          break;
      }
    }

    const contratosAtivos = await this.getContratosAtivos();

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

  /**
   * Obter contas a pagar por período
   */
  static async getContasPagarPorPeriodoData(startDate: Date, endDate: Date) {
    const { ContaPagarService } = await import('../../financeiro/ContaPagarService');
    const { formatDate, parseDateFromDb } = await import('../../../utils/dateUtils');

    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const contasPagarPeriodo = await ContaPagarService.findAllWithAttributes(['valor', 'data_vencimento', 'data_pagamento', 'status']);

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const conta of contasPagarPeriodo) {
      if (!conta.data_vencimento || conta.status === 'CANCELADO') {
        continue;
      }
      const dataConta = parseDateFromDb(conta.data_vencimento);
      if (!dataConta) continue;

      dataConta.setHours(0, 0, 0, 0);
      const diff = dataConta.getTime() - inicio.getTime();
      const indice = Math.floor(diff / MS_POR_DIA);
      if (indice >= 0 && indice < valoresPorDia.length) {
        const valorConta = parseFloat(conta.valor.toString());
        valoresPorDia[indice] += valorConta;
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

  /**
   * Obter contas a pagar dos últimos 12 meses
   */
  static async getContasPagarUltimos12Meses() {
    const { ContaPagarService } = await import('../../financeiro/ContaPagarService');
    const { parseDateFromDb } = await import('../../../utils/dateUtils');

    const hoje = new Date();
    const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    const inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1, 0, 0, 0, 0);

    const contasPagar = await ContaPagarService.findAllWithAttributes(['valor', 'data_vencimento', 'data_pagamento', 'status']);

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1, 0, 0, 0, 0);
      const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1, 0, 0, 0, 0);

      const totalMes = contasPagar.reduce((acumulado, conta) => {
        if (!conta.data_vencimento || conta.status === 'CANCELADO') {
          return acumulado;
        }

        const dataVencimento = parseDateFromDb(conta.data_vencimento);
        if (!dataVencimento) {
          return acumulado;
        }

        if (dataVencimento >= mes && dataVencimento < proxMes) {
          const valorConta = parseFloat(conta.valor.toString());
          return acumulado + valorConta;
        }

        return acumulado;
      }, 0);

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

  /**
   * Obter receita dos últimos 12 meses (faturamento total)
   */
  static async getReceitaUltimos12Meses() {
    const { TituloService } = await import('../../financeiro/TituloService');
    const { parseDateFromDb } = await import('../../../utils/dateUtils');

    const hoje = new Date();
    const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    const inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1, 0, 0, 0, 0);

    const titulos = await TituloService.findAllWithFilters({
      data_vencimento: {
        [Op.between]: [inicioPeriodo, fimPeriodo]
      }
    }, {
      attributes: ['valor', 'valor_pago', 'status', 'data_pagamento', 'data_vencimento']
    });

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1, 0, 0, 0, 0);
      const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1, 0, 0, 0, 0);

      const totalMes = titulos.reduce((acumulado, titulo) => {
        if (titulo.status === 'cancelado') {
          return acumulado;
        }

        const referencia = parseDateFromDb(titulo.data_vencimento);

        if (!referencia) {
          return acumulado;
        }

        if (referencia >= mes && referencia < proxMes) {
          // Soma o valor total do título (faturamento total do mês, independente se foi pago ou não)
          const valorTitulo = parseFloat(titulo.valor.toString());
          return acumulado + valorTitulo;
        }

        return acumulado;
      }, 0);

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

