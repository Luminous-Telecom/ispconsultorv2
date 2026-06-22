import { defaultApiClient } from './core';
import { ApiResponse, PaginatedResponse } from '../types';

export interface AuditoriaLog {
  id: string;
  operacional_id?: string;
  usuario_id: number | null;
  usuario_nome: string | null;
  usuario_email: string | null;
  empresa_id: number | null;
  empresa_nome: string | null;
  cliente_nome?: string | null;
  acao: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'executar';
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
  payload?: Record<string, unknown> | string | null;
}

export interface AuditoriaFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  acao?: string;
  entidade?: string;
  usuario_id?: number;
  empresa_id?: number;
  data_inicio?: string;
  data_fim?: string;
  sortColumn?: string;
  sortDirection?: string;
  comUsuarioObrigatorio?: boolean;
  semUsuarioObrigatorio?: boolean;
  origemAuditoria?: string;
  moduloBlockdomi?: boolean;
  painelSaas?: boolean;
  acessoPainelSaas?: boolean;
}

const ENTIDADES_SAAS = [
  'SaasPlano', 'SaasContrato', 'SaasDadosEmpresa', 'SaasDadosEmpresaCrud', 'SaasBanco',
  'SaasTitulo', 'SaasTipoCobranca', 'SaasDiasVencimento', 'SaasNFSeConfig', 'SaasParametros',
  'SaasServidorEmail', 'SaasServidorWhatsapp', 'SaasUsuarioSuper', 'SaasScheduledRoutine',
];

class AuditoriaService {
  private appendOperacionalListParams(params: URLSearchParams, filters: AuditoriaFilters): void {
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.searchField) params.append('searchField', filters.searchField);
    if (filters.acao) params.append('acao', filters.acao);
    if (filters.entidade) params.append('entidade', filters.entidade);
    if (filters.usuario_id) params.append('usuario_id', filters.usuario_id.toString());
    if (filters.empresa_id) params.append('empresa_id', filters.empresa_id.toString());
    if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters.data_fim) params.append('data_fim', filters.data_fim);
    if (filters.sortColumn) params.append('sortColumn', filters.sortColumn);
    if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);
    if (filters.comUsuarioObrigatorio) params.append('com_usuario_obrigatorio', 'true');
    if (filters.semUsuarioObrigatorio) params.append('sem_usuario_obrigatorio', 'true');
    if (filters.origemAuditoria) params.append('origem_auditoria', filters.origemAuditoria);
    if (filters.moduloBlockdomi) params.append('modulo_blockdomi', 'true');
    if (filters.painelSaas) params.append('painel_saas', 'true');
    if (filters.acessoPainelSaas) params.append('acesso_painel_saas', 'true');
  }

  async listOperacional(filters: AuditoriaFilters = {}): Promise<ApiResponse<PaginatedResponse<AuditoriaLog>>> {
    const params = new URLSearchParams();
    this.appendOperacionalListParams(params, filters);
    return defaultApiClient.get<PaginatedResponse<AuditoriaLog>>(`/auditoria/operacional-list?${params}`);
  }

  async listOperacionalSaas(filters: AuditoriaFilters = {}): Promise<ApiResponse<PaginatedResponse<AuditoriaLog>>> {
    const params = new URLSearchParams();
    this.appendOperacionalListParams(params, filters);
    return defaultApiClient.get<PaginatedResponse<AuditoriaLog>>(`/saas/auditoria/operacional-list?${params}`);
  }

  async listOperacionalByTenant(
    filters: AuditoriaFilters & { empresa_id: number }
  ): Promise<ApiResponse<PaginatedResponse<AuditoriaLog>>> {
    const params = new URLSearchParams();
    this.appendOperacionalListParams(params, filters);
    return defaultApiClient.get<PaginatedResponse<AuditoriaLog>>(`/saas/auditoria/operacional-list?${params}`);
  }

  async generatePdf(entidade: string, entidadeId: number | string): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('entidade', entidade);
    params.append('entidade_id', String(entidadeId));
    const baseUrl = ENTIDADES_SAAS.includes(entidade) ? '/saas/auditoria' : '/auditoria';
    const url = `${baseUrl}/pdf?${params.toString()}`;

    interface ApiClientWithApi {
      api: import('axios').AxiosInstance;
    }
    const apiInstance = (defaultApiClient as unknown as ApiClientWithApi).api;

    const response = await apiInstance.get<Blob>(url, {
      responseType: 'blob',
      timeout: 60000,
    });

    const blob = response as unknown as Blob;
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('Resposta do servidor não é um Blob válido');
    }
    return blob;
  }
}

export const auditoriaService = new AuditoriaService();
