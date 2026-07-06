import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Titulo } from '../../../models/financeiro/Titulo';
import { Contrato } from '../../../models/contratos/Contrato';
import { ContaPagar } from '../../../models/financeiro/ContaPagar';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/database';
import { formatDateISOForAPI, formatDateOnly } from '../../../utils/timezoneUtils';
import { logger } from '../../../utils/logger';
import { FinancialCalculationsService } from '../../FinancialCalculationsService';
export type BackupStatusGraficoDia = {
  label: string;
  dataISO: string;
  falha: number;
  sucesso: number;
  somente_local: number;
  falha_envio: number;
  verificado: number;
};

export type BackupStatusDetalheItem = {
  /** Identificador da linha (arquivo de backup ou evento) */
  id: string;
  deviceId: string;
  deviceName: string;
  fileName: string | null;
  sizeBytes: number | null;
  /** Início aproximado (evento sucesso antes do arquivo) ou instante do evento */
  startedAt: string | null;
  /** Fim: `created_at` do arquivo ou do evento */
  finishedAt: string | null;
  detail: string | null;
};

/** Resultado do gráfico de contratos (ERP): em atraso (título vencido não pago) e ativos sem duplicar fatia “em atraso”. */
export interface ContratosAtrasoPeriodoResult {
  contratosEmAtraso: number;
  contratosAtivosDashboard: number;
}

type ContratoDashJson = { id: number; status: string; cliente_id: number };
type TituloDashJson = {
  contrato_id?: number | null;
  cliente_id: number;
  pago: boolean;
  status: string;
  data_vencimento: string | Date;
};

export class DashboardService {
  /** Mensalidade efetiva do contrato (valor_final ou plano com desconto). */
  static calcValorMensalidadeContrato(fields: {
    valor_final?: number | string | null;
    desconto_valor?: number | string | null;
    desconto_percentual?: number | string | null;
    valor_mensal?: number | string | null;
  }): number {
    const vf = fields.valor_final != null ? parseFloat(String(fields.valor_final)) : 0;
    if (vf > 0) return vf;
    const vm = fields.valor_mensal != null ? parseFloat(String(fields.valor_mensal)) : 0;
    if (vm <= 0) return 0;
    const descontoValor =
      fields.desconto_valor != null && fields.desconto_valor !== ''
        ? parseFloat(String(fields.desconto_valor))
        : null;
    const descontoPercentual =
      fields.desconto_percentual != null && fields.desconto_percentual !== ''
        ? parseFloat(String(fields.desconto_percentual))
        : null;
    return FinancialCalculationsService.calcularDesconto(vm, {
      desconto_valor: descontoValor,
      desconto_percentual: descontoPercentual,
    }).valorFinal;
  }

