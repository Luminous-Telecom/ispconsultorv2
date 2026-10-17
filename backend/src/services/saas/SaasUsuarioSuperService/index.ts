import { buildSaasPagination } from '../../../utils/pagination';

type SaasNivelAcesso = 'admin' | 'suporte' | 'financeiro';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

interface CreateData {
  nome: string;
  email: string;
  senha: string;
  nivel_acesso?: SaasNivelAcesso;
  ativo?: boolean;
}

interface UpdateData {
  nome?: string;
  email?: string;
  senha?: string;
  nivel_acesso?: SaasNivelAcesso;
  ativo?: boolean;
}

export class SaasUsuarioSuperService {
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

  static async create(_data: CreateData): Promise<any> {
    return null;
  }

  static async update(_id: number, _data: UpdateData): Promise<void> {
    return;
  }

  static async delete(_id: number): Promise<void> {
    return;
  }
}
