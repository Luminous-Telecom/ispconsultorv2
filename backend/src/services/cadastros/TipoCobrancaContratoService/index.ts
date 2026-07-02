import { TipoCobrancaContrato } from '../../../models/cadastros/TipoCobrancaContrato';
import { Op, WhereOptions } from 'sequelize';
import { SortHelper } from '../../../utils/sortHelper';
import { TIPO_COBRANCA_CONTRATO_SORT_CONFIG } from '../../../config/sortConfigs';
import { buildPagination } from '../../../utils/pagination';

export interface ListTipoCobrancaContratoFilters {
  search?: string;
  searchField?: string;
  ativo?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number | null;
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
    const { search, searchField, ativo, page = 1, limit = 15, sortColumn, sortDirection, empresa_id } = filters;
    const andConditions: WhereOptions<TipoCobrancaContrato>[] = [];

    if (empresa_id != null) {
      andConditions.push({ [Op.or]: [{ empresa_id }, { empresa_id: null }] } as WhereOptions<TipoCobrancaContrato>);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Array<WhereOptions<TipoCobrancaContrato>> = [];

      if (searchField === 'id') {
        orConditions = numExact !== null
          ? [{ id: numExact } as WhereOptions<TipoCobrancaContrato>]
          : [{ id: { [Op.lt]: 0 } } as WhereOptions<TipoCobrancaContrato>]; /* termo não numérico: nenhum id corresponde */
      } else if (searchField === 'quantidade_titulos') {
        orConditions = numExact !== null
          ? [{ quantidade_titulos: numExact } as WhereOptions<TipoCobrancaContrato>]
          : [{ quantidade_titulos: { [Op.lt]: 0 } } as WhereOptions<TipoCobrancaContrato>]; /* termo não numérico: nenhum corresponde */
      } else if (searchField === 'nome') {
        orConditions = [{ nome: { [Op.like]: searchPattern } }];
      } else {
        orConditions = [{ nome: { [Op.like]: searchPattern } }];
        if (numExact !== null) {
          orConditions.unshift({ id: numExact } as WhereOptions<TipoCobrancaContrato>);
          orConditions.push({ quantidade_titulos: numExact } as WhereOptions<TipoCobrancaContrato>);
        } else {
          orConditions.unshift({ id: { [Op.like]: searchPattern } } as WhereOptions<TipoCobrancaContrato>);
        }
      }

      if (orConditions.length > 0) {
        andConditions.push({ [Op.or]: orConditions } as WhereOptions<TipoCobrancaContrato>);
      }
    }

    if (ativo !== undefined && ativo !== '') {
      andConditions.push({ ativo: ativo === 'ativo' });
    }

    const where: WhereOptions<TipoCobrancaContrato> =
      andConditions.length > 0 ? { [Op.and]: andConditions } : {};

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
    return {
      success: true,
      data,
      pagination: buildPagination(Number(page), limitNum, count),
    };
  }

  static async getById(id: string | number): Promise<TipoCobrancaContrato | null> {
    return await TipoCobrancaContrato.findByPk(id);
  }

  static async findAtivos(empresaId?: number | null): Promise<TipoCobrancaContrato[]> {
    const where: WhereOptions<TipoCobrancaContrato> =
      empresaId != null
        ? { ativo: true, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : { ativo: true };
    return TipoCobrancaContrato.findAll({
      where,
      order: [['nome', 'ASC']]
    });
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