  /**
   * Buscar contratos do período
   */
  static async getContratosPeriodo(inicioPeriodo: Date, fimPeriodo: Date, empresaId?: number | null): Promise<Contrato[]> {
    const where: Record<string, unknown> = {
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
        },
        ...(empresaId != null ? [{ empresa_id: empresaId }] : [])
      ]
    };
    return await Contrato.findAll({ 
      attributes: ['id', 'status', 'plano_id', 'cliente_id', 'valor_final', 'data_inicio', 'data_fim', 'created_at'],
      where: where as any
    });
  }

  /**
   * Buscar contratos ativos
   */
  static async getContratosAtivos(empresaId?: number | null): Promise<Contrato[]> {
    const where: Record<string, unknown> = { status: 'ativo' };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    return await Contrato.findAll({
      attributes: [
        'id',
        'status',
        'plano_id',
        'cliente_id',
        'valor_final',
        'desconto_valor',
        'desconto_percentual',
        'isento_mensalidade',
      ],
      where,
      include: [
        {
          association: 'cliente',
          attributes: ['id', 'ativo'],
          where: { ativo: true },
          required: true,
        },
        {
          association: 'plano',
          attributes: ['id', 'nome_plano', 'valor_mensal', 'tipo_servico'],
          where: { status: 'ativo' },
          required: true,
        },
      ],
    });
  }

  /**
   * Quantidade de clientes (distintos) por tipo de serviço do plano — gráfico "Distribuição por Tipo de Plano".
   */
  static async getClientesPorTipoPlano(empresaId?: number | null): Promise<Array<{ tipo_servico: string; quantidade: number }>> {
    const empresaFilter = empresaId != null ? ' AND c.empresa_id = :empresaId' : '';
    const replacements: Record<string, number> = {};
    if (empresaId != null) {
      replacements.empresaId = empresaId;
    }
    const rows = await sequelize.query<{ tipo_servico: string; quantidade: string }>(
      `SELECT tipo_servico, COUNT(*) as quantidade FROM (
        SELECT DISTINCT c.cliente_id, p.tipo_servico FROM contratos c
        INNER JOIN cadastros_planos p ON c.plano_id = p.id
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.status = 'ativo' AND c.cliente_id IS NOT NULL AND cl.ativo = 1 AND p.status = 'ativo'${empresaFilter}
        UNION
        SELECT DISTINCT c.cliente_id, p.tipo_servico FROM contratos_planos_adicionais cpa
        INNER JOIN contratos c ON cpa.contrato_id = c.id
        INNER JOIN cadastros_planos p ON cpa.plano_id = p.id
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.status = 'ativo' AND cpa.status = 'ativo' AND cl.ativo = 1 AND p.status = 'ativo'${empresaFilter}
      ) AS sub GROUP BY tipo_servico`,
      { type: QueryTypes.SELECT, replacements: Object.keys(replacements).length ? replacements : undefined }
    );
    return rows.map((r) => ({ tipo_servico: r.tipo_servico, quantidade: parseInt(r.quantidade, 10) || 0 }));
  }

  /** Valor mensal efetivo do contrato (valor_final ou plano com desconto). */
  private static sqlValorMensalidadeContrato(contratoAlias: string, planoAlias: string): string {
    const c = contratoAlias;
    const p = planoAlias;
    return `CASE
      WHEN ${c}.valor_final IS NOT NULL AND ${c}.valor_final > 0 THEN ${c}.valor_final
      WHEN ${c}.desconto_valor IS NOT NULL AND ${c}.desconto_valor > 0
        THEN GREATEST(0, ${p}.valor_mensal - ${c}.desconto_valor)
      WHEN ${c}.desconto_percentual IS NOT NULL AND ${c}.desconto_percentual > 0
        THEN GREATEST(0, ${p}.valor_mensal * (1 - ${c}.desconto_percentual / 100))
      ELSE COALESCE(${p}.valor_mensal, 0)
    END`;
  }

  /**
   * Ticket médio por tipo de serviço: soma das mensalidades efetivas ÷ clientes distintos do tipo.
   */
  static async getTicketMedioPorTipoServico(empresaId?: number | null): Promise<
    Array<{ tipo_servico: string; quantidade: number; ticket_medio: number }>
  > {
    const empresaFilterC = empresaId != null ? ' AND c.empresa_id = :empresaId' : '';
    const empresaFilterCpa = empresaId != null ? ' AND cpa.empresa_id = :empresaId' : '';
    const replacements: Record<string, number> = {};
    if (empresaId != null) {
      replacements.empresaId = empresaId;
    }
    const valorC = this.sqlValorMensalidadeContrato('c', 'p');
    const valorCpa = this.sqlValorMensalidadeContrato('cpa', 'p');
    const rows = await sequelize.query<{ tipo_servico: string; quantidade: string; soma_valor: string }>(
      `SELECT tipo_servico,
        COUNT(DISTINCT cliente_id) AS quantidade,
        COALESCE(SUM(valor_contrato), 0) AS soma_valor
      FROM (
        SELECT c.cliente_id, p.tipo_servico, ${valorC} AS valor_contrato
        FROM contratos c
        INNER JOIN cadastros_planos p ON c.plano_id = p.id
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.status = 'ativo' AND c.cliente_id IS NOT NULL
          AND c.isento_mensalidade = 0 AND cl.ativo = 1 AND p.status = 'ativo'${empresaFilterC}
        UNION ALL
        SELECT c.cliente_id, p.tipo_servico, ${valorCpa} AS valor_contrato
        FROM contratos_planos_adicionais cpa
        INNER JOIN contratos c ON cpa.contrato_id = c.id
        INNER JOIN cadastros_planos p ON cpa.plano_id = p.id
        INNER JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.status = 'ativo' AND cpa.status = 'ativo' AND c.cliente_id IS NOT NULL
          AND c.isento_mensalidade = 0 AND cl.ativo = 1 AND p.status = 'ativo'${empresaFilterCpa}
      ) AS sub
      GROUP BY tipo_servico
      HAVING COUNT(DISTINCT cliente_id) > 0
      ORDER BY soma_valor DESC`,
      { type: QueryTypes.SELECT, replacements: Object.keys(replacements).length ? replacements : undefined }
    );
    return rows.map((r) => {
      const quantidade = parseInt(r.quantidade, 10) || 0;
      const soma = parseFloat(r.soma_valor) || 0;
      return {
        tipo_servico: r.tipo_servico,
        quantidade,
        ticket_medio: quantidade > 0 ? soma / quantidade : 0,
      };
    });
  }

  /**
   * Buscar todos os contratos
   */
  static async getAllContratos(empresaId?: number | null): Promise<Contrato[]> {
    const where: Record<string, unknown> = {};
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    return await Contrato.findAll({ 
      attributes: ['id', 'status', 'plano_id', 'cliente_id', 'isento_mensalidade'],
      where: Object.keys(where).length ? where : undefined
    });
  }

  /**
   * Buscar clientes do período
   */
  static async getClientesPeriodo(inicioPeriodo: Date, fimPeriodo: Date, empresaId?: number | null): Promise<Cliente[]> {
    const where: Record<string, unknown> = {
      created_at: {
        [Op.between]: [inicioPeriodo, fimPeriodo]
      }
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    return await Cliente.findAll({ 
      attributes: ['id', 'ativo', 'created_at'],
      where
    });
  }

  /**
   * Buscar todos os clientes
   */
  static async getAllClientes(empresaId?: number | null): Promise<Cliente[]> {
    const where: Record<string, unknown> = {};
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    return await Cliente.findAll({ 
      attributes: ['id', 'ativo', 'created_at'],
      where: Object.keys(where).length ? where : undefined
    });
  }

  /**
   * Buscar planos ativos
   */
  static async getPlanosAtivos(empresaId?: number | null): Promise<Plano[]> {
    const where: Record<string, unknown> = { status: 'ativo' };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    return await Plano.findAll({ 
      attributes: ['id', 'status', 'nome_plano', 'tipo_servico'],
      where
    });
  }

  /**
   * Buscar títulos do período
   */
  static async getTitulosPeriodo(inicioPeriodo: Date, fimPeriodo: Date, empresaId?: number | null): Promise<Titulo[]> {
    const where: Record<string, unknown> = {
      data_vencimento: {
        [Op.between]: [inicioPeriodo, fimPeriodo]
      }
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    return await Titulo.findAll({ 
      attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at'],
      where
    });
  }

  /**
   * Buscar todos os títulos
   */
  static async getAllTitulos(empresaId?: number | null): Promise<Titulo[]> {
    const where: Record<string, unknown> = {};
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    return await Titulo.findAll({
      attributes: [
        'id',
        'valor',
        'status',
        'data_vencimento',
        'created_at',
        'contrato_id',
        'cliente_id',
        'pago',
      ],
      where: Object.keys(where).length ? where : undefined
    });
  }

  /**
   * Contratos em atraso para o gráfico e total de ativos (sem duplicar fatia “em atraso”).
   * Atraso = contrato ativo com título não pago (pendente/vencido) e vencimento antes de hoje — independente do período do dashboard.
   */
  static computeContratosAtrasoPeriodo(
    contratosTodos: ContratoDashJson[],
    titulosTodos: TituloDashJson[]
  ): ContratosAtrasoPeriodoResult {
    const hojeStr = formatDateISOForAPI(new Date())?.slice(0, 10) ?? '';

    const ativoIds = new Set(contratosTodos.filter((c) => c.status === 'ativo').map((c) => c.id));
    const ativoPorCliente = new Map<number, number>();
    for (const c of contratosTodos) {
      if (c.status !== 'ativo') continue;
      if (!ativoPorCliente.has(c.cliente_id)) ativoPorCliente.set(c.cliente_id, c.id);
    }

    const ids = new Set<number>();
    for (const t of titulosTodos) {
      if (t.pago === true) continue;
      if (t.status !== 'pendente' && t.status !== 'vencido') continue;
      const venc =
        typeof t.data_vencimento === 'string'
          ? t.data_vencimento.slice(0, 10)
          : (formatDateISOForAPI(t.data_vencimento as Date) ?? '').slice(0, 10);
      if (!venc || venc >= hojeStr) continue;
      let cid = t.contrato_id;
      if (cid == null && t.cliente_id != null) {
        cid = ativoPorCliente.get(t.cliente_id);
      }
      if (cid == null || !ativoIds.has(cid)) continue;
      ids.add(cid);
    }

    const contratosEmAtraso = ids.size;
    const contratosAtivosBase = contratosTodos.filter((c) => c.status === 'ativo').length;
    const contratosAtivosDashboard = Math.max(0, contratosAtivosBase - contratosEmAtraso);
    return { contratosEmAtraso, contratosAtivosDashboard };
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
  static async getStatsData(startDate?: Date, endDate?: Date, empresaId?: number | null) {
    const { ClienteService } = await import('../../clientes/ClienteService');
    const { PlanoService } = await import('../../cadastros/PlanoService');
    const { BancoService } = await import('../../cadastros/BancoService');
    const { TituloService } = await import('../../financeiro/TituloService');

    const inicioPeriodo = startDate ? new Date(startDate) : undefined;
    const fimPeriodo = endDate ? new Date(endDate) : undefined;
    
    if (inicioPeriodo) inicioPeriodo.setHours(0, 0, 0, 0);
    if (fimPeriodo) fimPeriodo.setHours(23, 59, 59, 999);

    const empresaFilter = empresaId != null ? { empresa_id: empresaId } : {};

    const clienteWhere = {
      ...(inicioPeriodo && fimPeriodo ? {
        created_at: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        }
      } : {}),
      ...empresaFilter
    };

    const planoWhere = {
      ...(inicioPeriodo && fimPeriodo ? {
        created_at: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        }
      } : {}),
      status: 'ativo',
      ...empresaFilter
    };

    const tituloWhere = {
      ...(inicioPeriodo && fimPeriodo ? {
        data_vencimento: {
          [Op.between]: [inicioPeriodo, fimPeriodo]
        }
      } : {}),
      ...empresaFilter
    };

    const [
      totalClientes,
      clientesAtivos,
      planosAtivos,
      titulosAtivos
    ] = await Promise.all([
      ClienteService.count(clienteWhere),
      ClienteService.count({ ...clienteWhere, ativo: true }),
      PlanoService.count(planoWhere),
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

    const contratos = await this.getContratosAtivos(empresaId);
    let totalValorContratos = 0;
    for (const contrato of contratos) {
      if (contrato.isento_mensalidade) continue;
      const row = contrato.toJSON() as {
        plano?: { valor_mensal?: number | string };
        desconto_valor?: number | string | null;
        desconto_percentual?: number | string | null;
      };
      totalValorContratos += this.calcValorMensalidadeContrato({
        valor_final: contrato.valor_final,
        desconto_valor: row.desconto_valor,
        desconto_percentual: row.desconto_percentual,
        valor_mensal: row.plano?.valor_mensal,
      });
    }

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
      status: 'pendente',
      ...empresaFilter
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
  static async getTitulosRecentesData(limit: number, empresaId?: number | null): Promise<Array<{
    id: number;
    numero_titulo: string;
    cliente: string;
    valor: number;
    status: string;
    data: string;
  }>> {
    const { formatDate } = await import('../../../utils/dateUtils');
    const where: Record<string, unknown> = {};
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const titulos = await this.getTitulosWithIncludes(where, {
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
  static async getTitulosVencidosData(limit: number, empresaId?: number | null): Promise<Array<{
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

    const where: Record<string, unknown> = {
      data_vencimento: { [Op.lte]: hoje },
      status: 'pendente'
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const titulos = await TituloService.findAllWithFilters(where, {
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
  static async getReceberPorPeriodoData(startDate: Date, endDate: Date, empresaId?: number | null) {
    const { TituloService } = await import('../../financeiro/TituloService');
    const { formatDate, getStartOfLocalDay } = await import('../../../utils/dateUtils');

    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const where: Record<string, unknown> = {
      data_vencimento: {
        [Op.between]: [inicio, fim]
      },
      status: {
        [Op.in]: ['pendente', 'vencido']
      }
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const titulosPeriodo = await TituloService.findAllWithFilters(where, {
      attributes: ['valor', 'data_vencimento']
    });

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const titulo of titulosPeriodo) {
      if (!titulo.data_vencimento) {
        continue;
      }
      const inicioDiaLocal = getStartOfLocalDay(titulo.data_vencimento);
      if (!inicioDiaLocal) continue;
      const diff = inicioDiaLocal.getTime() - inicio.getTime();
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
  static async getRecebidosPorPeriodoData(startDate: Date, endDate: Date, empresaId?: number | null) {
    const { TituloService } = await import('../../financeiro/TituloService');
    const { formatDate, getStartOfLocalDay } = await import('../../../utils/dateUtils');

    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const where: Record<string, unknown> = {
      data_pagamento: {
        [Op.between]: [inicio, fim]
      },
      status: {
        [Op.in]: ['pago', 'pago_atraso', 'parcial']
      }
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const titulosPeriodo = await TituloService.findAllWithFilters(where, {
      attributes: ['valor', 'valor_pago', 'status', 'data_pagamento']
    });

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const titulo of titulosPeriodo) {
      if (!titulo.data_pagamento) {
        continue;
      }

      // Usar dia local (mesmo critério do filtro da lista Contas a Receber) para alinhar gráfico e lista
      const inicioDiaLocal = getStartOfLocalDay(titulo.data_pagamento);
      if (!inicioDiaLocal) continue;
      const diff = inicioDiaLocal.getTime() - inicio.getTime();
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
  static async getResumoFinanceiroPeriodo(startDate: Date, endDate: Date, empresaId?: number | null) {
    const { TituloService } = await import('../../financeiro/TituloService');
    
    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      data_vencimento: {
        [Op.between]: [inicio, fim]
      }
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const titulosPeriodo = await TituloService.findAllWithFilters(where, {
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

    const contratosAtivos = await this.getContratosAtivos(empresaId);
    const { ContratoPlanoAdicional } = await import('../../../models/contratos/ContratoPlanoAdicional');
    const adicionaisWhere: Record<string, unknown> = { status: 'ativo' };
    if (empresaId != null) {
      adicionaisWhere.empresa_id = empresaId;
    }
    const planosAdicionais = await ContratoPlanoAdicional.findAll({
      where: adicionaisWhere,
      attributes: ['valor_final', 'desconto_valor', 'desconto_percentual'],
      include: [
        {
          association: 'contrato',
          attributes: ['cliente_id', 'isento_mensalidade'],
          where: { status: 'ativo' },
          required: true,
          include: [
            { association: 'cliente', attributes: ['id'], where: { ativo: true }, required: true },
          ],
        },
        {
          association: 'plano',
          attributes: ['valor_mensal'],
          where: { status: 'ativo' },
          required: true,
        },
      ],
    });

    let valorTotalPlanos = 0;
    const clientesComPlanos = new Set<number>();

    for (const contrato of contratosAtivos) {
      if (contrato.isento_mensalidade || !contrato.cliente_id) continue;
      const row = contrato.toJSON() as {
        plano?: { valor_mensal?: number | string };
        desconto_valor?: number | string | null;
        desconto_percentual?: number | string | null;
      };
      const valor = this.calcValorMensalidadeContrato({
        valor_final: contrato.valor_final,
        desconto_valor: row.desconto_valor,
        desconto_percentual: row.desconto_percentual,
        valor_mensal: row.plano?.valor_mensal,
      });
      if (valor <= 0) continue;
      clientesComPlanos.add(contrato.cliente_id);
      valorTotalPlanos += valor;
    }

    for (const adicional of planosAdicionais) {
      const row = adicional.toJSON() as {
        valor_final?: number | string | null;
        desconto_valor?: number | string | null;
        desconto_percentual?: number | string | null;
        contrato?: { cliente_id?: number; isento_mensalidade?: boolean };
        plano?: { valor_mensal?: number | string };
      };
      if (row.contrato?.isento_mensalidade || !row.contrato?.cliente_id) continue;
      const valor = this.calcValorMensalidadeContrato({
        valor_final: row.valor_final,
        desconto_valor: row.desconto_valor,
        desconto_percentual: row.desconto_percentual,
        valor_mensal: row.plano?.valor_mensal,
      });
      if (valor <= 0) continue;
      clientesComPlanos.add(row.contrato.cliente_id);
      valorTotalPlanos += valor;
    }

    const ticketMedio = clientesComPlanos.size > 0 ? valorTotalPlanos / clientesComPlanos.size : 0;

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
  static async getContasPagarPorPeriodoData(startDate: Date, endDate: Date, empresaId?: number | null) {
    const { ContaPagarService } = await import('../../financeiro/ContaPagarService');
    const { formatDate, getStartOfLocalDay } = await import('../../../utils/dateUtils');

    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const where: Record<string, unknown> = {};
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const contasPagarPeriodo = await ContaPagarService.findAllWithAttributes(
      ['valor', 'data_vencimento', 'data_pagamento', 'status'],
      Object.keys(where).length ? where : undefined
    );

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const conta of contasPagarPeriodo) {
      if (!conta.data_vencimento || conta.status === 'CANCELADO') {
        continue;
      }
      const inicioDiaLocal = getStartOfLocalDay(conta.data_vencimento);
      if (!inicioDiaLocal) continue;
      const diff = inicioDiaLocal.getTime() - inicio.getTime();
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
  static async getContasPagarUltimos12Meses(empresaId?: number | null) {
    const { ContaPagarService } = await import('../../financeiro/ContaPagarService');
    const { getStartOfLocalDay } = await import('../../../utils/dateUtils');

    const hoje = new Date();
    const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    const inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1, 0, 0, 0, 0);

    const where: Record<string, unknown> = {};
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const contasPagar = await ContaPagarService.findAllWithAttributes(
      ['valor', 'data_vencimento', 'data_pagamento', 'status'],
      Object.keys(where).length ? where : undefined
    );

    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1, 0, 0, 0, 0);
      const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1, 0, 0, 0, 0);

      const totalMes = contasPagar.reduce((acumulado, conta) => {
        if (!conta.data_vencimento || conta.status === 'CANCELADO') {
          return acumulado;
        }

        const inicioDiaLocal = getStartOfLocalDay(conta.data_vencimento);
        if (!inicioDiaLocal) {
          return acumulado;
        }

        if (inicioDiaLocal >= mes && inicioDiaLocal < proxMes) {
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
  static async getReceitaUltimos12Meses(empresaId?: number | null) {
    const { TituloService } = await import('../../financeiro/TituloService');
    const { getStartOfLocalDay } = await import('../../../utils/dateUtils');

    const hoje = new Date();
    const fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    const inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1, 0, 0, 0, 0);

    const where: Record<string, unknown> = {
      data_vencimento: {
        [Op.between]: [inicioPeriodo, fimPeriodo]
      }
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    }
    const titulos = await TituloService.findAllWithFilters(where, {
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

        const referencia = getStartOfLocalDay(titulo.data_vencimento);

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

  /** Sempre `YYYY-MM-DD`, alinhado ao `DATE()` do MySQL e ao filtro `DATE(created_at) = :dia`. */
  private static normalizeDiaSQL(v: unknown): string {
    if (v instanceof Date) {
      return formatDateOnly(v) ?? v.toISOString().slice(0, 10);
    }
    if (typeof v === 'string') {
      return v.slice(0, 10);
    }
    return String(v).slice(0, 10);
  }

  /**
   * Série diária de status de backup (tabela ssh_manager_device_backup_events), para gráfico empilhado no dashboard.
   */
  static async getBackupStatusGrafico(
    startDate: Date,
    endDate: Date,
    empresaId?: number | null
  ): Promise<BackupStatusGraficoDia[]> {
    const inicio = new Date(startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(endDate);
    fim.setHours(23, 59, 59, 999);

    /** Eventos podem ter `empresa_id` NULL (gravado a partir do device); o tenant do equipamento em `ssh_manager_devices` vale. */
    const empresaClause =
      empresaId != null
        ? ' AND (e.empresa_id = :empresaId OR (e.empresa_id IS NULL AND d.empresa_id = :empresaId))'
        : '';
    const replacements: Record<string, unknown> = { inicio, fim };
    if (empresaId != null) {
      replacements.empresaId = empresaId;
    }

    const rows = await sequelize.query<{ dia: unknown; status: string; total: string | number }>(
      `SELECT DATE_FORMAT(e.created_at, '%Y-%m-%d') AS dia, e.status, COUNT(*) AS total
       FROM ssh_manager_device_backup_events e
       INNER JOIN ssh_manager_devices d ON d.id = e.ssh_device_id
       WHERE e.created_at >= :inicio AND e.created_at <= :fim${empresaClause}
       GROUP BY DATE_FORMAT(e.created_at, '%Y-%m-%d'), e.status`,
      { replacements, type: QueryTypes.SELECT }
    );

    const countsByDiaStatus = new Map<string, Record<string, number>>();
    const statusDesconhecido = new Map<string, number>();
    for (const r of rows) {
      const diaKey = DashboardService.normalizeDiaSQL(r.dia);
      if (!diaKey) continue;
      const st = String(r.status || '').trim();
      const n = typeof r.total === 'string' ? parseInt(r.total, 10) : Number(r.total);
      if (!Number.isFinite(n)) continue;
      if (!countsByDiaStatus.has(diaKey)) {
        countsByDiaStatus.set(diaKey, {
          falha: 0,
          sucesso: 0,
          somente_local: 0,
          falha_envio: 0,
          verificado: 0,
        });
      }
      const bucket = countsByDiaStatus.get(diaKey)!;
      if (st === 'falha') bucket.falha += n;
      else if (st === 'sucesso') bucket.sucesso += n;
      else if (st === 'somente_local') bucket.somente_local += n;
      else if (st === 'falha_envio') bucket.falha_envio += n;
      else if (st === 'verificado') bucket.verificado += n;
      else if (st) {
        statusDesconhecido.set(st, (statusDesconhecido.get(st) ?? 0) + n);
      }
    }

    const out: BackupStatusGraficoDia[] = [];
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      const dataISO = formatDateOnly(cursor) ?? cursor.toISOString().slice(0, 10);
      const label = `${String(cursor.getDate()).padStart(2, '0')}/${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const c = countsByDiaStatus.get(dataISO) ?? {
        falha: 0,
        sucesso: 0,
        somente_local: 0,
        falha_envio: 0,
        verificado: 0,
      };
      out.push({
        label,
        dataISO,
        falha: c.falha,
        sucesso: c.sucesso,
        somente_local: c.somente_local,
        falha_envio: c.falha_envio,
        verificado: c.verificado,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const diasComAlgumEvento = out.filter(
      (d) =>
        d.falha + d.sucesso + d.somente_local + d.falha_envio + d.verificado > 0
    ).length;
    const chavesAgregacao = [...countsByDiaStatus.keys()].sort();
    const chavesSerie = new Set(out.map((d) => d.dataISO));
    const chavesSohNaAgregacao = chavesAgregacao.filter((k) => !chavesSerie.has(k));

    logger.debug('Dashboard backupStatusGrafico', {
      context: 'DashboardService.getBackupStatusGrafico',
      empresaId: empresaId ?? null,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      linhasQuery: rows.length,
      amostraLinhasQuery: rows.slice(0, 15),
      diasDistintosNaAgregacao: countsByDiaStatus.size,
      diasNaSerie: out.length,
      diasComAlgumEvento,
      statusDesconhecido: Object.fromEntries(statusDesconhecido),
      chavesSohNaAgregacao: chavesSohNaAgregacao.slice(0, 10),
      ultimos3DiasSerie: out.slice(-3),
    });

    return out;
  }

  private static toIsoOrNull(v: unknown): string | null {
    if (v == null) return null;
    if (v instanceof Date) {
      return Number.isNaN(v.getTime()) ? null : v.toISOString();
    }
    if (typeof v === 'string' && v.trim()) {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? v : d.toISOString();
    }
    return null;
  }

  private static parseSizeBytes(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    }
    if (typeof v === 'bigint') return Number(v);
    return null;
  }

  static async getBackupStatusDetalhe(
    dataISO: string,
    status: string,
    empresaId?: number | null
  ): Promise<BackupStatusDetalheItem[]> {
    const allowed = new Set(['falha', 'sucesso', 'somente_local', 'falha_envio', 'verificado']);
    if (!allowed.has(status)) {
      return [];
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) {
      return [];
    }

    const replacements: Record<string, unknown> = { dia: dataISO, status };
    if (empresaId != null) {
      replacements.empresaId = empresaId;
    }

    if (status === 'sucesso') {
      const empresaClauseD = empresaId != null ? ' AND d.empresa_id = :empresaId' : '';
      const rows = await sequelize.query<{
        id: string;
        deviceId: string;
        deviceName: string;
        fileName: string;
        sizeBytes: string | number | bigint;
        startedAt: unknown;
        finishedAt: unknown;
      }>(
        `SELECT CAST(b.id AS CHAR) AS id,
          b.ssh_device_id AS deviceId,
          d.name AS deviceName,
          b.file_name AS fileName,
          b.size_bytes AS sizeBytes,
          b.started_at AS startedAt,
          b.finished_at AS finishedAt
         FROM ssh_manager_device_backups b
         INNER JOIN ssh_manager_devices d ON d.id = b.ssh_device_id
         WHERE DATE(b.finished_at) = :dia${empresaClauseD}
         ORDER BY b.finished_at DESC, d.name, b.file_name`,
        { replacements, type: QueryTypes.SELECT }
      );

      return rows.map((r) => {
        const finishedAt = DashboardService.toIsoOrNull(r.finishedAt);
        const startedRaw = DashboardService.toIsoOrNull(r.startedAt);
        return {
          id: String(r.id),
          deviceId: String(r.deviceId),
          deviceName: String(r.deviceName || r.deviceId || ''),
          fileName: r.fileName != null ? String(r.fileName) : null,
          sizeBytes: DashboardService.parseSizeBytes(r.sizeBytes),
          startedAt: startedRaw,
          finishedAt,
          detail: null,
        };
      });
    }

    const empresaClauseE =
      empresaId != null
        ? ' AND (e.empresa_id = :empresaId OR (e.empresa_id IS NULL AND d.empresa_id = :empresaId))'
        : '';
    const rows = await sequelize.query<{
      id: string;
      deviceId: string;
      deviceName: string;
      fileName: string | null;
      sizeBytes: string | number | null;
      startedAt: unknown;
      finishedAt: unknown;
      detail: string | null;
    }>(
      `SELECT CAST(e.id AS CHAR) AS id,
        e.ssh_device_id AS deviceId,
        d.name AS deviceName,
        NULL AS fileName,
        NULL AS sizeBytes,
        e.created_at AS startedAt,
        e.created_at AS finishedAt,
        e.detail AS detail
       FROM ssh_manager_device_backup_events e
       INNER JOIN ssh_manager_devices d ON d.id = e.ssh_device_id
       WHERE DATE(e.created_at) = :dia AND e.status = :status${empresaClauseE}
       ORDER BY e.created_at DESC, d.name`,
      { replacements, type: QueryTypes.SELECT }
    );

    return rows.map((r) => ({
      id: String(r.id),
      deviceId: String(r.deviceId),
      deviceName: String(r.deviceName || r.deviceId || ''),
      fileName: null,
      sizeBytes: null,
      startedAt: DashboardService.toIsoOrNull(r.startedAt),
      finishedAt: DashboardService.toIsoOrNull(r.finishedAt),
      detail: r.detail ?? null,
    }));
  }
}

