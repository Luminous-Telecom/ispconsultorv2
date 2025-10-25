import { apiService } from './api';
import { Cliente, CreateCliente, UpdateCliente, ClienteFilters, PaginatedResponse, CepData } from '../types';

export class ClienteService {
  // Listar clientes com filtros e paginação
  static async list(filters: ClienteFilters = {}): Promise<PaginatedResponse<Cliente>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.ativo !== undefined) params.append('ativo', filters.ativo.toString());
    if (filters.tipo_cobranca) params.append('tipo_cobranca', filters.tipo_cobranca);
    if (filters.cidade) params.append('cidade', filters.cidade);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    try {
      const response = await apiService.get<{success: boolean, data: Cliente[], pagination: any}>(`/clientes?${params.toString()}`);
      return {
        success: true,
        data: response.success ? response.data : response as any,
        pagination: response.pagination
      } as PaginatedResponse<Cliente>;
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      throw error;
    }
  }

  // Buscar cliente por ID
  static async getById(id: number): Promise<Cliente> {
    try {
      const response = await apiService.get<{success: boolean, data: Cliente}>(`/clientes/${id}`);
      return response.success ? response.data : response as any;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw error;
    }
  }

  // Buscar cliente por CNPJ
  static async getByCnpj(cnpj: string): Promise<Cliente> {
    try {
      const response = await apiService.get<Cliente>(`/clientes/cnpj/${cnpj}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar cliente por CNPJ:', error);
      throw error;
    }
  }

  // Listar clientes ativos
  static async listAtivos(): Promise<Cliente[]> {
    try {
      const response = await apiService.get<{success: boolean, data: Cliente[]}>('/clientes/ativos');
      
      // Extrair dados do objeto de resposta
      const clientes = response.success ? response.data : response;
      
      return Array.isArray(clientes) ? clientes : [];
    } catch (error) {
      console.error('Erro ao buscar clientes ativos:', error);
      throw error;
    }
  }

  // Criar novo cliente
  static async create(data: CreateCliente): Promise<Cliente> {
    try {
      const response = await apiService.post<{ success: boolean; data: Cliente; message: string }>('/clientes', data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  }

  // Atualizar cliente
  static async update(id: number, data: UpdateCliente): Promise<Cliente> {
    try {
      const response = await apiService.put<Cliente>(`/clientes/${id}`, data);
      return response;
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      throw error;
    }
  }

  // Excluir cliente
  static async delete(id: number): Promise<void> {
    try {
      await apiService.delete(`/clientes/${id}`);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      throw error;
    }
  }

  // Buscar dados do CEP
  static async buscarCep(cep: string): Promise<CepData> {
    try {
      const response = await apiService.get<CepData>(`/api/buscar-cep/${cep}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      throw error;
    }
  }

  // Validar CNPJ
  static validarCnpj(cnpj: string): boolean {
    // Remove caracteres não numéricos
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cnpjLimpo.length !== 14) return false;
    
    // Verifica se não são todos os dígitos iguais
    if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;
    
    // Algoritmo de validação do CNPJ
    let tamanho = cnpjLimpo.length - 2;
    let numeros = cnpjLimpo.substring(0, tamanho);
    const digitos = cnpjLimpo.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;
    
    tamanho = tamanho + 1;
    numeros = cnpjLimpo.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    
    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    return resultado === parseInt(digitos.charAt(1));
  }

  // Formatar CNPJ
  static formatarCnpj(cnpj: string): string {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  // Formatar telefone
  static formatarTelefone(telefone: string): string {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    if (telefoneLimpo.length === 11) {
      return telefoneLimpo.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (telefoneLimpo.length === 10) {
      return telefoneLimpo.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    
    return telefone;
  }

  // Formatar CEP
  static formatarCep(cep: string): string {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  // Validar email
  static validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
}

export const clienteService = new ClienteService();
