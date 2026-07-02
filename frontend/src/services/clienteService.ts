/**
 * ClienteService - Serviço refatorado usando BaseService
 * Mantém compatibilidade com código existente através de métodos estáticos
 */
import { BaseService, defaultApiClient, unwrapArrayResponse } from './core';
import { Cliente, CreateCliente, UpdateCliente, ClienteFilters, PaginatedResponse, CepData, ApiResponse } from '../types';
import { formatCNPJ, formatCEP, formatPhone } from '../utils/formatters';
import { isValidCNPJ, isValidEmail } from '../utils/validators';

/**
 * Classe de serviço para operações relacionadas a Clientes
 * Usa BaseService para operações CRUD padrão
 */
class ClienteServiceClass extends BaseService<Cliente, CreateCliente, UpdateCliente, ClienteFilters> {
  constructor() {
    super(defaultApiClient, '/clientes');
  }

  /**
   * Buscar cliente por CNPJ
   */
  async getByCnpj(cnpj: string): Promise<ApiResponse<Cliente>> {
    return this.customGet<Cliente>(`/cnpj/${cnpj}`);
  }

  /**
   * Listar clientes ativos
   */
  async getAtivos(): Promise<ApiResponse<Cliente[]>> {
    return this.customGet<Cliente[]>(`/ativos`);
  }

  /**
   * Buscar dados do CEP
   */
  async buscarCep(cep: string): Promise<ApiResponse<CepData>> {
    return this.customGet<CepData>(`/buscar-cep/${cep}`);
  }
}

// Instância única do serviço
const clienteServiceInstance = new ClienteServiceClass();

/**
 * ClienteService - API estática para compatibilidade com código existente
 * Todos os métodos delegam para a instância do serviço
 */
export class ClienteService {
  /**
   * Listar clientes com filtros e paginação
   */
  static async list(filters: ClienteFilters = {}): Promise<PaginatedResponse<Cliente>> {
    return clienteServiceInstance.list(filters);
  }

  /**
   * Buscar cliente por ID
   */
  static async getById(id: number): Promise<Cliente> {
    const response = await clienteServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    // Fallback: se não tiver data, tentar usar response diretamente
    return response as unknown as Cliente;
  }

  /**
   * Buscar cliente por CNPJ
   */
  static async getByCnpj(cnpj: string): Promise<Cliente> {
    const response = await clienteServiceInstance.getByCnpj(cnpj);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Cliente;
  }

  /**
   * Listar clientes ativos
   */
  static async listAtivos(): Promise<Cliente[]> {
    const response = await clienteServiceInstance.getAtivos();
    return unwrapArrayResponse<Cliente>(response, { fallback: [], throwOnFailure: false });
  }

  /**
   * Criar novo cliente
   */
  static async create(data: CreateCliente): Promise<Cliente> {
    const response = await clienteServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Cliente;
  }

  /**
   * Atualizar cliente
   */
  static async update(id: number, data: UpdateCliente): Promise<Cliente> {
    const response = await clienteServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Cliente;
  }

  /**
   * Excluir cliente
   */
  static async delete(id: number): Promise<void> {
    await clienteServiceInstance.delete(id);
  }

  /**
   * Buscar dados do CEP
   */
  static async buscarCep(cep: string): Promise<CepData> {
    const response = await clienteServiceInstance.buscarCep(cep);
    if (response.data) {
      return response.data;
    }
    return response as unknown as CepData;
  }

  /**
   * Consultar dados do CNPJ na ReceitaWS
   */
  static async consultarCnpj(cnpj: string): Promise<ApiResponse<{
    razao_social: string;
    nome_fantasia: string;
    cep: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    telefone: string;
    email: string;
    situacao?: string;
    abertura?: string;
    natureza_juridica?: string;
    capital_social?: string;
  }>> {
    return defaultApiClient.get(`/clientes/consultar-cnpj/${cnpj}`);
  }

  // ============================================
  // Métodos utilitários de validação
  // ============================================

  /**
   * Validar CNPJ (usa validador centralizado)
   */
  static validarCnpj(cnpj: string): boolean {
    return isValidCNPJ(cnpj);
  }

  /**
   * Formatar CNPJ (usa formatador centralizado)
   */
  static formatarCnpj(cnpj: string): string {
    return formatCNPJ(cnpj);
  }

  /**
   * Formatar telefone (usa formatador centralizado)
   */
  static formatarTelefone(telefone: string): string {
    return formatPhone(telefone);
  }

  /**
   * Formatar CEP (usa formatador centralizado)
   */
  static formatarCep(cep: string): string {
    return formatCEP(cep);
  }

  /**
   * Validar email (usa validador centralizado)
   */
  static validarEmail(email: string): boolean {
    return isValidEmail(email);
  }
}

/**
 * Exportar também a instância do serviço para uso direto (opcional)
 * Isso permite usar clienteService.list() ao invés de ClienteService.list()
 */
export const clienteService = clienteServiceInstance;
