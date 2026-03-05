import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/database';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import { SaasContrato } from '../../../models/saas/SaasContrato';
import { SaasTitulo } from '../../../models/saas/SaasTitulo';
import { formatDateISOForAPI } from '../../../utils/timezoneUtils';
import { getStartOfLocalDay } from '../../../utils/dateUtils';

// Formato compatível com DashboardData do admin (mapeamento empresa=cliente)
export class SaasDashboardService {
  static parseStartDate(start?: string): Date {
    if (start) {
      const [year, month, day] = start.split('-').map(Number);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
    }
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1, 0, 0, 0, 0);
  }

  static parseEndDate(end: string | undefined, start: Date): Date {
    if (end) {
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
    return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  static async getDashboardData(startDate?: string, endDate?: string): Promise<Record<string, unknown>> {
    const parsedStart = this.parseStartDate(startDate);
    const parsedEnd = this.parseEndDate(endDate, parsedStart);

    const inicioPeriodo = new Date(parsedStart);
    inicioPeriodo.setHours(0, 0, 0, 0);
    const fimPeriodo = new Date(parsedEnd);
    fimPeriodo.setHours(23, 59, 59, 999);

    const [empresas, planos, contratos, contratosTodos, titulos, receitaUltimosMeses, aReceberPeriodo, recebidosPeriodo, clientesPorTipoPlano, resumoPeriodo, contasPagarUltimosMeses] = await Promise.all([
      this.getEmpresasCompat(),
      this.getPlanosCompat(),
      this.getContratosCompat(inicioPeriodo, fimPeriodo),
      this.getAllContratosCompat(),
      this.getTitulosCompat(inicioPeriodo, fimPeriodo),
      this.getReceitaUltimos12Meses(),
      this.getAReceberPorPeriodo(parsedStart, parsedEnd),
      this.getRecebidosPorPeriodo(parsedStart, parsedEnd),
      this.getClientesPorTipoPlano(),
      this.getResumoFinanceiroPeriodo(parsedStart, parsedEnd),
      this.getContasPagarUltimos12Meses(),
    ]);

    return {
      stats: {
        totalClientes: empresas.length,
        planosAtivos: planos.filter(p => (p as { status?: string }).status === 'ativo').length,
      },
      titulosRecentes: [],
      titulosVencidos: [],
      clientes: empresas.filter(e => {
        const created = e.created_at ? new Date(e.created_at) : null;
        return created && created >= inicioPeriodo && created <= fimPeriodo;
      }),
      clientesTodos: empresas,
      planos,
      contratos,
      contratosTodos,
      contratosAtivosTodos: contratosTodos.filter((c: { status: string }) => c.status === 'ativo'),
      clientesPorTipoPlano,
      titulos,
      titulosTodos: await this.getAllTitulosCompat(),
      receitaUltimosMeses,
      clientesPorStatus: {
        labels: ['Ativos', 'Inativos'],
        data: [empresas.length, 0],
      },
      aReceberPeriodo,
      recebidosPeriodo,
      contasPagarUltimosMeses,
      filtros: {
        startDate: formatDateISOForAPI(parsedStart) || '',
        endDate: formatDateISOForAPI(parsedEnd) || '',
      },
      resumoPeriodo,
    };
  }

  private static async getEmpresasCompat() {
    const rows = await DadosEmpresa.findAll({
      attributes: ['id', 'created_at'],
    });
    return rows.map(e => ({
      id: e.id,
      ativo: true,
      created_at: e.created_at,
    }));
  }

  private static async getPlanosCompat() {
    const rows = await SaasPlano.findAll({
      attributes: ['id', 'nome', 'valor_mensal', 'ativo', 'created_at'],
    });
    return rows.map(p => ({
      id: p.id,
      nome_plano: p.nome,
      tipo_servico: 'infraestrutura',
      status: p.ativo ? 'ativo' : 'inativo',
      valor_mensal: parseFloat(String(p.valor_mensal || 0)),
      created_at: p.created_at,
    }));
  }

  private static async getContratosCompat(inicio: Date, fim: Date) {
    const rows = await SaasContrato.findAll({
      where: {
        data_inicio: { [Op.lte]: fim },
        [Op.or]: [
          { data_fim: { [Op.gte]: inicio } },
          { data_fim: null },
        ],
      },
      attributes: ['id', 'status', 'plano_id', 'empresa_id', 'valor', 'data_inicio', 'data_fim', 'created_at'],
      include: [{ association: 'plano', attributes: ['id', 'nome', 'valor_mensal'] }],
    });
    return rows.map(c => {
      const pl = (c as unknown as { plano?: { id: number; nome: string; valor_mensal: number } }).plano;
      return {
        id: c.id,
        status: c.status,
        plano_id: c.plano_id,
        cliente_id: c.empresa_id,
        valor_final: parseFloat(String(c.valor || 0)),
        data_inicio: c.data_inicio,
        data_fim: c.data_fim,
        created_at: c.created_at,
        plano: pl ? { id: pl.id, nome_plano: pl.nome, valor_mensal: pl.valor_mensal } : null,
      };
    });
  }

  private static async getAllContratosCompat() {
    const rows = await SaasContrato.findAll({
      attributes: ['id', 'status', 'plano_id', 'empresa_id'],
    });
    return rows.map(c => ({
      id: c.id,
      status: c.status,
      plano_id: c.plano_id,
      cliente_id: c.empresa_id,
      isento_mensalidade: false,
    }));
  }

  private static async getTitulosCompat(inicio: Date, fim: Date) {
    const rows = await SaasTitulo.findAll({
      where: {
        data_vencimento: { [Op.between]: [inicio, fim] },
      },
      attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at', 'empresa_id'],
    });
    return rows.map(t => ({
      id: t.id,
      valor: parseFloat(String(t.valor || 0)),
      status: t.status,
      data_vencimento: t.data_vencimento,
      created_at: t.created_at,
      cliente_id: t.empresa_id,
    }));
  }

  private static async getAllTitulosCompat() {
    const rows = await SaasTitulo.findAll({
      attributes: ['id', 'valor', 'status', 'data_vencimento', 'created_at', 'empresa_id', 'valor_pago', 'data_pagamento'],
    });
    return rows.map(t => ({
      id: t.id,
      valor: parseFloat(String(t.valor || 0)),
      status: t.status,
      data_vencimento: t.data_vencimento,
      created_at: t.created_at,
      cliente_id: t.empresa_id,
      valor_pago: t.valor_pago,
      data_pagamento: t.data_pagamento,
    }));
  }

  private static async getClientesPorTipoPlano(): Promise<Array<{ tipo_servico: string; quantidade: number }>> {
    const rows = await sequelize.query<{ tipo_servico: string; quantidade: string }>(
      `SELECT 'infraestrutura' as tipo_servico, COUNT(DISTINCT sc.empresa_id) as quantidade
       FROM saas_contratos sc
       WHERE sc.status = 'ativo'`,
      { type: QueryTypes.SELECT }
    );
    return rows.map(r => ({ tipo_servico: r.tipo_servico, quantidade: parseInt(r.quantidade, 10) || 0 }));
  }

  private static async getReceitaUltimos12Meses() {
    const hoje = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1, 0, 0, 0, 0);
      const proxMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1, 0, 0, 0, 0);

      const [result] = await sequelize.query<{ total: string }>(
        `SELECT COALESCE(SUM(st.valor), 0) as total
         FROM saas_titulos st
         WHERE st.data_vencimento >= :inicio AND st.data_vencimento < :fim AND st.status != 'cancelado'`,
        {
          replacements: { inicio: mes, fim: proxMes },
          type: QueryTypes.SELECT,
        }
      );

      const totalMes = parseFloat(result?.total || '0');
      labels.push(`${String(mes.getMonth() + 1).padStart(2, '0')}/${String(mes.getFullYear()).slice(-2)}`);
      data.push(totalMes);
    }
    return { labels, data };
  }

  private static async getAReceberPorPeriodo(start: Date, end: Date) {
    const { formatDate } = await import('../../../utils/dateUtils');
    const inicio = new Date(start);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(end);
    fim.setHours(23, 59, 59, 999);
    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulos = await SaasTitulo.findAll({
      where: {
        data_vencimento: { [Op.between]: [inicio, fim] },
        status: { [Op.in]: ['pendente', 'vencido'] },
      },
      attributes: ['valor', 'data_vencimento'],
    });

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const t of titulos) {
      if (!t.data_vencimento) continue;
      const inicioDia = getStartOfLocalDay(t.data_vencimento);
      if (!inicioDia) continue;
      const indice = Math.floor((inicioDia.getTime() - inicio.getTime()) / MS_POR_DIA);
      if (indice >= 0 && indice < valoresPorDia.length) {
        valoresPorDia[indice] += parseFloat(String(t.valor || 0));
      }
    }

    return {
      labels: valoresPorDia.map((_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return formatDate(d) || '';
      }),
      data: valoresPorDia,
    };
  }

  private static async getRecebidosPorPeriodo(start: Date, end: Date) {
    const { formatDate } = await import('../../../utils/dateUtils');
    const inicio = new Date(start);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(end);
    fim.setHours(23, 59, 59, 999);
    const diffTime = fim.getTime() - inicio.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const titulos = await SaasTitulo.findAll({
      where: {
        data_pagamento: { [Op.between]: [inicio, fim] },
        status: { [Op.in]: ['pago', 'pago_atraso', 'parcial'] },
      },
      attributes: ['valor', 'valor_pago', 'data_pagamento'],
    });

    const valoresPorDia = new Array(Math.max(dias, 0)).fill(0);
    const MS_POR_DIA = 1000 * 60 * 60 * 24;

    for (const t of titulos) {
      if (!t.data_pagamento) continue;
      const inicioDia = getStartOfLocalDay(t.data_pagamento);
      if (!inicioDia) continue;
      const indice = Math.floor((inicioDia.getTime() - inicio.getTime()) / MS_POR_DIA);
      if (indice >= 0 && indice < valoresPorDia.length) {
        const v = t.valor_pago != null ? parseFloat(String(t.valor_pago)) : parseFloat(String(t.valor));
        valoresPorDia[indice] += v;
      }
    }

    return {
      labels: valoresPorDia.map((_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return formatDate(d) || '';
      }),
      data: valoresPorDia,
    };
  }

  private static async getResumoFinanceiroPeriodo(start: Date, end: Date) {
    const inicio = new Date(start);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(end);
    fim.setHours(23, 59, 59, 999);

    const titulos = await SaasTitulo.findAll({
      where: { data_vencimento: { [Op.between]: [inicio, fim] } },
      attributes: ['valor', 'valor_pago', 'status', 'empresa_id'],
    });

    let totalPrevisto = 0;
    let totalRecebido = 0;
    let totalPendente = 0;
    const clientesSet = new Set<number>();

    for (const t of titulos) {
      const valor = parseFloat(String(t.valor || 0));
      const valorPago = t.valor_pago != null ? parseFloat(String(t.valor_pago)) : valor;
      if (t.empresa_id) clientesSet.add(t.empresa_id);

      switch (t.status) {
        case 'pago':
        case 'pago_atraso':
          totalRecebido += valorPago;
          totalPrevisto += valor;
          break;
        case 'parcial':
          totalRecebido += Math.min(valorPago, valor);
          totalPendente += Math.max(valor - valorPago, 0);
          totalPrevisto += valor;
          break;
        case 'pendente':
        case 'vencido':
          totalPendente += valor;
          totalPrevisto += valor;
          break;
        default:
          if (t.status !== 'cancelado') {
            totalPendente += valor;
            totalPrevisto += valor;
          }
      }
    }

    const contratosAtivos = await SaasContrato.findAll({
      where: { status: 'ativo' },
      include: [{ association: 'plano', attributes: ['valor_mensal'] }],
    });

    let valorTotalPlanos = 0;
    const clientesComPlanos = new Set<number>();
    for (const c of contratosAtivos) {
      clientesComPlanos.add(c.empresa_id);
      const pl = (c as unknown as { plano?: { valor_mensal: number } }).plano;
      valorTotalPlanos += parseFloat(String(c.valor || 0)) || (pl ? parseFloat(String(pl.valor_mensal || 0)) : 0);
    }

    return {
      totalPrevisto,
      totalRecebido,
      totalPendente,
      clientesComTitulos: clientesSet.size,
      ticketMedio: clientesComPlanos.size > 0 ? valorTotalPlanos / clientesComPlanos.size : 0,
    };
  }

  private static async getContasPagarUltimos12Meses() {
    const hoje = new Date();
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      labels.push(`${String(mes.getMonth() + 1).padStart(2, '0')}/${String(mes.getFullYear()).slice(-2)}`);
      data.push(0); // SaaS não tem contas a pagar agregadas
    }
    return { labels, data };
  }
}
