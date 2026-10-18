import { apiService } from './api';
import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { resolveServiceErrorMessage, CONTEXT_ERROR_MESSAGES } from '../utils/apiErrorHelper';

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
  /** Usado para cache-bust da logo (mesmo path no disco). */
  updated_at?: string | Date | null;
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
  private static buildEmpresaPath(empresaId?: number | null, suffix = ''): string {
    const id = Number(empresaId);
    const basePath = Number.isFinite(id) && id > 0 ? `/dados-empresa/${id}` : '/dados-empresa';
    return `${basePath}${suffix}`;
  }

  private static getDefaultData(): DadosEmpresa {
    return {
      id: 0,
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
  static async get(empresaId?: number | null): Promise<DadosEmpresa> {
    try {
      const response = await apiService.get<DadosEmpresa>(DadosEmpresaService.buildEmpresaPath(empresaId));
      
      if (!response.success || !response.data) {
        throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.EMPRESA_LOAD_ERROR));
      }
      
      const data = response.data;

      // Garantir que sempre retornamos um objeto válido
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return DadosEmpresaService.getDefaultData();
      }
      
      return data;
    } catch (error) {
      // Retornar dados padrão em caso de erro
      return DadosEmpresaService.getDefaultData();
      }
    }

  static async update(data: UpdateDadosEmpresa & { id?: number }): Promise<DadosEmpresa> {
    const { id, ...payload } = data;
    const response = await apiService.put<DadosEmpresa>(DadosEmpresaService.buildEmpresaPath(id), payload);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.EMPRESA_DATA_UPDATE_ERROR));
  }

  static async uploadLogo(
    file: File,
    empresaId?: number | null
  ): Promise<{ success: boolean; logo: string; updated_at?: string | Date | null }> {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await apiService.post<{
      success: boolean;
      logo: string;
      updated_at?: string | Date | null;
    }>(
      DadosEmpresaService.buildEmpresaPath(empresaId, '/logo'),
      formData
    );
    
    // Se resposta já tem success: false, lançar erro
    if (response.success === false) {
      throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.EMPRESA_LOGO_ERROR));
    }
    
    // Tentar extrair logo de diferentes formatos de resposta
    let logo: string | undefined;
    let updated_at: string | Date | null | undefined;
    
    // Formato 1: response.data.logo (quando ResponseTransformer envolve)
    if (response.data && typeof response.data === 'object' && 'logo' in response.data) {
      const data = response.data as { logo?: string; updated_at?: string | Date | null };
      logo = data.logo;
      updated_at = data.updated_at;
    }
    
    // Formato 2: response.logo (resposta direta do backend)
    if (!logo && 'logo' in response) {
      logo = (response as { logo?: string }).logo;
      updated_at = (response as { updated_at?: string | Date | null }).updated_at;
    }
    
    // Formato 3: response.data é o objeto direto
    if (!logo && response.data && typeof response.data === 'object') {
      const data = response.data as { logo?: string; success?: boolean; updated_at?: string | Date | null };
      logo = data.logo;
      updated_at = data.updated_at;
    }
    
    if (logo) {
      return { success: true, logo, updated_at };
    }
    
    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.EMPRESA_LOGO_ERROR));
  }

  static async uploadAssinatura(file: File, empresaId?: number | null): Promise<{ success: boolean; responsavel_assinatura: string }> {
    const formData = new FormData();
    formData.append('assinatura', file);
    
    const response = await apiService.post<{ success: boolean; responsavel_assinatura: string }>(
      DadosEmpresaService.buildEmpresaPath(empresaId, '/assinatura'),
      formData
    );
    
    // Se resposta já tem success: false, lançar erro
    if (response.success === false) {
      throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.EMPRESA_SIGNATURE_ERROR));
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
    
    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.EMPRESA_SIGNATURE_ERROR));
  }
}
