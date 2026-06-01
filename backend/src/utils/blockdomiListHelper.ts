import { Op, Order, WhereOptions, Model, ModelStatic } from 'sequelize';
import { VersaoBlockdomi } from '../models/blockdomi/VersaoBlockdomi';
import { NumeroSeiAnatelBlockdomi } from '../models/blockdomi/NumeroSeiAnatelBlockdomi';
import { SortHelper, SortConfig } from './sortHelper';
import { buildPagination, StandardPagination } from './pagination';
import { logger } from './logger';

export const BLOCKDOMI_LIST_INCLUDES = [
  { model: VersaoBlockdomi, as: 'versaoRef' as const, attributes: ['numero'], required: false },
  { model: NumeroSeiAnatelBlockdomi, as: 'numeroSeiRef' as const, attributes: ['numero'], required: false },
];

const BLOCKDOMI_SHARED_TEXT_FIELDS = [
  'descricao',
  'nome_oficio',
  'link_oficio_anatel',
  'link_oficio_justica',
  'link_planilha_dominios',
] as const;

export interface BlockdomiListFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: string;
}

export type BlockdomiPrimarySearchField = 'ip' | 'dominio';

export function buildBlockdomiSearchWhere<T>(
  search: string | undefined,
  searchField: string | undefined,
  primaryField: BlockdomiPrimarySearchField
): WhereOptions<T> | null {
  if (!search?.trim()) return null;

  const searchPattern = `%${search}%`;
  const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
  const textFields = [primaryField, ...BLOCKDOMI_SHARED_TEXT_FIELDS];

  let orConditions: WhereOptions<T>[] = [];

  if (searchField === 'id') {
    orConditions = numExact !== null
      ? ([{ id: numExact }] as unknown as WhereOptions<T>[])
      : ([{ id: { [Op.lt]: 0 } }] as unknown as WhereOptions<T>[]);
  } else if (searchField === 'numero_sei_anatel') {
    orConditions = [{ '$numeroSeiRef.numero$': { [Op.like]: searchPattern } }] as unknown as WhereOptions<T>[];
  } else if (searchField && textFields.includes(searchField as typeof textFields[number])) {
    orConditions = [{ [searchField]: { [Op.like]: searchPattern } }] as unknown as WhereOptions<T>[];
  } else {
    orConditions = [
      { [primaryField]: { [Op.like]: searchPattern } },
      { descricao: { [Op.like]: searchPattern } },
      { nome_oficio: { [Op.like]: searchPattern } },
      { link_oficio_anatel: { [Op.like]: searchPattern } },
      { link_oficio_justica: { [Op.like]: searchPattern } },
      { link_planilha_dominios: { [Op.like]: searchPattern } },
      { '$numeroSeiRef.numero$': { [Op.like]: searchPattern } },
    ] as unknown as WhereOptions<T>[];
    if (numExact !== null) {
      orConditions.unshift({ id: numExact } as unknown as WhereOptions<T>);
    } else {
      orConditions.unshift({ id: { [Op.like]: searchPattern } } as unknown as WhereOptions<T>);
    }
  }

  return { [Op.or]: orConditions } as WhereOptions<T>;
}

export function buildBlockdomiListWhere<T>(
  filters: BlockdomiListFilters,
  primaryField: BlockdomiPrimarySearchField
): WhereOptions<T> {
  const { search, searchField, ativo } = filters;
  const whereConditions: WhereOptions<T>[] = [];

  const searchWhere = buildBlockdomiSearchWhere<T>(search, searchField, primaryField);
  if (searchWhere) whereConditions.push(searchWhere);

  if (ativo !== undefined) {
    whereConditions.push({ ativo } as unknown as WhereOptions<T>);
  }

  if (whereConditions.length === 0) return {} as WhereOptions<T>;
  if (whereConditions.length === 1) return whereConditions[0];
  return { [Op.and]: whereConditions } as WhereOptions<T>;
}

export function resolveBlockdomiOrder(
  sortConfig: SortConfig,
  sortColumn: string | undefined,
  sortDirection: string | undefined,
  logContext: string
): Order {
  let order: Order = [['id', 'DESC']];
  if (!sortColumn || !sortDirection) return order;

  const sortResult = SortHelper.buildOrder(
    sortConfig,
    sortColumn,
    sortDirection.toUpperCase() as 'ASC' | 'DESC'
  );

  if (sortResult.isValid) {
    order = sortResult.order;
  } else {
    logger.warn(`${logContext} - Coluna de ordenação inválida`, {
      column: sortColumn,
      error: sortResult.error,
    });
  }

  return order;
}

export async function listBlockdomiPaginated<M extends Model>(options: {
  model: ModelStatic<M>;
  filters: BlockdomiListFilters;
  sortConfig: SortConfig;
  primarySearchField: BlockdomiPrimarySearchField;
  logContext: string;
}): Promise<{ data: Array<Record<string, unknown>>; pagination: StandardPagination }> {
  const { model, filters, sortConfig, primarySearchField, logContext } = options;
  const { page = 1, limit = 15, sortColumn, sortDirection } = filters;
  const offset = (page - 1) * limit;

  const where = buildBlockdomiListWhere<M>(filters, primarySearchField);
  const order = resolveBlockdomiOrder(sortConfig, sortColumn, sortDirection, logContext);

  const count = await model.count({
    where,
    include: BLOCKDOMI_LIST_INCLUDES,
    distinct: true,
    col: 'id',
  });

  const rows = await model.findAll({
    where,
    order,
    limit,
    offset,
    include: BLOCKDOMI_LIST_INCLUDES,
    raw: false,
  });

  return {
    data: rows.map((row) => row.toJSON() as Record<string, unknown>),
    pagination: buildPagination(page, limit, count),
  };
}
