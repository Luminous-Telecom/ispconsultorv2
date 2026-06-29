import { apiService } from './api';

export interface IntegracaoIxcProvedor {
  id: number;
  nome: string;
  api_url?: string | null;
  ativo: boolean;
  has_api_token?: boolean;
  clientes_vinculados?: string[];
  clientes_label?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IntegracaoIxcProvedorFilters {
  search?: string;
  searchField?: string;
  ativo?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
}

export interface PaginatedIntegracaoIxcProvedor {
  success: boolean;
  data: IntegracaoIxcProvedor[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export interface UpsertIntegracaoIxcProvedor {
  nome: string;
  api_url?: string | null;
  api_token?: string | null;
  ativo?: boolean;
}

export interface TestIntegracaoIxcProvedorResult {
  success: boolean;
  message: string;
}

export interface SyncOrdemServicoCadastrosResult {
  message: string;
  total: number;
  detalhes: Record<string, number>;
  ordens?: {
    total: number;
    sucesso: number;
    erro: number;
  };
}

export type IxcPermissionCellValue = 'liberado' | 'bloqueado' | null;

export interface IxcPermissionFormRow {
  id: string;
  grupo: string;
  formulario: string;
  dados: number | null;
  menu: IxcPermissionCellValue;
  listar: IxcPermissionCellValue;
}

export interface IxcApiPermissionsCheckResult {
  success: boolean;
  items: IxcPermissionFormRow[];
}

export interface IxcPermissionSampleItem {
  id: string;
  texto: string;
}

export interface IxcPermissionSampleResult {
  resourceId: string;
  resource: string;
  ok: boolean;
  total: number | null;
  items: IxcPermissionSampleItem[];
  message?: string;
}

export class IntegracaoIxcProvedorService {
  static async list(filters: IntegracaoIxcProvedorFilters = {}): Promise<PaginatedIntegracaoIxcProvedor> {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.searchField) params.append('searchField', filters.searchField);
    if (filters.ativo) params.append('ativo', filters.ativo);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.sortColumn) params.append('sortColumn', filters.sortColumn);
    if (filters.sortDirection) params.append('sortDirection', filters.sortDirection);
    const qs = params.toString();
    const response = await apiService.get<PaginatedIntegracaoIxcProvedor | { data: PaginatedIntegracaoIxcProvedor }>(
      `/integracao-ixc-provedor${qs ? `?${qs}` : ''}`
    );
    const raw = response as unknown as PaginatedIntegracaoIxcProvedor | { data: PaginatedIntegracaoIxcProvedor };
    if (raw && typeof raw === 'object' && 'data' in raw && !Array.isArray((raw as { data: unknown }).data)) {
      const inner = (raw as { data: PaginatedIntegracaoIxcProvedor }).data;
      return {
        success: inner?.success ?? true,
        data: Array.isArray(inner?.data) ? inner.data : [],
        pagination: inner?.pagination,
      };
    }
    const data = (raw as PaginatedIntegracaoIxcProvedor)?.data;
    return {
      success: (raw as PaginatedIntegracaoIxcProvedor)?.success ?? true,
      data: Array.isArray(data) ? data : [],
      pagination: (raw as PaginatedIntegracaoIxcProvedor)?.pagination,
    };
  }

  static async getById(id: number): Promise<IntegracaoIxcProvedor> {
    const response = await apiService.get<IntegracaoIxcProvedor>(`/integracao-ixc-provedor/${id}`);
    return (response as unknown as { data?: IntegracaoIxcProvedor }).data ?? (response as unknown as IntegracaoIxcProvedor);
  }

  static async findAtivos(): Promise<IntegracaoIxcProvedor[]> {
    const response = await apiService.get<IntegracaoIxcProvedor[] | { data?: IntegracaoIxcProvedor[] | { data?: IntegracaoIxcProvedor[] } }>(
      '/integracao-ixc-provedor/ativos'
    );
    const raw = response as unknown as { data?: IntegracaoIxcProvedor[] | { data?: IntegracaoIxcProvedor[] } };
    const inner = raw?.data;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === 'object' && Array.isArray(inner.data)) return inner.data;
    if (Array.isArray(response)) return response;
    return [];
  }

