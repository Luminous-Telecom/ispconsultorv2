import { apiService } from './api';

export interface ApiToken {
  id: number;
  nome: string;
  token_prefix: string;
  ativo: boolean;
  ultimo_uso: string | null;
  criado_por: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiTokenCreated {
  token: ApiToken;
  token_plain: string;
}

export class ApiTokenService {
  static async list(): Promise<ApiToken[]> {
    const response = await apiService.get<ApiToken[]>('/api-tokens') as { success: boolean; data?: ApiToken[] };
    return response.data ?? [];
  }

  static async create(nome: string): Promise<ApiTokenCreated> {
    const response = await apiService.post<ApiTokenCreated>('/api-tokens', { nome }) as { success: boolean; data?: ApiTokenCreated; message?: string };
    if (!response.data) throw new Error(response.message ?? 'Erro ao criar token');
    return response.data;
  }

  static async revoke(id: number): Promise<void> {
    await apiService.delete(`/api-tokens/${id}`);
  }
}
