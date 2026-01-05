/**
 * NotaFiscalService - Serviço para operações relacionadas a Notas Fiscais Eletrônicas
 */
import { BaseService, defaultApiClient } from './core';
import { NotaFiscal, CreateNotaFiscal, NotaFiscalFilters, PaginatedResponse, ApiResponse } from '../types';
import { extractApiErrorMessage } from '../utils/apiErrorHelper';

/**
 * Classe de serviço para operações relacionadas a Notas Fiscais
 */
class NotaFiscalServiceClass extends BaseService<NotaFiscal, CreateNotaFiscal, Partial<CreateNotaFiscal>, NotaFiscalFilters> {
  constructor() {
    super(defaultApiClient, '/notas-fiscais');
  }

  /**
   * Gerar uma nota fiscal individual
   */
  async gerar(dados: CreateNotaFiscal): Promise<ApiResponse<NotaFiscal>> {
    return this.customPost<NotaFiscal>('/gerar', dados as unknown as Record<string, string | number | boolean | null | undefined | object>);
  }

  /**
   * Consultar status de uma nota fiscal
   */
  async consultarStatus(id: number): Promise<ApiResponse<{ status: string }>> {
    return this.customGet<{ status: string }>(`/${id}/status`);
  }

  /**
   * Cancelar uma nota fiscal
   */
  async cancelar(id: number, justificativa: string): Promise<ApiResponse<void>> {
    return this.customPost<void>(`/${id}/cancelar`, { justificativa });
  }

  /**
   * Listar notas fiscais de um cliente específico
   */
  async listarPorCliente(clienteId: number, page = 1, limit = 15): Promise<PaginatedResponse<NotaFiscal>> {
    const response = await this.customGet<PaginatedResponse<NotaFiscal>>(`/cliente/${clienteId}?page=${page}&limit=${limit}`);
    if (response.data && typeof response.data === 'object' && 'data' in response.data && 'pagination' in response.data) {
      return response.data;
    }
    return response as unknown as PaginatedResponse<NotaFiscal>;
  }

  /**
   * Imprimir PDF de uma nota fiscal
   */
  async imprimirPdf(id: number): Promise<Blob> {
    interface ApiClientWithApi {
      api: import('axios').AxiosInstance;
    }
    const apiInstance = (this.apiClient as unknown as ApiClientWithApi).api;
    
    try {
      // O interceptor do axios retorna response.data diretamente quando responseType é 'blob'
      const response = await apiInstance.get(`/notas-fiscais/${id}/pdf`, {
        responseType: 'blob',
        timeout: 60000
      });
      
      // O interceptor retorna response.data diretamente, então response já é o blob
      const blob = response as unknown as Blob;
      
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }
      
      // Verificar se o blob é muito pequeno (pode ser uma mensagem de erro JSON)
      if (blob.size < 1000) {
        try {
          const text = await blob.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Erro ao gerar PDF da nota fiscal');
        } catch (parseError) {
          // Se não for JSON, continuar com o blob
          if (blob.size < 100) {
            throw new Error('Resposta do servidor muito pequena para ser um PDF válido');
          }
        }
      }
      
      return blob;
    } catch (error) {
      if (error instanceof Error && !('isAxiosError' in error)) {
        throw error;
      }
      
      const errorMessage = await extractApiErrorMessage(error, {
        defaultMessage: 'Erro ao gerar PDF da nota fiscal',
        handleBlobResponse: true,
        customStatusMessages: {
          404: 'PDF da nota fiscal não encontrado'
        }
      });
      
      throw new Error(errorMessage);
    }
  }
}

// Instância única do serviço
const notaFiscalServiceInstance = new NotaFiscalServiceClass();

/**
 * NotaFiscalService - API estática para compatibilidade
 */
export class NotaFiscalService {
  /**
   * Listar notas fiscais com filtros e paginação
   */
  static async list(filters?: NotaFiscalFilters): Promise<PaginatedResponse<NotaFiscal>> {
    return notaFiscalServiceInstance.list(filters);
  }

  /**
   * Buscar nota fiscal por ID
   */
  static async getById(id: number): Promise<ApiResponse<NotaFiscal>> {
    return notaFiscalServiceInstance.getById(id);
  }

  /**
   * Gerar uma nota fiscal individual
   */
  static async gerar(dados: CreateNotaFiscal): Promise<ApiResponse<NotaFiscal>> {
    return notaFiscalServiceInstance.gerar(dados);
  }

  /**
   * Consultar status de uma nota fiscal
   */
  static async consultarStatus(id: number): Promise<ApiResponse<{ status: string }>> {
    return notaFiscalServiceInstance.consultarStatus(id);
  }

  /**
   * Cancelar uma nota fiscal
   */
  static async cancelar(id: number, justificativa: string): Promise<ApiResponse<void>> {
    return notaFiscalServiceInstance.cancelar(id, justificativa);
  }

  /**
   * Listar notas fiscais de um cliente específico
   */
  static async listarPorCliente(clienteId: number, page = 1, limit = 15): Promise<PaginatedResponse<NotaFiscal>> {
    return notaFiscalServiceInstance.listarPorCliente(clienteId, page, limit);
  }

  /**
   * Imprimir PDF de uma nota fiscal
   */
  static async imprimirPdf(id: number): Promise<Blob> {
    return notaFiscalServiceInstance.imprimirPdf(id);
  }
}

// Exportar instância para uso direto se necessário
export const notaFiscalService = notaFiscalServiceInstance;

