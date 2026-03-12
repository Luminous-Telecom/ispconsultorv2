import { defaultApiClient } from './core';
import { ApiResponse, PaginatedResponse } from '../types';
import { extractApiErrorMessage } from '../utils/apiErrorHelper';

export interface AuditoriaLog {
  id: string;
  usuario_id: number | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  acao: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import';
  entidade: string;
  entidade_id: number | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  rota: string | null;
  metodo_http: string | null;
  observacoes: string | null;
  timestamp: string;
}

export interface AuditoriaFilters {
  page?: number;
  limit?: number;
  search?: string;
  acao?: string;
  entidade?: string;
  usuario_id?: number;
  empresa_id?: number;
  data_inicio?: string;
  data_fim?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export interface AuditoriaStats {
  total: number;
  acoes: Array<{ key: string; doc_count: number }>;
  entidades: Array<{ key: string; doc_count: number }>;
  usuarios: Array<{ key: string; doc_count: number }>;
}

class AuditoriaService {
  private baseEndpoint = '/auditoria';

  /**
   * Listar logs de auditoria
   */
  async list(filters: AuditoriaFilters = {}): Promise<ApiResponse<PaginatedResponse<AuditoriaLog>>> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.acao) params.append('acao', filters.acao);
    if (filters.entidade) params.append('entidade', filters.entidade);
    if (filters.usuario_id) params.append('usuario_id', filters.usuario_id.toString());
    if (filters.empresa_id) params.append('empresa_id', filters.empresa_id.toString());
    if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters.data_fim) params.append('data_fim', filters.data_fim);
    if (filters.sortColumn) params.append('sortColumn', filters.sortColumn);
    if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);

    const url = `${this.baseEndpoint}?${params.toString()}`;
    
    try {
      const response = await defaultApiClient.get<PaginatedResponse<AuditoriaLog>>(url);
      
      // O backend retorna { success: true, data: [...], pagination: {...} }
      // O ApiClient interceptor retorna response.data diretamente (que é { success: true, data: [...], pagination: {...} })
      // O ResponseTransformer.normalize vê que já tem 'success', então retorna como está
      // Mas o ResponseTransformer pode estar extraindo apenas o 'data', então response.data pode ser o array
      
      if (response.success && response.data) {
        // Se response.data é um array, significa que o ResponseTransformer extraiu apenas o array
        // Nesse caso, o objeto completo { success: true, data: [...], pagination: {...} } está em response
        if (Array.isArray(response.data)) {
          // Buscar pagination no objeto response completo
          const fullResponse = response as unknown as Record<string, unknown>;
          
          if (fullResponse.pagination) {
            return {
              success: true,
              data: {
                success: true,
                data: response.data as AuditoriaLog[],
                pagination: fullResponse.pagination as PaginatedResponse<AuditoriaLog>['pagination']
              } as PaginatedResponse<AuditoriaLog>
            };
          }
        }
        
        // Se response.data é um objeto com data e pagination
        const responseData = response.data as unknown as Record<string, unknown>;
        if (responseData && 'data' in responseData && 'pagination' in responseData) {
          const dataArray = responseData.data;
          const pagination = responseData.pagination;
          
          if (Array.isArray(dataArray)) {
            return {
              success: true,
              data: {
                success: true,
                data: dataArray as AuditoriaLog[],
                pagination: pagination as PaginatedResponse<AuditoriaLog>['pagination']
              } as PaginatedResponse<AuditoriaLog>
            };
          }
        }
        
        // Se response.data já é PaginatedResponse completo
        const paginatedData = response.data as PaginatedResponse<AuditoriaLog>;
        if (paginatedData && Array.isArray(paginatedData.data) && paginatedData.pagination) {
          return {
            success: true,
            data: paginatedData
          };
        }
      }
      
      return {
        success: false,
        message: response.message || 'Erro ao carregar logs de auditoria',
        data: {
          success: true,
          data: [],
          pagination: {
            current_page: 1,
            per_page: 15,
            total: 0,
            last_page: 0,
            from: 0,
            to: 0
          }
        } as PaginatedResponse<AuditoriaLog>
      };
    } catch (error) {
      // Log do erro (apenas em desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Erro ao buscar logs de auditoria:', error);
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao carregar logs de auditoria',
        data: {
          success: true,
          data: [],
          pagination: {
            current_page: 1,
            per_page: 15,
            total: 0,
            last_page: 0,
            from: 0,
            to: 0
          }
        } as PaginatedResponse<AuditoriaLog>
      };
    }
  }

  /**
   * Listar logs de auditoria por tenant (painel SaaS) - usa endpoint /saas/auditoria
   */
  async listByTenant(filters: AuditoriaFilters & { empresa_id: number }): Promise<ApiResponse<PaginatedResponse<AuditoriaLog>>> {
    const params = new URLSearchParams();
    params.append('empresa_id', filters.empresa_id.toString());
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.acao) params.append('acao', filters.acao);
    if (filters.entidade) params.append('entidade', filters.entidade);
    if (filters.usuario_id) params.append('usuario_id', filters.usuario_id.toString());
    if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters.data_fim) params.append('data_fim', filters.data_fim);
    if (filters.sortColumn) params.append('sortColumn', filters.sortColumn);
    if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);

    const url = `/saas/auditoria?${params.toString()}`;
    const response = await defaultApiClient.get<PaginatedResponse<AuditoriaLog>>(url);
    if (response.success && response.data) {
      const rd = response.data as unknown as Record<string, unknown>;
      if (rd && 'data' in rd && 'pagination' in rd) {
        return { success: true, data: rd as unknown as PaginatedResponse<AuditoriaLog> };
      }
    }
    const emptyPagination = { current_page: 1, last_page: 1, per_page: 20, total: 0, from: 0, to: 0 };
    return {
      success: response.success ?? false,
      message: (response as { message?: string }).message,
      data: { success: true, data: [], pagination: emptyPagination }
    };
  }

  /**
   * Buscar log específico por ID
   */
  async getById(id: string): Promise<ApiResponse<AuditoriaLog>> {
    return defaultApiClient.get<AuditoriaLog>(`${this.baseEndpoint}/${id}`);
  }

  /**
   * Obter estatísticas de auditoria
   */
  async getStats(): Promise<ApiResponse<AuditoriaStats>> {
    return defaultApiClient.get<AuditoriaStats>(`${this.baseEndpoint}/stats/summary`);
  }

  /**
   * Buscar logs de auditoria por entidade e entidade_id
   */
  async getByEntity(entidade: string, entidadeId: number): Promise<ApiResponse<AuditoriaLog[]>> {
    const params = new URLSearchParams();
    params.append('entidade', entidade);
    params.append('entidade_id', entidadeId.toString());
    
    return defaultApiClient.get<AuditoriaLog[]>(`${this.baseEndpoint}/entity?${params.toString()}`);
  }

  /**
   * Gerar PDF de auditoria para uma entidade específica
   * Retorna um Blob para ser exibido no ImprimirModal
   */
  async generatePdf(entidade: string, entidadeId: number): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('entidade', entidade);
    params.append('entidade_id', entidadeId.toString());
    
    const url = `${this.baseEndpoint}/pdf?${params.toString()}`;
    
    try {
      interface ApiClientWithApi {
        api: import('axios').AxiosInstance;
      }
      const apiInstance = (defaultApiClient as unknown as ApiClientWithApi).api;
      
      const response = await apiInstance.get<Blob>(url, {
        responseType: 'blob',
        timeout: 60000
      });

      const blob = (response as unknown) as Blob;
      
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }
      
      return blob;
    } catch (error) {
      if (error instanceof Error && !('isAxiosError' in error)) {
        throw error;
      }
      
      const errorMessage = await extractApiErrorMessage(error, {
        defaultMessage: 'Erro ao gerar PDF de auditoria',
        handleBlobResponse: true,
        customStatusMessages: {
          404: 'Nenhum log de auditoria encontrado para este registro'
        }
      });
      
      throw new Error(errorMessage);
    }
  }
}

export const auditoriaService = new AuditoriaService();

