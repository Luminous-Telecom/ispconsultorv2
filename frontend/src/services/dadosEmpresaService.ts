import { apiService } from './api';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Cliente axios específico para rotas públicas (sem autenticação)
const publicApiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface DadosEmpresa {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  celular: string;
  email: string;
  site: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_cargo: string;
  responsavel_assinatura?: string;
  logo?: string;
}

export interface UpdateDadosEmpresa {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  site?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
  responsavel_assinatura?: string;
  logo?: string;
}

export class DadosEmpresaService {
  // Buscar dados públicos da empresa (logo e nome — para login e central do assinante)
  static async getPublic(): Promise<Partial<DadosEmpresa>> {
    const response = await publicApiClient.get<{ success: boolean; data: Partial<DadosEmpresa> }>('/dados-empresa/public');
    return response.data.data || {};
  }

  // Buscar dados públicos da empresa pelo slug (multiloja — para central do assinante)
  static async getPublicBySlug(slug: string): Promise<Partial<DadosEmpresa>> {
    const response = await publicApiClient.get<{ success: boolean; data: Partial<DadosEmpresa> }>(`/dados-empresa/public/${slug}`);
    return response.data.data || {};
  }

  // Buscar dados completos da empresa (exclusivo do sistema - requer autenticação)
  static async get(): Promise<DadosEmpresa> {
    try {
      const response = await apiService.get<DadosEmpresa>('/dados-empresa');
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Erro ao buscar dados da empresa');
      }
      
      const data = response.data;

      // Garantir que sempre retornamos um objeto válido
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {
          id: 1,
          razao_social: '',
          nome_fantasia: '',
          cnpj: '',
          inscricao_estadual: '',
          inscricao_municipal: '',
          cep: '',
          endereco: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          telefone: '',
          celular: '',
          email: '',
          site: '',
          responsavel_nome: '',
          responsavel_cpf: '',
          responsavel_cargo: '',
          responsavel_assinatura: undefined,
          logo: undefined,
        };
      }
      
      return data;
    } catch (error) {
      // Retornar dados padrão em caso de erro
      return {
        id: 1,
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        telefone: '',
        celular: '',
        email: '',
        site: '',
          responsavel_nome: '',
          responsavel_cpf: '',
          responsavel_cargo: '',
          responsavel_assinatura: undefined,
          logo: undefined,
        };
      }
    }

  /** Gera PDF de boletos de saas_titulos (admin auth). Requer empresaId para validação. */
  static async getTitulosSaasBoletosPdf(ids: number[], empresaId: number): Promise<Blob> {
    const idsParam = ids.join(',');
    const axios = (await import('axios')).default;
    const { API_CONFIG } = await import('../config/api');
    const baseUrl = API_CONFIG.BASE_URL || '/api';
    const response = await axios.get(`${baseUrl}/dados-empresa/titulos-saas/boletos-pdf?ids=${idsParam}&empresa_id=${empresaId}`, {
      responseType: 'blob',
      timeout: 120000,
      withCredentials: true,
    });
    const blob = response.data;
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('Resposta inválida do servidor');
    }
    return blob;
  }

  /** Lista saas_titulos da empresa. tipo: 'abertas' (pendente,vencido) ou 'pagas' (pago,pago_atraso,parcial) */
  static async getTitulosSaas(empresaId: number, tipo: 'abertas' | 'pagas' = 'abertas'): Promise<{ data: unknown[]; pagination?: unknown }> {
    const response = await apiService.get<{ data: unknown[]; pagination?: unknown } | unknown>(
      `/dados-empresa/titulos-saas?empresa_id=${empresaId}&tipo=${tipo}`
    );
    const res = response as { success?: boolean; data?: { data?: unknown[]; pagination?: unknown } | unknown[] };
    if (res.success === false) {
      throw new Error((res as { message?: string }).message || 'Erro ao buscar títulos');
    }
    const inner = res.data;
    if (Array.isArray(inner)) return { data: inner, pagination: undefined };
    if (inner && typeof inner === 'object' && 'data' in inner) {
      return { data: (inner as { data?: unknown[] }).data ?? [], pagination: (inner as { pagination?: unknown }).pagination };
    }
    return { data: [], pagination: undefined };
  }

  static async update(data: UpdateDadosEmpresa): Promise<DadosEmpresa> {
    const response = await apiService.put<DadosEmpresa>('/dados-empresa', data);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Erro ao atualizar dados da empresa');
  }

  static async uploadLogo(file: File): Promise<{ success: boolean; logo: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await apiService.post<{ success: boolean; logo: string }>(
      '/dados-empresa/logo',
      formData
    );
    
    // Se resposta já tem success: false, lançar erro
    if (response.success === false) {
      throw new Error(response.message || 'Falha no upload da logo');
    }
    
    // Tentar extrair logo de diferentes formatos de resposta
    let logo: string | undefined;
    
    // Formato 1: response.data.logo (quando ResponseTransformer envolve)
    if (response.data && typeof response.data === 'object' && 'logo' in response.data) {
      logo = (response.data as { logo?: string }).logo;
    }
    
    // Formato 2: response.logo (resposta direta do backend)
    if (!logo && 'logo' in response) {
      logo = (response as { logo?: string }).logo;
    }
    
    // Formato 3: response.data é o objeto direto
    if (!logo && response.data && typeof response.data === 'object') {
      const data = response.data as { logo?: string; success?: boolean };
      logo = data.logo;
    }
    
    if (logo) {
      return { success: true, logo };
    }
    
    throw new Error(response.message || 'Falha no upload da logo');
  }

  static async uploadAssinatura(file: File): Promise<{ success: boolean; responsavel_assinatura: string }> {
    const formData = new FormData();
    formData.append('assinatura', file);
    
    const response = await apiService.post<{ success: boolean; responsavel_assinatura: string }>(
      '/dados-empresa/assinatura',
      formData
    );
    
    // Se resposta já tem success: false, lançar erro
    if (response.success === false) {
      throw new Error(response.message || 'Falha no upload da assinatura');
    }
    
    // Tentar extrair assinatura de diferentes formatos de resposta
    let assinatura: string | undefined;
    
    // Formato 1: response.data.responsavel_assinatura (quando ResponseTransformer envolve)
    if (response.data && typeof response.data === 'object') {
      const data = response.data as Record<string, unknown>;
      
      // Se data tem responsavel_assinatura diretamente
      if ('responsavel_assinatura' in data && typeof data.responsavel_assinatura === 'string') {
        assinatura = data.responsavel_assinatura;
      }
      // Se data tem um objeto aninhado com responsavel_assinatura
      else if (data.data && typeof data.data === 'object' && data.data !== null) {
        const nestedData = data.data as Record<string, unknown>;
        if ('responsavel_assinatura' in nestedData && typeof nestedData.responsavel_assinatura === 'string') {
          assinatura = nestedData.responsavel_assinatura;
        }
      }
    }
    
    // Formato 2: response.responsavel_assinatura (resposta direta do backend)
    if (!assinatura && 'responsavel_assinatura' in response) {
      const responseData = response as unknown as { responsavel_assinatura?: string };
      if (typeof responseData.responsavel_assinatura === 'string') {
        assinatura = responseData.responsavel_assinatura;
      }
    }
    
    if (assinatura) {
      return { success: true, responsavel_assinatura: assinatura };
    }
    
    throw new Error(response.message || 'Falha no upload da assinatura');
  }
}
