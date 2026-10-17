import { buildPagination } from '../../../utils/pagination';

export interface ListScheduledRoutinesFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  empresa_id?: number | null;
}

export interface ListSaasScheduledRoutinesResponse {
  success: boolean;
  data: any[];
  pagination: ReturnType<typeof buildPagination> & {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

function emptyList(filters: ListScheduledRoutinesFilters): ListSaasScheduledRoutinesResponse {
  const page = Number(filters.page ?? 1);
  const limit = Number(filters.limit ?? 15);
  const standard = buildPagination(page, limit, 0);
  return {
    success: true,
    data: [],
    pagination: { ...standard, total: 0, page, limit, pages: standard.last_page },
  };
}

export class SaasScheduledRoutineService {
  static async list(filters: ListScheduledRoutinesFilters = {}) {
    return emptyList(filters);
  }

  static async getById(_id: number, _empresaId?: number | null): Promise<any> {
    return null;
  }

  static async create(_dados: Record<string, unknown>): Promise<any> {
    return null;
  }

  static async update(_id: number, _dados: Record<string, unknown>): Promise<any> {
    return null;
  }

  static async delete(_id: number): Promise<any> {
    return null;
  }
}
