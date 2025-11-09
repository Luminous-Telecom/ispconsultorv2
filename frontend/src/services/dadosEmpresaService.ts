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
    const response = await fetch(`${API_CONFIG.BASE_URL}/dados-empresa/logo`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('Falha no upload da logo');
    }
    return await response.json();
  }
}
