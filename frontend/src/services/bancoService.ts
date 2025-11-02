/**
 * BancoService - Serviço refatorado usando BaseService
 * Mantém compatibilidade com código existente através de métodos estáticos
 */
import { BaseService, defaultApiClient } from './core';
import { ResponseTransformer } from './core/ResponseTransformer';
import { ErrorHandler } from './core/ErrorHandler';
import { Banco, CreateBanco, UpdateBanco, BancoFilters, PaginatedResponse, ApiResponse } from '../types';
import { AxiosError } from 'axios';

/**
 * Classe de serviço para operações relacionadas a Bancos
 * Usa BaseService para operações CRUD padrão
 */
class BancoServiceClass extends BaseService<Banco, CreateBanco, UpdateBanco, BancoFilters> {
  constructor() {
    super(defaultApiClient, '/bancos');
  }

  /**
   * Buscar bancos ativos
   */
  async findAtivos(): Promise<ApiResponse<Banco[]>> {
    return this.customGet<Banco[]>(`/ativos`);
  }

  /**
   * Testar conexão do banco
   */
  async testarConexao(id: number): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.customPost<{ success: boolean; message: string }>(`/${id}/testar-conexao`);
  }

  /**
   * Buscar dados da API do banco
   */
  async buscarDadosApi(id: number): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.customPost<{ success: boolean; message: string }>(`/${id}/buscar-dados-api`);
  }

  /**
   * Obter URL padrão do banco
   * Nota: Este endpoint usa /api/bancos ao invés de /bancos, então fazemos uma chamada direta ao ApiClient
   */
  async urlPadrao(tipoBanco: string): Promise<ApiResponse<{ url: string }>> {
    try {
      // Este endpoint tem um prefixo diferente, então fazemos uma chamada direta
      const response = await this.apiClient.get<{ url: string }>(`/api/bancos/${tipoBanco}/url-padrao`);
      // O ApiClient já retorna ApiResponse<T>, então só precisamos normalizar
      return ResponseTransformer.normalize<{ url: string }>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }
}

// Instância única do serviço
const bancoServiceInstance = new BancoServiceClass();

/**
 * BancoService - API estática para compatibilidade com código existente
 * Todos os métodos delegam para a instância do serviço
 */
export class BancoService {
  /**
   * Listar bancos com filtros e paginação
   */
  static async list(filters: BancoFilters = {}): Promise<PaginatedResponse<Banco>> {
    return bancoServiceInstance.list(filters);
  }

  /**
   * Buscar banco por ID
   */
  static async getById(id: number): Promise<Banco> {
    const response = await bancoServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Banco;
  }

  /**
   * Criar novo banco
   */
  static async create(data: CreateBanco): Promise<Banco> {
    const response = await bancoServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Banco;
  }

  /**
   * Atualizar banco
   */
  static async update(id: number, data: UpdateBanco): Promise<Banco> {
    const response = await bancoServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Banco;
  }

  /**
   * Excluir banco
   */
  static async delete(id: number): Promise<void> {
    await bancoServiceInstance.delete(id);
  }

  /**
   * Buscar bancos ativos
   */
  static async findAtivos(): Promise<Banco[]> {
    const response = await bancoServiceInstance.findAtivos();
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Testar conexão do banco
   */
  static async testarConexao(id: number): Promise<{ success: boolean; message: string }> {
    const response = await bancoServiceInstance.testarConexao(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as { success: boolean; message: string };
  }

  /**
   * Buscar dados da API do banco
   */
  static async buscarDadosApi(id: number): Promise<{ success: boolean; message: string }> {
    const response = await bancoServiceInstance.buscarDadosApi(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as { success: boolean; message: string };
  }

  /**
   * Obter URL padrão do banco
   */
  static async urlPadrao(tipoBanco: string): Promise<{ url: string }> {
    const response = await bancoServiceInstance.urlPadrao(tipoBanco);
    if (response.data) {
      return response.data;
    }
    return response as unknown as { url: string };
  }
}

/**
 * Exportar também a instância do serviço para uso direto (opcional)
 */
export const bancoService = bancoServiceInstance;
