import { buildSaasPagination } from '../../../utils/pagination';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export class SaasDadosEmpresaCrudService {
  static async list(filters: ListFilters) {
    const { page = 1, limit = 20 } = filters;
    return {
      data: [],
      pagination: buildSaasPagination(page, limit, 0),
    };
  }

  static async getById(_id: number): Promise<any> {
    return null;
  }

  static async create(_data: Record<string, unknown>): Promise<any> {
    return null;
  }

  static async update(_id: number, _data: Record<string, unknown>): Promise<void> {
    return;
  }

  static async delete(_id: number): Promise<void> {
    return;
  }
}
