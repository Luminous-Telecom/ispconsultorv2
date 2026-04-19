import {
  registrarLogBlockdomiElasticsearch,
  listarLogsBlockdomiElasticsearch,
  type RegistroBlockdomiLogPayload,
  type ListBlockdomiLogFilters
} from '../../elasticsearch/BlockdomiLogElasticsearchService';

export interface RegistroLogPayload {
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number;
  sucesso?: boolean;
  mensagem_erro?: string | null;
  user_agent?: string | null;
}

export interface ListLogAcessoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
  origem?: 'api_txt' | 'sistema';
}

export interface ListLogAcessoResponse {
  data: Array<Record<string, unknown>>;
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class BlockdomiLogAcessoService {
  static async registrar(payload: RegistroLogPayload): Promise<void> {
    await registrarLogBlockdomiElasticsearch(payload as RegistroBlockdomiLogPayload);
  }

  static async list(filters: ListLogAcessoFilters): Promise<ListLogAcessoResponse> {
    return listarLogsBlockdomiElasticsearch(filters as ListBlockdomiLogFilters);
  }
}
