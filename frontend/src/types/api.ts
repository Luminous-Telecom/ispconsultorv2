/**
 * Tipos de API - Respostas e Erros
 * BackNet ERP
 */

/**
 * Resposta padrão da API
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

/**
 * Resposta paginada da API
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

/**
 * Objeto de paginação standalone
 */
export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

/**
 * Erro da API
 */
export interface ApiError {
  message: string;
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
    status?: number;
    statusText?: string;
  };
}

/**
 * Tipo para filtros genéricos
 */
export interface BaseFilters {
  search?: string;
  searchField?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  [key: string]: string | number | boolean | null | undefined | 'asc' | 'desc' | undefined;
}

/**
 * Tipos específicos de filtros
 */
export interface ClienteFilters extends BaseFilters {
  ativo?: boolean;
  tipo_cobranca?: string;
  cidade?: string;
  estado?: string;
}

export interface PlanoFilters extends BaseFilters {
  status?: string;
  tipo_servico?: string;
  cliente_id?: number;
  valor_min?: number;
  valor_max?: number;
}

export interface BancoFilters extends BaseFilters {
  ativo?: boolean;
  tipo?: string;
  tipo_banco?: string;
  sandbox?: boolean;
}

export interface CarneFilters extends BaseFilters {
  status?: string;
  cliente_id?: number;
  plano_id?: number;
  banco_id?: number;
}

export interface FornecedorFilters extends BaseFilters {
  tipo_pessoa?: 'FISICA' | 'JURIDICA';
  cidade?: string;
  estado?: string;
}

export interface ContaPagarFilters extends BaseFilters {
  status?: 'A_PAGAR' | 'PAGO' | 'PARCIAL' | 'CANCELADO';
  tipo_pagamento?: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  fornecedor_id?: string;
  data_inicio?: string;
  data_fim?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  searchField?: string;
}

export interface CarneParcelaFilters extends BaseFilters {
  status?: string;
  carne_id?: number;
  cliente_id?: number;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
}
