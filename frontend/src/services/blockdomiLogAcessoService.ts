import { defaultApiClient } from './core';
import type { PaginatedResponse } from 'types';

export interface BlockdomiLogAcessoItem {
  id: number;
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number | null;
  sucesso: boolean;
  mensagem_erro: string | null;
  user_agent: string | null;
  created_at?: string;
  created_at_formatada?: string;
  empresa_id?: number | null;
  empresa_nome?: string | null;
}

export interface BlockdomiLogAcessoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
  /** API = listas TXT; sistema = demais eventos do índice (ex. sync SEI). */
  origem?: 'api_txt' | 'sistema';
}

export class BlockdomiLogAcessoService {
  static async list(filters: BlockdomiLogAcessoFilters = {}): Promise<PaginatedResponse<BlockdomiLogAcessoItem>> {
    const response = await defaultApiClient.get<{ data: BlockdomiLogAcessoItem[]; pagination: PaginatedResponse<BlockdomiLogAcessoItem>['pagination'] }>(
      '/blockdomi/logs-acesso',
      { params: filters }
    );
    const fallback: PaginatedResponse<BlockdomiLogAcessoItem> = {
      success: true,
      data: [],
      pagination: { current_page: 1, per_page: 15, total: 0, last_page: 0, from: 0, to: 0 }
    };
    if (response && typeof response === 'object' && 'data' in response) {
      const payload = response as { success?: boolean; data?: { data?: BlockdomiLogAcessoItem[]; pagination?: PaginatedResponse<BlockdomiLogAcessoItem>['pagination'] } };
      const inner = payload.data;
      if (inner && typeof inner === 'object' && 'data' in inner && 'pagination' in inner) {
        return {
          success: true,
          data: inner.data ?? [],
          pagination: inner.pagination ?? fallback.pagination
        };
      }
      if (Array.isArray(payload.data)) {
        return {
          success: true,
          data: payload.data,
          pagination: (payload as PaginatedResponse<BlockdomiLogAcessoItem>).pagination ?? fallback.pagination
        };
      }
    }
    return fallback;
  }
}
