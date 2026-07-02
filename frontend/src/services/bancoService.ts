/**
 * BancoService - Servico refatorado usando BaseService
 * Mantem compatibilidade com codigo existente atraves de metodos estaticos
 */
import { BaseService, defaultApiClient, unwrapResponse, unwrapArrayResponse } from './core';
import { ResponseTransformer } from './core/ResponseTransformer';
import { ErrorHandler } from './core/ErrorHandler';
import { Banco, CreateBanco, UpdateBanco, BancoFilters, PaginatedResponse, ApiResponse } from '../types';
import { AxiosError } from 'axios';

/**
 * Classe de servico para operacoes relacionadas a Bancos
 * Usa BaseService para operacoes CRUD padrao
 */
class BancoServiceClass extends BaseService<Banco, CreateBanco, UpdateBanco, BancoFilters> {
  constructor() {
    super(defaultApiClient, '/bancos');
  }

  /**
   * Buscar bancos ativos
   */
  async findAtivos(): Promise<ApiResponse<Banco[]>> {
    return this.customGet<Banco[]>('/ativos');
  }

  /**
   * Testar conexao do banco
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

  async gerarWebhookSecret(id: number): Promise<ApiResponse<{ webhook_secret: string }>> {
    return this.customPost<{ webhook_secret: string }>(`/${id}/gerar-webhook-secret`);
  }

  /**
   * Obter URL padrao do banco
   * Nota: Este endpoint usa /api/bancos ao inves de /bancos, entao fazemos uma chamada direta ao ApiClient
   */
  async urlPadrao(tipoBanco: string): Promise<ApiResponse<{ url: string }>> {
    try {
      const response = await this.apiClient.get<{ url: string }>(`/bancos/${tipoBanco}/url-padrao`);
      return ResponseTransformer.normalize<{ url: string }>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }
}

// Instancia unica do servico
const bancoServiceInstance = new BancoServiceClass();

/**
 * BancoService - API estatica para compatibilidade com codigo existente
 * Todos os metodos delegam para a instancia do servico
 */
export class BancoService {
  /**
   * Listar bancos com filtros e paginacao
   */
  static async list(filters: BancoFilters = {}): Promise<PaginatedResponse<Banco>> {
    return bancoServiceInstance.list(filters);
  }

  /**
   * Buscar banco por ID
   */
  static async getById(id: number): Promise<Banco> {
    const response = await bancoServiceInstance.getById(id);
    return unwrapResponse<Banco>(response);
  }

  /**
   * Criar novo banco
   */
  static async create(data: CreateBanco): Promise<Banco> {
    const response = await bancoServiceInstance.create(data);
    return unwrapResponse<Banco>(response);
  }

  /**
   * Atualizar banco
   */
  static async update(id: number, data: UpdateBanco): Promise<Banco> {
    const response = await bancoServiceInstance.update(id, data);
    return unwrapResponse<Banco>(response);
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
    return unwrapArrayResponse<Banco>(response, { fallback: [], throwOnFailure: false });
  }

  /**
   * Testar conexao do banco
   */
  static async testarConexao(id: number): Promise<{ success: boolean; message: string }> {
    const response = await bancoServiceInstance.testarConexao(id);
    return unwrapResponse<{ success: boolean; message: string }>(response);
  }

  /**
   * Buscar dados da API do banco
   */
  static async buscarDadosApi(id: number): Promise<{ success: boolean; message: string }> {
    const response = await bancoServiceInstance.buscarDadosApi(id);
    return unwrapResponse<{ success: boolean; message: string }>(response);
  }

  static async gerarWebhookSecret(id: number): Promise<string> {
    const response = await bancoServiceInstance.gerarWebhookSecret(id);
    const data = unwrapResponse<{ webhook_secret: string }>(response, {
      fallback: { webhook_secret: '' },
      throwOnFailure: false,
    });
    return data.webhook_secret;
  }

  /**
   * Obter URL padrao do banco
   */
  static async urlPadrao(tipoBanco: string): Promise<{ url: string }> {
    const response = await bancoServiceInstance.urlPadrao(tipoBanco);
    return unwrapResponse<{ url: string }>(response);
  }
}

/**
 * Exportar tambem a instancia do servico para uso direto (opcional)
 */
export const bancoService = bancoServiceInstance;
