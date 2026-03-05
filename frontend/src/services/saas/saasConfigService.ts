import { defaultApiClient } from '../core';
import type { ApiResponse } from '../../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SaasServidorEmail {
  id: number;
  empresa_id: number;
  empresa?: { id: number; razao_social: string; nome_fantasia?: string };
  nome: string;
  host_smtp: string;
  porta: number;
  usuario: string;
  senha_criptografada: string;
  ssl: boolean;
  status: 'ativo' | 'inativo' | 'erro';
  created_at: string;
  updated_at: string;
}

export interface SaasServidorWhatsapp {
  id: number;
  empresa_id: number;
  empresa?: { id: number; razao_social: string; nome_fantasia?: string };
  nome: string;
  url_api: string;
  token?: string | null;
  numero?: string | null;
  status: 'ativo' | 'inativo' | 'erro';
  limite_mensagens?: number | null;
  created_at: string;
  updated_at: string;
}

export interface SaasBanco {
  id: number;
  empresa_id: number;
  empresa?: { id: number; nome_empresa: string };
  nome?: string;
  banco: string;
  codigo?: string | null;
  descricao?: string | null;
  tipo_banco?: 'efi' | 'asaas' | 'bancario' | 'outros';
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: 'corrente' | 'poupanca' | 'pagamento';
  pix_chave?: string | null;
  pix_tipo?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null;
  ativo: boolean;
  sandbox?: boolean;
  api_url?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
  webhook_secret?: string | null;
  identificador_conta?: string | null;
  client_id_producao?: string | null;
  client_secret_producao?: string | null;
  url_retorno?: string | null;
  repassar_email_cliente?: boolean;
  percentual_multa?: number | null;
  percentual_juros?: number | null;
  desconto_tipo?: string | null;
  desconto_valor?: number | null;
  contra_apresentacao?: boolean;
  recalcular_segunda_via?: boolean;
  maximo_dias_recalcular?: number | null;
  layout_web?: string | null;
  layout_pdf?: string | null;
  local_pagamento?: string | null;
  dados_avalista?: string | null;
  exibir_mes_referente?: boolean;
  taxa_cobranca?: number | null;
  incluir_taxa?: boolean;
  observacao_linha_1?: string | null;
  observacao_linha_2?: string | null;
  observacao_linha_3?: string | null;
  observacao_linha_4?: string | null;
  instrucao_linha_1?: string | null;
  instrucao_linha_2?: string | null;
  instrucao_linha_3?: string | null;
  instrucao_linha_4?: string | null;
  instrucao_linha_5?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaasConfigListResponse<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface SaasConfigFilters {
  page?: number;
  limit?: number;
  search?: string;
  empresa_id?: number;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

const buildParams = (filters: SaasConfigFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  return params.toString();
};

// ─── Servidores Email ─────────────────────────────────────────────────────────

export const saasServidorEmailService = {
  list: (f: SaasConfigFilters = {}) =>
    defaultApiClient.get<SaasConfigListResponse<SaasServidorEmail>>(`/saas/config/servidores-email?${buildParams(f)}`),
  getById: (id: number): Promise<ApiResponse<SaasServidorEmail>> =>
    defaultApiClient.get(`/saas/config/servidores-email/${id}`),
  create: (data: Partial<SaasServidorEmail>): Promise<ApiResponse<SaasServidorEmail>> =>
    defaultApiClient.post('/saas/config/servidores-email', data),
  update: (id: number, data: Partial<SaasServidorEmail>): Promise<ApiResponse<null>> =>
    defaultApiClient.put(`/saas/config/servidores-email/${id}`, data),
  delete: (id: number): Promise<ApiResponse<null>> =>
    defaultApiClient.delete(`/saas/config/servidores-email/${id}`),
};

// ─── Servidores WhatsApp ──────────────────────────────────────────────────────

export const saasServidorWhatsappService = {
  list: (f: SaasConfigFilters = {}) =>
    defaultApiClient.get<SaasConfigListResponse<SaasServidorWhatsapp>>(`/saas/config/servidores-whatsapp?${buildParams(f)}`),
  getById: (id: number): Promise<ApiResponse<SaasServidorWhatsapp>> =>
    defaultApiClient.get(`/saas/config/servidores-whatsapp/${id}`),
  create: (data: Partial<SaasServidorWhatsapp>): Promise<ApiResponse<SaasServidorWhatsapp>> =>
    defaultApiClient.post('/saas/config/servidores-whatsapp', data),
  update: (id: number, data: Partial<SaasServidorWhatsapp>): Promise<ApiResponse<null>> =>
    defaultApiClient.put(`/saas/config/servidores-whatsapp/${id}`, data),
  delete: (id: number): Promise<ApiResponse<null>> =>
    defaultApiClient.delete(`/saas/config/servidores-whatsapp/${id}`),
};

// ─── Bancos ───────────────────────────────────────────────────────────────────

export const saasBancoService = {
  list: (f: SaasConfigFilters = {}) =>
    defaultApiClient.get<SaasConfigListResponse<SaasBanco>>(`/saas/config/bancos?${buildParams(f)}`),
  getById: (id: number): Promise<ApiResponse<SaasBanco>> =>
    defaultApiClient.get(`/saas/config/bancos/${id}`),
  create: (data: Partial<SaasBanco>): Promise<ApiResponse<SaasBanco>> =>
    defaultApiClient.post('/saas/config/bancos', data),
  update: (id: number, data: Partial<SaasBanco>): Promise<ApiResponse<null>> =>
    defaultApiClient.put(`/saas/config/bancos/${id}`, data),
  delete: (id: number): Promise<ApiResponse<null>> =>
    defaultApiClient.delete(`/saas/config/bancos/${id}`),
  testarConexao: (id: number): Promise<ApiResponse<{ success?: boolean; message?: string }>> =>
    defaultApiClient.post(`/saas/config/bancos/${id}/testar-conexao`),
  gerarWebhookSecret: (id: number): Promise<ApiResponse<{ webhook_secret: string }>> =>
    defaultApiClient.post(`/saas/config/bancos/${id}/gerar-webhook-secret`),
};
