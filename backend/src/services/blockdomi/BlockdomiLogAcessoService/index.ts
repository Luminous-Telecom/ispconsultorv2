import { SistemaLogOperacionalService } from '../../sistema/SistemaLogOperacionalService';
import { SistemaLogOperacionalQueryService } from '../../sistema/SistemaLogOperacionalQueryService';

export interface RegistroLogPayload {
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number;
  sucesso?: boolean;
  mensagem_erro?: string | null;
  user_agent?: string | null;
  empresa_id?: number | null;
}

export interface ListLogAcessoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
  origem?: 'api_txt' | 'sistema';
  empresa_id?: number;
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
  static async registrar(payload: RegistroLogPayload): Promise<Record<string, unknown>> {
    return SistemaLogOperacionalService.registrarBlockdomiAcesso(payload);
  }

  static async list(filters: ListLogAcessoFilters): Promise<ListLogAcessoResponse> {
    return SistemaLogOperacionalQueryService.listBlockdomiAcesso(filters);
  }
}
