/**
 * MensagemHistoricoService - Serviço para histórico de mensagens enviadas
 */
import { BaseService, defaultApiClient } from './core';
import { PaginatedResponse, ApiResponse } from '../types';

export interface MensagemHistorico {
  id: number;
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  titulo?: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  servidor_id?: number;
  usuario_id?: number;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  usuario?: {
    id: number;
    nome: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface MensagemHistoricoFilters {
  tipo?: 'email' | 'whatsapp';
  status?: 'enviada' | 'erro';
  /** Termo de busca (usa searchField quando informado) */
  search?: string;
  /** Campo para buscar: id, tipo, cliente_nome, titulo, destinatario, mensagem, status */
  searchField?: string;
  destinatario?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  usuario_id?: number;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  /** SuperAdmin: mesclar ERP + SaaS na rota `/saas/mensagens-historico` */
  incluir_erp?: boolean;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Classe de serviço para operações relacionadas ao histórico de mensagens
 */
class MensagemHistoricoServiceClass extends BaseService<MensagemHistorico, Record<string, unknown>, Record<string, unknown>, MensagemHistoricoFilters> {
  constructor(baseEndpoint = '/mensagens-historico') {
    super(defaultApiClient, baseEndpoint);
  }

  /**
   * Buscar mensagens por entidade
   */
  async getByEntity(entidadeTipo: string, entidadeId: number, filters?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<MensagemHistorico>>> {
    const queryString = this.apiClient.buildQueryString(filters || {});
    return this.apiClient.get<PaginatedResponse<MensagemHistorico>>(`${this.baseEndpoint}/entidade/${entidadeTipo}/${entidadeId}${queryString}`);
  }
}

// Instâncias do serviço (tenant e SaaS)
const mensagemHistoricoServiceInstance = new MensagemHistoricoServiceClass();
const saasMensagemHistoricoServiceInstance = new MensagemHistoricoServiceClass('/saas/mensagens-historico');

/**
 * Retorna a instância correta conforme o contexto (SaaS ou tenant)
 */
export function getMensagemHistoricoService(isSaas: boolean) {
  return isSaas ? saasMensagemHistoricoServiceInstance : mensagemHistoricoServiceInstance;
}

/**
 * MensagemHistoricoService - API estática para compatibilidade
 */
export class MensagemHistoricoService {
  /**
   * Listar mensagens históricas com filtros e paginação
   */
  static async list(filters: MensagemHistoricoFilters = {}): Promise<PaginatedResponse<MensagemHistorico>> {
    return await mensagemHistoricoServiceInstance.list(filters);
  }

  /**
   * Buscar mensagem histórica por ID
   */
  static async getById(id: number): Promise<MensagemHistorico> {
    const response = await mensagemHistoricoServiceInstance.getById(id);
    return response.data!;
  }

  /**
   * Buscar mensagens por entidade
   */
  static async getByEntity(entidadeTipo: string, entidadeId: number, filters?: { page?: number; limit?: number }): Promise<PaginatedResponse<MensagemHistorico>> {
    const response = await mensagemHistoricoServiceInstance.getByEntity(entidadeTipo, entidadeId, filters);
    return response.data!;
  }
}