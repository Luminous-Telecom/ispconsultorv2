import { prisma } from '../db/prisma';
import { VersaoBlockdomi } from '../models/blockdomi/VersaoBlockdomi';
import { NumeroSeiAnatelBlockdomi } from '../models/blockdomi/NumeroSeiAnatelBlockdomi';
import { SortHelper, SortConfig, type PrismaOrderBy } from './sortHelper';
import { buildPagination, StandardPagination } from './pagination';
import { logger } from './logger';

export const BLOCKDOMI_LIST_INCLUDES = [
  { model: VersaoBlockdomi, as: 'versaoRef' as const, attributes: ['numero'], required: false },
  { model: NumeroSeiAnatelBlockdomi, as: 'numeroSeiRef' as const, attributes: ['numero'], required: false },
];

const RELATION_FIELDS: Record<string, string> = {
  versaoRef: 'blockdomi_versoes',
  numeroSeiRef: 'blockdomi_numeros_sei_anatel',
};

const BLOCKDOMI_SHARED_TEXT_FIELDS = [
  'descricao',
  'nome_oficio',
  'link_oficio_anatel',
  'link_oficio_justica',
  'link_planilha_dominios',
] as const;

const LIST_INCLUDE = {
  blockdomi_versoes: { select: { numero: true } },
  blockdomi_numeros_sei_anatel: { select: { numero: true } },
};

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

type Where = { [key: string]: any };

type ListDelegate = {
  count: (args: Record<string, unknown>) => Promise<number>;
  findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
};

function contains(value: string): Where {
  return { contains: value };
}

export function buildBlockdomiSearchWhere(
  search: string | undefined,
  searchField: string | undefined,
  primaryField: BlockdomiPrimarySearchField
): Where | null {
  if (!search?.trim()) return null;

  const term = search.trim();
  const numExact = /^\d+$/.test(term) ? parseInt(term, 10) : null;
  const textFields = [primaryField, ...BLOCKDOMI_SHARED_TEXT_FIELDS];

  if (searchField === 'id') {
    return numExact !== null ? { id: numExact } : { id: { lt: 0 } };
  }

  if (searchField === 'numero_sei_anatel') {
    return { blockdomi_numeros_sei_anatel: { numero: contains(term) } };
  }

  if (searchField && textFields.includes(searchField as (typeof textFields)[number])) {
    return { [searchField]: contains(term) };
  }

  const orConditions: Where[] = [
    { [primaryField]: contains(term) },
    { descricao: contains(term) },
    { nome_oficio: contains(term) },
    { link_oficio_anatel: contains(term) },
    { link_oficio_justica: contains(term) },
    { link_planilha_dominios: contains(term) },
    { blockdomi_numeros_sei_anatel: { numero: contains(term) } },
  ];

  if (numExact !== null) orConditions.unshift({ id: numExact });
  return { OR: orConditions };
}

export function buildBlockdomiListWhere(
  filters: BlockdomiListFilters,
  primaryField: BlockdomiPrimarySearchField
): Where {
  const { search, searchField, ativo } = filters;
  const whereConditions: Where[] = [];

  const searchWhere = buildBlockdomiSearchWhere(search, searchField, primaryField);
  if (searchWhere) whereConditions.push(searchWhere);

  if (ativo !== undefined) whereConditions.push({ ativo });

  if (whereConditions.length === 0) return {};
  if (whereConditions.length === 1) return whereConditions[0];
  return { AND: whereConditions };
}

function mapOrder(order: PrismaOrderBy[]): PrismaOrderBy[] {
  return order.map((item) => {
    const mapped: PrismaOrderBy = {};
    for (const [key, value] of Object.entries(item)) {
      const relation = RELATION_FIELDS[key];
      if (relation && value && typeof value === 'object') {
        mapped[relation] = value;
      } else {
        mapped[key] = value;
      }
    }
    return mapped;
  });
}

export function resolveBlockdomiOrder(
  sortConfig: SortConfig,
  sortColumn: string | undefined,
  sortDirection: string | undefined,
  logContext: string
): PrismaOrderBy[] {
  let order: PrismaOrderBy[] = [{ id: 'desc' }];
  if (!sortColumn || !sortDirection) return order;

  const sortResult = SortHelper.buildOrder(
    sortConfig,
    sortColumn,
    sortDirection.toUpperCase() as 'ASC' | 'DESC'
  );

  if (sortResult.isValid) {
    order = mapOrder(sortResult.order);
  } else {
    logger.warn(`${logContext} - Coluna de ordenação inválida`, {
      column: sortColumn,
      error: sortResult.error,
    });
  }

  return order;
}

function presentRow(row: Record<string, unknown>): Record<string, unknown> {
  const versao = row.blockdomi_versoes as { numero?: string } | null | undefined;
  const sei = row.blockdomi_numeros_sei_anatel as { numero?: string } | null | undefined;
  const { blockdomi_versoes: _versao, blockdomi_numeros_sei_anatel: _sei, ...rest } = row;
  return {
    ...rest,
    versaoRef: versao ? { numero: versao.numero } : null,
    numeroSeiRef: sei ? { numero: sei.numero } : null,
  };
}

export async function listBlockdomiPaginated(options: {
  model: { tableName?: string };
  filters: BlockdomiListFilters;
  sortConfig: SortConfig;
  primarySearchField: BlockdomiPrimarySearchField;
  logContext: string;
}): Promise<{ data: Array<Record<string, unknown>>; pagination: StandardPagination }> {
  const { model, filters, sortConfig, primarySearchField, logContext } = options;
  const { page = 1, limit = 15, sortColumn, sortDirection } = filters;
  const offset = (page - 1) * limit;
  const tableName = model.tableName;
  const delegate =
    tableName && !tableName.startsWith('saas_')
      ? (prisma as unknown as Record<string, ListDelegate | undefined>)[tableName]
      : undefined;

  if (!delegate) {
    return { data: [], pagination: buildPagination(page, limit, 0) };
  }

  const where = buildBlockdomiListWhere(filters, primarySearchField);
  const orderBy = resolveBlockdomiOrder(sortConfig, sortColumn, sortDirection, logContext);

  const [count, rows] = await Promise.all([
    delegate.count({ where }),
    delegate.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: LIST_INCLUDE,
    }),
  ]);

  return {
    data: rows.map(presentRow),
    pagination: buildPagination(page, limit, count),
  };
}
