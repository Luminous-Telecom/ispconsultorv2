/**
 * Serviço para saas_dados_empresa (tabela padrão de empresas cadastradas no SaaS)
 * API: /api/saas/saas-dados-empresa
 */

import { defaultApiClient } from '../core';
import type { ApiResponse } from 'types';

export interface SaasDadosEmpresaItem {
  id: number;
  nome_empresa: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  celular?: string | null;
  email: string;
  site?: string | null;
  responsavel_nome?: string | null;
  responsavel_cpf?: string | null;
  responsavel_cargo?: string | null;
  responsavel_assinatura?: string | null;
  logo?: string | null;
  plano_id?: number | null;
  status?: 'ativo' | 'inativo' | 'suspenso' | 'cancelado' | 'trial';
  limite_usuarios?: number;
  logo_url?: string | null;
  dominio_customizado?: string | null;
  observacoes?: string | null;
  plano?: { id: number; nome: string };
  created_at?: string;
  updated_at?: string;
}

export interface SaasDadosEmpresaListResponse {
  data: SaasDadosEmpresaItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

const buildParams = (f: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  return params.toString();
};

export const saasDadosEmpresaService = {
  list: (f: { page?: number; limit?: number; search?: string; sortColumn?: string; sortDirection?: 'asc' | 'desc' } = {}) =>
    defaultApiClient.get<SaasDadosEmpresaListResponse>(`/saas/saas-dados-empresa?${buildParams(f)}`),
  getById: (id: number): Promise<ApiResponse<SaasDadosEmpresaItem>> =>
    defaultApiClient.get<SaasDadosEmpresaItem>(`/saas/saas-dados-empresa/${id}`),
  create: (d: Partial<SaasDadosEmpresaItem>) => defaultApiClient.post('/saas/saas-dados-empresa', d),
  update: (id: number, d: Partial<SaasDadosEmpresaItem>) => defaultApiClient.put(`/saas/saas-dados-empresa/${id}`, d),
  delete: (id: number) => defaultApiClient.delete(`/saas/saas-dados-empresa/${id}`),
  uploadLogo: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return defaultApiClient.post<{ success: boolean; data?: { logo: string }; logo?: string }>(
      `/saas/saas-dados-empresa/${id}/logo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
  uploadAssinatura: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('assinatura', file);
    return defaultApiClient.post<{ success: boolean; data?: { responsavel_assinatura: string }; responsavel_assinatura?: string }>(
      `/saas/saas-dados-empresa/${id}/assinatura`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};
