import { BaseService, BaseFilters, defaultApiClient, unwrapArrayResponse } from './core';

export type FormaRecebimentoVendedor = 'BOLETO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX' | 'OUTRAS' | '';
export type TipoContaVendedor = 'CORRENTE' | 'POUPANCA' | '';
export type TipoChavePixVendedor = 'CPF' | 'CELULAR' | 'EMAIL' | 'ALEATORIA' | '';
export type TipoPessoaTitular = 'FISICA' | 'JURIDICA' | '';

export const NOME_VENDEDOR_PADRAO = 'Vendedor padrão';

export interface Vendedor {
  id: number;
  empresa_id?: number | null;
  nome: string;
  comissao_percentual?: number | string | null;
  comissao_valor?: number | string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  celular?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  ativo: boolean;
  forma_recebimento?: FormaRecebimentoVendedor | null;
  tipo_conta?: TipoContaVendedor | null;
  banco_nome?: string | null;
  codigo_banco?: string | null;
  tipo_chave_pix?: TipoChavePixVendedor | null;
  chave_pix?: string | null;
  tipo_pessoa_titular?: TipoPessoaTitular | null;
  nome_titular?: string | null;
  cpf_cnpj_titular?: string | null;
  agencia?: string | null;
  digito_agencia?: string | null;
  conta?: string | null;
  digito_conta?: string | null;
  codigo_operacao?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type VendedorPayload = Omit<Vendedor, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>;

export interface VendedorFilters extends BaseFilters {
  searchField?: string;
  ativo?: string;
  sortColumn?: string;
  sortDirection?: string;
}

class VendedorServiceClass extends BaseService<Vendedor, VendedorPayload, Partial<VendedorPayload>, VendedorFilters> {
  constructor() {
    super(defaultApiClient, '/vendedores');
  }

  findAtivos() {
    return this.customGet<Vendedor[]>('/ativos');
  }
}

const vendedorServiceInstance = new VendedorServiceClass();

function unwrapVendedor(response: { data?: Vendedor } | Vendedor): Vendedor {
  if (response && typeof response === 'object' && 'data' in response && response.data) {
    return response.data;
  }
  return response as Vendedor;
}

export class VendedorService {
  static list = (filters?: VendedorFilters) => vendedorServiceInstance.list(filters);
  static async getById(id: number): Promise<Vendedor> {
    return unwrapVendedor(await vendedorServiceInstance.getById(id));
  }
  static async create(data: VendedorPayload): Promise<Vendedor> {
    return unwrapVendedor(await vendedorServiceInstance.create(data));
  }
  static async update(id: number, data: Partial<VendedorPayload>): Promise<Vendedor> {
    return unwrapVendedor(await vendedorServiceInstance.update(id, data));
  }
  static delete = (id: number) => vendedorServiceInstance.delete(id);
  static async findAtivos(): Promise<Vendedor[]> {
    const response = await vendedorServiceInstance.findAtivos();
    return unwrapArrayResponse<Vendedor>(response, { fallback: [], throwOnFailure: false });
  }
}