  static async create(data: UpsertIntegracaoIxcProvedor): Promise<IntegracaoIxcProvedor> {
    const response = await apiService.post<IntegracaoIxcProvedor>('/integracao-ixc-provedor', data);
    return (response as unknown as { data?: IntegracaoIxcProvedor }).data ?? (response as unknown as IntegracaoIxcProvedor);
  }

  static async update(id: number, data: UpsertIntegracaoIxcProvedor): Promise<IntegracaoIxcProvedor> {
    const response = await apiService.put<IntegracaoIxcProvedor>(`/integracao-ixc-provedor/${id}`, data);
    return (response as unknown as { data?: IntegracaoIxcProvedor }).data ?? (response as unknown as IntegracaoIxcProvedor);
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`/integracao-ixc-provedor/${id}`);
  }

  static async testConnection(
    id: number,
    data?: { api_url?: string; api_token?: string }
  ): Promise<TestIntegracaoIxcProvedorResult> {
    const response = await apiService.post<TestIntegracaoIxcProvedorResult>(
      `/integracao-ixc-provedor/${id}/test`,
      data ?? {}
    );
    const raw = response as unknown as { data?: TestIntegracaoIxcProvedorResult; message?: string; success?: boolean };
    if (raw?.data && typeof raw.data.success === 'boolean') return raw.data;
    if (typeof raw?.success === 'boolean') {
      return { success: raw.success, message: raw.message ?? '' };
    }
    return response as unknown as TestIntegracaoIxcProvedorResult;
  }

  static async testConnectionWithCredentials(data: {
    api_url: string;
    api_token: string;
  }): Promise<TestIntegracaoIxcProvedorResult> {
    const response = await apiService.post<TestIntegracaoIxcProvedorResult>(
      '/integracao-ixc-provedor/test',
      data
    );
    const raw = response as unknown as { data?: TestIntegracaoIxcProvedorResult; message?: string; success?: boolean };
    if (raw?.data && typeof raw.data.success === 'boolean') return raw.data;
    if (typeof raw?.success === 'boolean') {
      return { success: raw.success, message: raw.message ?? '' };
    }
    return response as unknown as TestIntegracaoIxcProvedorResult;
  }

  static async syncOrdemServicoCadastros(id: number): Promise<SyncOrdemServicoCadastrosResult> {
    const response = await apiService.post<{ data?: SyncOrdemServicoCadastrosResult; message?: string }>(
      `/integracao-ixc-provedor/${id}/sync-ordem-servico-cadastros`
    );
    const raw = response as unknown as { data?: SyncOrdemServicoCadastrosResult; message?: string };
    return raw?.data ?? { message: raw?.message ?? '', total: 0, detalhes: {} };
  }

  static async checkPermissions(id: number): Promise<IxcApiPermissionsCheckResult> {
    const response = await apiService.post<{ data?: IxcApiPermissionsCheckResult; message?: string }>(
      `/integracao-ixc-provedor/${id}/check-permissions`
    );
    const raw = response as unknown as { data?: IxcApiPermissionsCheckResult; message?: string };
    if (raw?.data) return raw.data;
    throw new Error(raw?.message ?? 'Erro ao verificar permissões IXC');
  }

  static async checkPermissionsDados(
    integracaoId: number,
    resourceId: string
  ): Promise<IxcPermissionSampleResult> {
    const response = await apiService.get<{ data?: IxcPermissionSampleResult }>(
      `/integracao-ixc-provedor/${integracaoId}/check-permissions/${encodeURIComponent(resourceId)}/dados`
    );
    const raw = response as unknown as { data?: IxcPermissionSampleResult };
    if (raw?.data) return raw.data;
    throw new Error('Erro ao listar dados do formulário IXC');
  }
}
