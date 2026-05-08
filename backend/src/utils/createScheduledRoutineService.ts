import { Op, WhereOptions } from 'sequelize';
import type { ModelStatic, Model } from 'sequelize';
import { buildSearchFilter } from './queryFilters';
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

export function createScheduledRoutineService<T extends Model>(
  Model: ModelStatic<T>,
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
        empresa_id
      } = filters;

      const offset = (Number(page) - 1) * Number(limit);
      const conditions: WhereOptions[] = [];
      if (empresa_id !== undefined && empresa_id !== null) conditions.push({ empresa_id });
      const searchWhere = buildSearchFilter(search, searchFieldsList, searchField);
      if (searchWhere) conditions.push(searchWhere);
      const where: WhereOptions = conditions.length > 1 ? { [Op.and]: conditions } : (conditions[0] || {});

      const order = resolveScheduledRoutineOrder(sort, direction, additionalSortColumns);

      const result = await (Model as unknown as {
        findAndCountAll: (opts: object) => Promise<{ count: number; rows: T[] }>;
      }).findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order
      });
      const count = result.count;
      const rows = result.rows;

      const totalPages = Math.ceil(count / Number(limit));
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const from = count > 0 ? offset + 1 : 0;
      const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

      return {
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          pages: totalPages,
          current_page: pageNum,
          per_page: limitNum,
          last_page: totalPages,
          from,
          to
        }
      };
    },

    async getById(id: number, empresaId?: number | null) {
      if (empresaId !== undefined && empresaId !== null) {
        return (Model as unknown as { findOne: (opts: object) => Promise<T | null> }).findOne({
          where: { id, empresa_id: empresaId }
        });
      }
      return Model.findByPk(id) as Promise<T | null>;
    },

    async create(dados: Partial<T>) {
      return Model.create(dados as never) as Promise<T>;
    },

    async update(id: number, dados: Partial<T>) {
      const routine = (await Model.findByPk(id)) as T | null;
      if (!routine) {
        throw new Error('Rotina não encontrada');
      }
      await (routine as unknown as { update: (d: object) => Promise<void> }).update(dados as object);
      await (routine as unknown as { reload: () => Promise<void> }).reload();
      return routine;
    },

    async delete(id: number) {
      const routine = (await Model.findByPk(id)) as T | null;
      if (!routine) {
        throw new Error('Rotina não encontrada');
      }
      await (routine as unknown as { destroy: () => Promise<void> }).destroy();
      return routine;
    }
  };
}
