import { prisma } from '../db/prisma';
import { buildSearchFilter, type PrismaWhere } from './queryFilters';
import { buildPagination } from './pagination';
import { resolveScheduledRoutineOrder } from './scheduledRoutineSortOrder';

export interface ListScheduledRoutinesFilters {
  page?: number;
  limit?: number;
  search?: string;
  /** Campo da busca avançada (ex.: alvo no SaaS) */
  searchField?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  empresa_id?: number | null;
}

export interface ListScheduledRoutinesResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    current_page: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

const DEFAULT_SEARCH_FIELDS = ['nome', 'tipo', 'descricao'];

export interface CreateScheduledRoutineServiceOptions {
  /** Campos em que a busca textual atua (ex.: SaaS inclui `alvo`). */
  searchFields?: string[];
  /** Colunas extras permitidas em `ORDER BY` (ex.: SaaS `alvo`). */
  additionalSortColumns?: string[];
}

interface RoutineModel<T> {
  new (): T;
  tableName?: string;
  hydrate?: (row: unknown) => T;
}

type Delegate = {
  findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  count: (args: Record<string, unknown>) => Promise<number>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  delete: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function delegateOf(tableName: string | undefined): Delegate | null {
  if (!tableName || tableName.startsWith('saas_')) return null;
  const found = (prisma as unknown as Record<string, Delegate | undefined>)[tableName];
  if (!found || typeof found.findMany !== 'function') return null;
  return found;
}

function materialize<T>(ModelClass: RoutineModel<T>, row: Record<string, unknown>): T {
  if (typeof ModelClass.hydrate === 'function') return ModelClass.hydrate(row);
  return row as T;
}

function emptyList<T>(page: number, limit: number): ListScheduledRoutinesResponse<T> {
  const standard = buildPagination(page, limit, 0);
  return {
    success: true,
    data: [],
    pagination: {
      ...standard,
      total: 0,
      page,
      limit,
      pages: standard.last_page,
    },
  };
}

export function createScheduledRoutineService<T>(
  ModelClass: RoutineModel<T>,
  options: CreateScheduledRoutineServiceOptions = {}
): {
  list: (filters: ListScheduledRoutinesFilters) => Promise<ListScheduledRoutinesResponse<T>>;
  getById: (id: number, empresaId?: number | null) => Promise<T | null>;
  create: (dados: Partial<T>) => Promise<T>;
  update: (id: number, dados: Partial<T>) => Promise<T>;
  delete: (id: number) => Promise<T>;
} {
  const searchFieldsList = options.searchFields?.length ? options.searchFields : DEFAULT_SEARCH_FIELDS;
  const additionalSortColumns = options.additionalSortColumns;

  return {
    async list(filters: ListScheduledRoutinesFilters) {
      const {
        page = 1,
        limit = 15,
        search,
        searchField,
        sort = 'created_at',
        direction = 'desc',
        empresa_id,
      } = filters;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const delegate = delegateOf(ModelClass.tableName);
      if (!delegate) return emptyList<T>(pageNum, limitNum);

      const conditions: PrismaWhere[] = [];
      if (empresa_id !== undefined && empresa_id !== null) conditions.push({ empresa_id });
      const searchWhere = buildSearchFilter(search, searchFieldsList, searchField);
      if (searchWhere) conditions.push(searchWhere);
      const where: PrismaWhere = conditions.length > 1 ? { AND: conditions } : conditions[0] || {};
      const orderBy = resolveScheduledRoutineOrder(sort, direction, additionalSortColumns);

      const [count, rows] = await Promise.all([
        delegate.count({ where }),
        delegate.findMany({
          where,
          orderBy,
          take: limitNum,
          skip: (pageNum - 1) * limitNum,
        }),
      ]);

      const standard = buildPagination(pageNum, limitNum, count);
      return {
        success: true,
        data: rows.map((row) => materialize(ModelClass, row)),
        pagination: {
          ...standard,
          total: count,
          page: pageNum,
          limit: limitNum,
          pages: standard.last_page,
        },
      };
    },

    async getById(id: number, empresaId?: number | null) {
      const delegate = delegateOf(ModelClass.tableName);
      if (!delegate) return null;
      const where =
        empresaId !== undefined && empresaId !== null ? { id, empresa_id: empresaId } : { id };
      const row = await delegate.findFirst({ where });
      return row ? materialize(ModelClass, row) : null;
    },

    async create(dados: Partial<T>) {
      const delegate = delegateOf(ModelClass.tableName);
      if (!delegate) {
        throw new Error('Rotina não encontrada');
      }
      const row = await delegate.create({ data: dados as Record<string, unknown> });
      return materialize(ModelClass, row);
    },

    async update(id: number, dados: Partial<T>) {
      const delegate = delegateOf(ModelClass.tableName);
      if (!delegate) throw new Error('Rotina não encontrada');
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) throw new Error('Rotina não encontrada');
      const row = await delegate.update({ where: { id }, data: dados as Record<string, unknown> });
      return materialize(ModelClass, row);
    },

    async delete(id: number) {
      const delegate = delegateOf(ModelClass.tableName);
      if (!delegate) throw new Error('Rotina não encontrada');
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) throw new Error('Rotina não encontrada');
      await delegate.delete({ where: { id } });
      return materialize(ModelClass, existing);
    },
  };
}
