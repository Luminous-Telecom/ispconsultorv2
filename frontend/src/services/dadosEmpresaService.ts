import { apiService } from './api';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Cliente axios específico para rotas públicas (sem autenticação)
// Usar API_CONFIG.BASE_URL para funcionar em desenvolvimento e produção
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
  logo?: string;
}

export class DadosEmpresaService {
  // Buscar dados públicos da empresa (para site público)
  static async getPublic(): Promise<Partial<DadosEmpresa>> {
    try {
      const response = await publicApiClient.get<Partial<DadosEmpresa>>('/dados-empresa/public');
      return response.data || {};
    } catch (error) {
      // Retornar objeto vazio em caso de erro
      return {};
    }
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
        logo: undefined,
      };
    }
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
}
