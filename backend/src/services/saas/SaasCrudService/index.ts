import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { SaasTipoCobranca } from '../../../models/saas/SaasTipoCobranca';
import { SaasDiasVencimento } from '../../../models/saas/SaasDiasVencimento';
import { SaasTitulo } from '../../../models/saas/SaasTitulo';
import { SaasPlano } from '../../../models/saas/SaasPlano';
import { SaasBanco } from '../../../models/saas/SaasBanco';
import { SaasContrato } from '../../../models/saas/SaasContrato';
import { SaasDadosEmpresa } from '../../../models/saas/SaasDadosEmpresa';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  empresa_id?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

const empresaInclude = {
  model: DadosEmpresa,
  as: 'empresa',
  attributes: ['id', 'razao_social', 'nome_fantasia'],
};

// ─── Tipos de Cobrança ──────────────────────────────────────────────────────

export class SaasTipoCobrancaService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20, search, empresa_id, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'nome', 'periodicidade', 'ativo', 'created_at'];
    const col = allowed.includes(sortColumn || '') ? sortColumn! : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (empresa_id) where.empresa_id = empresa_id;
    if (search) where[Op.or as unknown as string] = [{ nome: { [Op.like]: `%${search}%` } }];
    const { count, rows } = await SaasTipoCobranca.findAndCountAll({
      where,
      include: [empresaInclude],
      order: [[col, (sortDirection || 'desc').toUpperCase()]],
      limit,
      offset,
    });
    return { data: rows, pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) } };
  }

  static async getById(id: number) {
    return SaasTipoCobranca.findByPk(id, { include: [empresaInclude] });
  }

  static async create(data: Partial<SaasTipoCobranca>) {
    return SaasTipoCobranca.create(data as SaasTipoCobranca['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasTipoCobranca>) {
    await SaasTipoCobranca.update(data, { where: { id } });
  }

  static async delete(id: number) {
    await SaasTipoCobranca.destroy({ where: { id } });
  }
}

// ─── Dias de Vencimento ───────────────────────────────────────────────────────

export class SaasDiasVencimentoService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20, search, empresa_id, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'dia', 'dia_padrao', 'ativo', 'created_at'];
    const col = allowed.includes(sortColumn || '') ? sortColumn! : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (empresa_id) where.empresa_id = empresa_id;
    if (search) {
      const diaNum = parseInt(search, 10);
      if (!isNaN(diaNum)) where[Op.or as unknown as string] = [{ dia: diaNum }, { dia_padrao: diaNum }];
    }
    const { count, rows } = await SaasDiasVencimento.findAndCountAll({
      where,
      include: [empresaInclude],
      order: [[col, (sortDirection || 'desc').toUpperCase()]],
      limit,
      offset,
    });
    return { data: rows, pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) } };
  }

  static async getById(id: number) {
    return SaasDiasVencimento.findByPk(id, { include: [empresaInclude] });
  }

  static async create(data: Partial<SaasDiasVencimento>) {
    return SaasDiasVencimento.create(data as SaasDiasVencimento['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasDiasVencimento>) {
    await SaasDiasVencimento.update(data, { where: { id } });
  }

  static async delete(id: number) {
    await SaasDiasVencimento.destroy({ where: { id } });
  }

  /** Obter config (dias ativos) por empresa - mesmo formato do admin */
  static async getConfig(empresaId: number) {
    let rows = await SaasDiasVencimento.findAll({ where: { empresa_id: empresaId }, order: [['dia', 'ASC']] });
    if (rows.length === 0) {
      const defaultDias = [5, 10, 15, 20, 25, 30];
      for (let dia = 1; dia <= 30; dia++) {
        await SaasDiasVencimento.create({ empresa_id: empresaId, dia, dia_padrao: dia, ativo: defaultDias.includes(dia) } as never);
      }
      rows = await SaasDiasVencimento.findAll({ where: { empresa_id: empresaId }, order: [['dia', 'ASC']] });
    }
    return rows;
  }

  /** Atualizar config (dias ativos) - mesmo formato do admin */
  static async updateConfig(empresaId: number, dias: number[]) {
    const existingRows = await SaasDiasVencimento.findAll({ where: { empresa_id: empresaId }, attributes: ['dia'] });
    await SaasDiasVencimento.update({ ativo: false }, { where: { empresa_id: empresaId } });
    const existingDias = new Set(existingRows.map((r: { dia: number | null }) => r.dia));
    for (const dia of dias) {
      if (dia >= 1 && dia <= 30) {
        if (existingDias.has(dia)) {
          await SaasDiasVencimento.update({ ativo: true }, { where: { empresa_id: empresaId, dia } });
        } else {
          await SaasDiasVencimento.create({ empresa_id: empresaId, dia, dia_padrao: dia, ativo: true } as never);
        }
      }
    }
  }
}

// ─── Títulos ─────────────────────────────────────────────────────────────────

const tituloEmpresaInclude = {
  model: SaasDadosEmpresa,
  as: 'empresa',
  attributes: ['id', 'nome_empresa', 'razao_social', 'nome_fantasia'],
};

const tituloIncludes = [
  tituloEmpresaInclude,
  { model: SaasPlano, as: 'plano', attributes: ['id', 'nome', 'valor_mensal'] },
  { model: SaasBanco, as: 'banco', attributes: ['id', 'nome', 'banco', 'tipo_banco', 'ativo'] },
  { model: SaasContrato, as: 'contrato', attributes: ['id', 'data_inicio', 'data_fim', 'status'], required: false },
];

export class SaasTituloService {
  static async list(filters: ListFilters & { status?: string; data_vencimento_inicio?: string; data_vencimento_fim?: string; data_pagamento_inicio?: string; data_pagamento_fim?: string }) {
    const { page = 1, limit = 20, search, empresa_id, status, data_vencimento_inicio, data_vencimento_fim, data_pagamento_inicio, data_pagamento_fim, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'numero_titulo', 'valor', 'data_vencimento', 'status', 'pago', 'created_at'];
    const col = allowed.includes(sortColumn || '') ? sortColumn! : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (empresa_id) where.empresa_id = empresa_id;
    if (status) {
      if (status.startsWith('!')) {
        where.status = { [Op.ne]: status.slice(1) };
      } else if (status.includes(',')) {
        const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
        if (statuses.length > 0) where.status = { [Op.in]: statuses };
      } else {
        where.status = status;
      }
    }
    if (data_vencimento_inicio || data_vencimento_fim) {
      const inicio = data_vencimento_inicio?.match(/^\d{4}-\d{2}-\d{2}$/) ? `${data_vencimento_inicio} 00:00:00` : data_vencimento_inicio;
      const fim = data_vencimento_fim?.match(/^\d{4}-\d{2}-\d{2}$/) ? `${data_vencimento_fim} 23:59:59.999` : data_vencimento_fim;
      where.data_vencimento = {
        ...(inicio && { [Op.gte]: inicio }),
        ...(fim && { [Op.lte]: fim }),
      };
    }
    if (data_pagamento_inicio || data_pagamento_fim) {
      const inicio = data_pagamento_inicio?.match(/^\d{4}-\d{2}-\d{2}$/) ? `${data_pagamento_inicio} 00:00:00` : data_pagamento_inicio;
      const fim = data_pagamento_fim?.match(/^\d{4}-\d{2}-\d{2}$/) ? `${data_pagamento_fim} 23:59:59.999` : data_pagamento_fim;
      where.data_pagamento = {
        ...(inicio && { [Op.gte]: inicio }),
        ...(fim && { [Op.lte]: fim }),
      };
    }
    if (search) {
      where[Op.or as unknown as string] = [
        { numero_titulo: { [Op.like]: `%${search}%` } },
        { charge_id: { [Op.like]: `%${search}%` } },
        { nosso_numero: { [Op.like]: `%${search}%` } },
      ];
    }
    try {
      const { count, rows } = await SaasTitulo.findAndCountAll({
        where,
        include: tituloIncludes,
        order: [[col, (sortDirection || 'desc').toUpperCase()]],
        limit,
        offset,
      });
      return { data: rows, pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) } };
    } catch (err) {
      logger.error('SaasTituloService.list - Erro ao listar títulos', {
        context: 'SaasTituloService',
        filters: { page, limit, search, empresa_id, status, sortColumn, sortDirection },
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  static async getById(id: number) {
    return SaasTitulo.findByPk(id, { include: tituloIncludes });
  }

  static async create(data: Partial<SaasTitulo>) {
    return SaasTitulo.create(data as SaasTitulo['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasTitulo>) {
    await SaasTitulo.update(data, { where: { id } });
  }

  static async delete(id: number) {
    await SaasTitulo.destroy({ where: { id } });
  }
}

// ─── Resumo Títulos (Dashboard) ─────────────────────────────────────────────────

export class SaasTituloResumoService {
  static async getResumo() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const [titulosPendentes, titulosAtrasados, totalRecebido, mrr] = await Promise.all([
      SaasTitulo.count({
        where: {
          pago: false,
          status: { [Op.notIn]: ['cancelado'] },
        },
      }),
      SaasTitulo.count({
        where: {
          pago: false,
          status: { [Op.notIn]: ['cancelado'] },
          data_vencimento: { [Op.lt]: hoje },
        },
      }),
      SaasTitulo.sum('valor', { where: { pago: true } }),
      SaasTitulo.sum('valor', {
        where: {
          pago: true,
          data_pagamento: { [Op.gte]: inicioMes },
        },
      }),
    ]);

    return {
      titulosPendentes: titulosPendentes || 0,
      titulosAtrasados: titulosAtrasados || 0,
      totalRecebido: totalRecebido || 0,
      mrr: mrr || 0,
    };
  }
}

// ─── Contratos ─────────────────────────────────────────────────────────────────

async function getStatusEmpresa(empresaId: number): Promise<{ bloqueado_por_atraso: boolean; em_atraso: boolean; data_fim_desbloqueio_manual?: string | null }> {
  const [empresa, countEmAtraso] = await Promise.all([
    SaasDadosEmpresa.findByPk(empresaId, { attributes: ['bloqueado_por_atraso', 'data_fim_desbloqueio_manual'] }),
    SaasTitulo.count({
      where: {
        empresa_id: empresaId,
        pago: false,
        status: { [Op.in]: ['pendente', 'vencido'] },
        data_vencimento: { [Op.lt]: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);
  return {
    bloqueado_por_atraso: !!empresa?.bloqueado_por_atraso,
    em_atraso: countEmAtraso > 0,
    data_fim_desbloqueio_manual: empresa?.data_fim_desbloqueio_manual ?? null,
  };
}

export class SaasContratoService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 100, empresa_id, sortColumn = 'id', sortDirection = 'desc' } = filters;
    const allowed = ['id', 'data_inicio', 'data_fim', 'status', 'valor', 'created_at'];
    const col = allowed.includes(sortColumn || '') ? sortColumn! : 'id';
    const offset = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (empresa_id) where.empresa_id = empresa_id;
    const { count, rows } = await SaasContrato.findAndCountAll({
      where,
      include: [
        { model: SaasPlano, as: 'plano', attributes: ['id', 'nome', 'valor_mensal'], required: false },
        { model: SaasBanco, as: 'banco', attributes: ['id', 'nome', 'banco', 'tipo_banco'], required: false },
      ],
      order: [[col, (sortDirection || 'desc').toUpperCase()]],
      limit,
      offset,
    });
    const result: { data: typeof rows; pagination: { total: number; page: number; limit: number; totalPages: number }; status_empresa?: { bloqueado_por_atraso: boolean; em_atraso: boolean } } = {
      data: rows,
      pagination: { total: count as number, page, limit, totalPages: Math.ceil((count as number) / limit) },
    };
    if (empresa_id) {
      result.status_empresa = await getStatusEmpresa(empresa_id);
    }
    return result;
  }

  static async getById(id: number) {
    return SaasContrato.findByPk(id, {
      include: [
        { model: SaasPlano, as: 'plano', attributes: ['id', 'nome', 'valor_mensal'] },
        { model: SaasBanco, as: 'banco', attributes: ['id', 'nome', 'banco', 'tipo_banco'], required: false },
      ],
    });
  }

  static async create(data: Partial<SaasContrato>) {
    return SaasContrato.create(data as SaasContrato['_creationAttributes']);
  }

  static async update(id: number, data: Partial<SaasContrato>) {
    await SaasContrato.update(data, { where: { id } });
  }

  static async delete(id: number) {
    await SaasContrato.destroy({ where: { id } });
  }
}
