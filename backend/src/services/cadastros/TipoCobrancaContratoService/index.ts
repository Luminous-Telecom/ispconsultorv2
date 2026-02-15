import { TipoCobrancaContrato } from '../../../models/cadastros/TipoCobrancaContrato';
import { Op, WhereOptions } from 'sequelize';
import { SortHelper } from '../../../utils/sortHelper';
import { TIPO_COBRANCA_CONTRATO_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListTipoCobrancaContratoFilters {
  search?: string;
  ativo?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListTipoCobrancaContratoResponse {
  success: boolean;
  data: TipoCobrancaContrato[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class TipoCobrancaContratoService {
  static async list(filters: ListTipoCobrancaContratoFilters): Promise<ListTipoCobrancaContratoResponse> {
    const { search, ativo, page = 1, limit = 15, sortColumn, sortDirection } = filters;
    const where: WhereOptions<TipoCobrancaContrato> = {};

    if (search) {
      (where as Record<symbol, unknown>)[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { nome: { [Op.like]: `%${search}%` } },
        { quantidade_titulos: { [Op.like]: `%${search}%` } }
      ];
    }

    if (ativo !== undefined && ativo !== '') {
      where.ativo = ativo === 'ativo';
    }

    let order: [string, string][] = [['id', 'DESC']];
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        TIPO_COBRANCA_CONTRATO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );
      if (sortResult.isValid) {
        order = sortResult.order;
      }
    }

    const offset = (Number(page) - 1) * Number(limit);
    const count = await TipoCobrancaContrato.count({ where });
    const data = await TipoCobrancaContrato.findAll({
      where,
      order,
      limit: Number(limit),
      offset
    });

    const limitNum = Number(limit);
    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

    return {
      success: true,
      data,
      pagination: {
        current_page: Number(page),
        per_page: limitNum,
        total: count,
        last_page: Math.ceil(count / limitNum),
        from,
        to
      }
    };
  }

  static async getById(id: string | number): Promise<TipoCobrancaContrato | null> {
    return await TipoCobrancaContrato.findByPk(id);
  }

  static async findAtivos(): Promise<{ success: boolean; data: TipoCobrancaContrato[] }> {
    const data = await TipoCobrancaContrato.findAll({
      where: { ativo: true },
      order: [['nome', 'ASC']]
    });
    return { success: true, data };
  }

  static async create(dados: Partial<TipoCobrancaContrato>): Promise<TipoCobrancaContrato> {
    return await TipoCobrancaContrato.create(dados as any);
  }

  static async update(id: string | number, dados: Partial<TipoCobrancaContrato>): Promise<TipoCobrancaContrato> {
    const item = await TipoCobrancaContrato.findByPk(id);
    if (!item) throw new Error('Tipo de cobrança não encontrado');
    await item.update(dados);
    return item;
  }

  static async delete(id: string | number): Promise<TipoCobrancaContrato> {
    const item = await TipoCobrancaContrato.findByPk(id);
    if (!item) throw new Error('Tipo de cobrança não encontrado');
    await item.destroy();
    return item;
  }
}
