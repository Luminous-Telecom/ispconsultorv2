import { apiService } from './api';

export type AssinaturaDigitalProviderType = 'assinafy' | 'zapsign';

export interface AssinaturaDigitalProvider {
  id: number;
  provider: AssinaturaDigitalProviderType;
  habilitado: boolean;
  api_key: string | null;
  account_id: string | null;
  configuracao_extra: Record<string, unknown> | null;
  dias_expiracao_padrao: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssinaturaDigitalProviderResponse {
  success: boolean;
  data: AssinaturaDigitalProvider;
}

export interface AssinaturaDigitalProviderListResponse {
  success: boolean;
  data: AssinaturaDigitalProvider[];
}

export interface UpdateAssinaturaDigitalProviderRequest {
  habilitado?: boolean;
  api_key?: string;
  account_id?: string;
  dias_expiracao_padrao?: number;
  configuracao_extra?: Record<string, unknown>;
}

export class AssinaturaDigitalProviderService {
  /**
   * Lista todos os providers
   */
  static async list(): Promise<AssinaturaDigitalProviderListResponse> {
    const response = await apiService.get<AssinaturaDigitalProvider[]>('/assinatura-digital-providers');
    return {
      success: response.success,
      data: response.data as AssinaturaDigitalProvider[]
    };
  }

  /**
   * Obtém um provider específico
   */
  static async getByProvider(provider: AssinaturaDigitalProviderType): Promise<AssinaturaDigitalProviderResponse> {
    const response = await apiService.get<AssinaturaDigitalProvider>(`/assinatura-digital-providers/${provider}`);
    return {
      success: response.success,
      data: response.data as AssinaturaDigitalProvider
    };
  }

  /**
   * Obtém o provider habilitado
   */
  static async getEnabled(): Promise<AssinaturaDigitalProviderResponse> {
    const response = await apiService.get<AssinaturaDigitalProvider>('/assinatura-digital-providers/habilitado');
    return {
      success: response.success,
      data: response.data as AssinaturaDigitalProvider
    };
  }

  /**
   * Cria ou atualiza um provider
   */
  static async upsert(
    provider: AssinaturaDigitalProviderType,
    data: UpdateAssinaturaDigitalProviderRequest
  ): Promise<AssinaturaDigitalProviderResponse> {
    const response = await apiService.put<AssinaturaDigitalProvider>(
      `/assinatura-digital-providers/${provider}`,
      data
    );
    return {
      success: response.success,
      data: response.data as AssinaturaDigitalProvider
    };
  }

  /**
   * Atualiza um provider
   */
  static async update(
    provider: AssinaturaDigitalProviderType,
    data: UpdateAssinaturaDigitalProviderRequest
  ): Promise<AssinaturaDigitalProviderResponse> {
    const response = await apiService.patch<AssinaturaDigitalProvider>(
      `/assinatura-digital-providers/${provider}`,
      data
    );
    return {
      success: response.success,
      data: response.data as AssinaturaDigitalProvider
    };
  }

  /**
   * Deleta um provider
   */
  static async delete(provider: AssinaturaDigitalProviderType): Promise<{ success: boolean }> {
    const response = await apiService.delete(`/assinatura-digital-providers/${provider}`);
    return {
      success: response.success
    };
  }
}

