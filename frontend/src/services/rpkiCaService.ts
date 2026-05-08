import { defaultApiClient } from './core';

export interface RpkiCa {
  id: number;
  nome: string;
  handle: string;
  cliente_id: number | null;
  status: 'pending' | 'active' | 'error' | 'disabled';
  empresa_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface RpkiCaRepository {
  id: number;
  ca_id: number;
  empresa_id: number | null;
  repository_name: string;
  publication_service_uri: string | null;
  rsync_base_uri: string | null;
  rrdp_notify_uri: string | null;
  publication_status: 'pending' | 'active' | 'error';
  last_publish_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RpkiCaParent {
  id: number;
  ca_id: number;
  parent_name: string;
  service_uri: string;
  parent_handle: string | null;
  child_handle: string | null;
  provisioning_status: 'pending' | 'active' | 'error';
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RpkiCaResource {
  id: number;
  ca_id: number;
  resource_type: 'asn' | 'ipv4' | 'ipv6';
  start_range: string;
  end_range: string | null;
  max_length: number | null;
}

export interface RpkiRoa {
  id: number;
  ca_id: number | null;
  empresa_id: number | null;
  prefix: string;
  asn: string;
  max_length: number;
  not_before: string;
  not_after: string;
  status: 'active' | 'revoked' | 'expired';
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export class RpkiCaService {
  static async list(): Promise<RpkiCa[]> {
    const response = await defaultApiClient.get<RpkiCa[]>('/rpki/cas');
    return response.data ?? [];
  }

  static async create(payload: { nome: string; clienteId?: number | null }): Promise<RpkiCa> {
    const response = await defaultApiClient.post<RpkiCa>('/rpki/cas', payload);
    if (!response.data) {
      throw new Error(response.message || 'Resposta inválida ao criar CA');
    }
    return response.data;
  }

  static async delete(caId: number): Promise<void> {
    const response = await defaultApiClient.delete(`/rpki/cas/${caId}`);
    if (!response.success) {
      throw new Error(response.message || 'Falha ao remover CA');
    }
  }

  static async generateChildRequest(caId: number): Promise<{ xml: string; caId: number; handle: string }> {
    const response = await defaultApiClient.post<{ xml: string; caId: number; handle: string }>(
      `/rpki/cas/${caId}/child-request`,
      {}
    );
    if (!response.data) {
      throw new Error(response.message || 'Resposta inválida ao gerar requisição da CA-filha');
    }
    return response.data;
  }

  static async importParentResponse(payload: {
    caId: number;
    parentName: string;
    responseXml: string;
  }): Promise<void> {
    const response = await defaultApiClient.post(
      `/rpki/cas/${payload.caId}/parent-response`,
      {
        parentName: payload.parentName,
        responseXml: payload.responseXml,
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Falha ao importar resposta da CA-pai');
    }
  }

  static async listParents(caId: number): Promise<RpkiCaParent[]> {
    const response = await defaultApiClient.get<RpkiCaParent[]>(`/rpki/cas/${caId}/parents`);
    return response.data ?? [];
  }

  static async deleteParent(payload: { caId: number; parentId: number }): Promise<void> {
    const response = await defaultApiClient.delete(`/rpki/cas/${payload.caId}/parents/${payload.parentId}`);
    if (!response.success) {
      throw new Error(response.message || 'Falha ao remover CA-pai');
    }
  }

  static async listResources(caId: number): Promise<RpkiCaResource[]> {
    const response = await defaultApiClient.get<RpkiCaResource[]>(`/rpki/cas/${caId}/resources`);
    return response.data ?? [];
  }

  static async clearResources(caId: number): Promise<void> {
    const response = await defaultApiClient.delete(`/rpki/cas/${caId}/resources`);
    if (!response.success) {
      throw new Error(response.message || 'Falha ao remover recursos da CA');
    }
  }

  static async syncParentResources(payload: { caId: number; parentId: number }): Promise<void> {
    const response = await defaultApiClient.post(
      `/rpki/cas/${payload.caId}/parents/${payload.parentId}/sync`,
      {}
    );
    if (!response.success) {
      throw new Error(response.message || 'Falha ao sincronizar recursos da CA-pai');
    }
  }

  static async listRepositories(caId: number): Promise<RpkiCaRepository[]> {
    const response = await defaultApiClient.get<RpkiCaRepository[]>(`/rpki/cas/${caId}/repositories`);
    return response.data ?? [];
  }

  static async deleteRepository(payload: { caId: number; repositoryId: number }): Promise<void> {
    const response = await defaultApiClient.delete(
      `/rpki/cas/${payload.caId}/repositories/${payload.repositoryId}`
    );
    if (!response.success) {
      throw new Error(response.message || 'Falha ao remover repositório');
    }
  }

  static async syncRepository(payload: { caId: number; repositoryId: number }): Promise<void> {
    const response = await defaultApiClient.post(
      `/rpki/cas/${payload.caId}/repositories/${payload.repositoryId}/sync`,
      {}
    );
    if (!response.success) {
      throw new Error(response.message || 'Falha ao atualizar repositório');
    }
  }

  static async generatePublisherRequest(payload: {
    caId: number;
    parentId?: number;
    tag?: string;
  }): Promise<{ xml: string; tag: string; caId: number; handle: string; warning?: string }> {
    const body: {
      parentId?: number;
      tag?: string;
    } = {};
    if (payload.parentId != null && payload.parentId > 0) {
      body.parentId = payload.parentId;
    }
    if (payload.tag?.trim()) {
      body.tag = payload.tag.trim();
    }
    const response = await defaultApiClient.post<{
      xml: string;
      tag: string;
      caId: number;
      handle: string;
      warning?: string;
    }>(`/rpki/cas/${payload.caId}/publisher-request`, body);
    if (!response.data) {
      throw new Error(response.message || 'Resposta inválida ao gerar publisher_request');
    }
    return response.data;
  }

  static async importRepositoryResponse(payload: {
    caId: number;
    responseXml: string;
  }): Promise<RpkiCaRepository> {
    const response = await defaultApiClient.post<RpkiCaRepository>(
      `/rpki/cas/${payload.caId}/repository-response`,
      { responseXml: payload.responseXml }
    );
    if (!response.data) {
      throw new Error(response.message || 'Falha ao importar repository_response');
    }
    return response.data;
  }

  static async listRoas(caId: number): Promise<RpkiRoa[]> {
    const response = await defaultApiClient.get<RpkiRoa[]>(`/rpki/cas/${caId}/roas`);
    return response.data ?? [];
  }

  static async createRoa(payload: {
    caId: number;
    prefix: string;
    asn: string;
    max_length: number;
    not_before: string;
    not_after: string;
  }): Promise<RpkiRoa> {
    const response = await defaultApiClient.post<RpkiRoa>(`/rpki/cas/${payload.caId}/roas`, {
      prefix: payload.prefix,
      asn: payload.asn,
      max_length: payload.max_length,
      not_before: payload.not_before,
      not_after: payload.not_after,
    });
    if (!response.data) throw new Error(response.message || 'Falha ao criar ROA');
    return response.data;
  }

  static async updateRoa(payload: {
    caId: number;
    roaId: number;
    prefix: string;
    asn: string;
    max_length: number;
    not_before: string;
    not_after: string;
  }): Promise<RpkiRoa> {
    const response = await defaultApiClient.put<RpkiRoa>(
      `/rpki/cas/${payload.caId}/roas/${payload.roaId}`,
      {
        prefix: payload.prefix,
        asn: payload.asn,
        max_length: payload.max_length,
        not_before: payload.not_before,
        not_after: payload.not_after,
      }
    );
    if (!response.data) throw new Error(response.message || 'Falha ao atualizar ROA');
    return response.data;
  }

  static async revokeRoa(payload: { caId: number; roaId: number }): Promise<RpkiRoa> {
    const response = await defaultApiClient.post<RpkiRoa>(
      `/rpki/cas/${payload.caId}/roas/${payload.roaId}/revoke`,
      {}
    );
    if (!response.data) throw new Error(response.message || 'Falha ao revogar ROA');
    return response.data;
  }

  static async deleteRoa(payload: { caId: number; roaId: number }): Promise<void> {
    const response = await defaultApiClient.delete(`/rpki/cas/${payload.caId}/roas/${payload.roaId}`);
    if (!response.success) throw new Error(response.message || 'Falha ao remover ROA');
  }

  static async analyzeRoas(caId: number): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    inconsistent: number;
    rows: Array<{
      analysis_id: string;
      roa_id: number;
      prefix: string;
      asn: string;
      max_length: number;
      status: 'ok' | 'revoked' | 'expired' | 'inconsistent' | 'not_found';
      message: string;
      selectable: boolean;
    }>;
    details: Array<{ roa_id: number; prefix: string; asn: string; reason: string }>;
  }> {
    const response = await defaultApiClient.get<{
      total: number;
      active: number;
      revoked: number;
      expired: number;
      inconsistent: number;
      rows: Array<{
        analysis_id: string;
        roa_id: number;
        prefix: string;
        asn: string;
        max_length: number;
        status: 'ok' | 'revoked' | 'expired' | 'inconsistent' | 'not_found';
        message: string;
        selectable: boolean;
      }>;
      details: Array<{ roa_id: number; prefix: string; asn: string; reason: string }>;
    }>(`/rpki/cas/${caId}/roas/analyze`, { timeout: 600_000 });
    if (!response.data) throw new Error(response.message || 'Falha ao analisar ROAs');
    return response.data;
  }

  static async applyRoaSuggestions(payload: {
    caId: number;
    suggestions: Array<{ prefix: string; asn: string; max_length: number }>;
  }): Promise<{ created: number }> {
    const response = await defaultApiClient.post<{ created: number }>(
      `/rpki/cas/${payload.caId}/roas/analyze/apply`,
      { suggestions: payload.suggestions }
    );
    if (!response.data) throw new Error(response.message || 'Falha ao aplicar sugestões de ROA');
    return response.data;
  }
}

