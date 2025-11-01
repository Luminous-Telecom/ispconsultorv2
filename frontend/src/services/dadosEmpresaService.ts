import { apiService } from './api';
import { API_CONFIG } from '../config/api';

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
  static async get(): Promise<DadosEmpresa> {
    try {
      const response = await apiService.get<DadosEmpresa>('/dados-empresa');
      
      // Garantir que sempre retornamos um objeto válido
      if (!response || typeof response !== 'object' || response === null || Array.isArray(response)) {
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
      
      return response;
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
    return apiService.put<DadosEmpresa>('/dados-empresa', data);
  }

  static async uploadLogo(file: File): Promise<{ success: boolean; logo: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await fetch(`${API_CONFIG.BASE_URL_WITHOUT_API}/dados-empresa/logo`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('Falha no upload da logo');
    }
    return await response.json();
  }
}
