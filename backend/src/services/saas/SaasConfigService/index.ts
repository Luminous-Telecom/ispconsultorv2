import { buildSaasPagination } from '../../../utils/pagination';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  empresa_id?: number;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

function emptyList(filters: ListFilters) {
  const { page = 1, limit = 20 } = filters;
  return { data: [] as any[], pagination: buildSaasPagination(page, limit, 0) };
}

export class SaasServidorEmailService {
  static async list(filters: ListFilters) {
    return emptyList(filters);
  }
  static async getById(_id: number): Promise<any> { return null; }
  static async create(_data: Record<string, unknown>): Promise<any> { return null; }
  static async update(_id: number, _data: Record<string, unknown>): Promise<void> { return; }
  static async delete(_id: number): Promise<void> { return; }
}

export class SaasServidorWhatsappService {
  static async list(filters: ListFilters) {
    return emptyList(filters);
  }
  static async getById(_id: number): Promise<any> { return null; }
  static async create(_data: Record<string, unknown>): Promise<any> { return null; }
  static async update(_id: number, _data: Record<string, unknown>): Promise<void> { return; }
  static async delete(_id: number): Promise<void> { return; }
}

export class SaasBancoService {
  static async findAsaasNFSeIntegracao(_transaction?: unknown): Promise<any> {
    return null;
  }

  static async list(filters: ListFilters) {
    return emptyList(filters);
  }
  static async getById(_id: number): Promise<any> { return null; }
  static async create(_data: Record<string, unknown>): Promise<any> { return null; }
  static async update(_id: number, _data: Record<string, unknown>, _transaction?: unknown): Promise<void> { return; }
  static async delete(_id: number): Promise<void> { return; }
}
