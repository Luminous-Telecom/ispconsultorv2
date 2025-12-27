// Tipos base para o sistema ERP Assessoria

// Tipo para valores JSON válidos
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Helper type para lidar com erros
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: JsonValue;
}

export interface BaseEntity {
  id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Cliente extends BaseEntity {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  ativo: boolean;
  valor_primeiro_titulo?: number;
  isento_mensalidade: boolean;
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  dia_vencimento?: number;
  conta_boleto?: number;
  data_validade_desconto?: Date;
  
  // Relacionamentos
  planos?: Plano[];
  contratos?: Contrato[];
  banco_boleto?: Banco;
}

export interface Plano extends BaseEntity {
  nome_plano: string;
  descricao?: string;
  tipo_servico?: string;
  servicos_inclusos?: string[];
  quantidade_usuarios?: number;
  valor_mensal: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  desconto_ativo: boolean;
  periodicidade?: string;
  renovacao_automatica: boolean;
  data_inicio?: Date;
  data_fim?: Date;
  status: 'ativo' | 'inativo';
  observacoes?: string;
  
  // Relacionamentos
  clientes?: Cliente[];
  contratos?: Contrato[];
}

export interface Banco extends BaseEntity {
  nome: string;
  codigo?: string;
  descricao?: string;
  ativo: boolean;
  tipo_banco: 'efi' | 'asaas' | 'bancario' | 'outros';
  api_url?: string;
  api_key?: string;
  api_secret?: string;
  sandbox: boolean;
  identificador_conta?: string;
  client_id_producao?: string;
  client_secret_producao?: string;
  url_retorno?: string;
  webhook_secret?: string;
  has_api_key?: boolean;
  has_api_secret?: boolean;
  has_client_secret_producao?: boolean;
  repassar_email_cliente: boolean;
  percentual_multa?: number;
  percentual_juros?: number;
  desconto_tipo?: string;
  desconto_valor?: number;
  contra_apresentacao: boolean;
  recalcular_segunda_via: boolean;
  maximo_dias_recalcular?: number;
  layout_web?: string;
  layout_pdf?: string;
  local_pagamento?: string;
  dados_avalista?: string;
  exibir_mes_referente: boolean;
  documento_cpf_cnpj?: string;
  taxa_cobranca?: number;
  incluir_taxa: boolean;
  observacao_linha_1?: string;
  observacao_linha_2?: string;
  observacao_linha_3?: string;
  observacao_linha_4?: string;
  instrucao_linha_1?: string;
  instrucao_linha_2?: string;
  instrucao_linha_3?: string;
  instrucao_linha_4?: string;
  instrucao_linha_5?: string;
  configuracoes_json?: Record<string, JsonValue>;
  logo?: string;
  
  // Relacionamentos
  clientes?: Cliente[];
}


export interface Contrato extends BaseEntity {
  cliente_id: number;
  plano_id: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_final?: number;
  data_inicio?: Date;
  data_fim?: Date;
  status: 'ativo' | 'inativo';
  observacoes?: string;
  
  // Relacionamentos
  cliente?: Cliente;
  plano?: Plano;
}

export interface DadosEmpresa extends BaseEntity {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
  responsavel_assinatura?: string;
  logo?: string;
  observacoes?: string;
}

// Tipos para requisições e respostas da API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

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

// Tipos para filtros e busca
export interface ClienteFilters {
  search?: string;
  ativo?: boolean;
  cidade?: string;
  estado?: string;
}

export interface PlanoFilters {
  search?: string;
  status?: string;
  tipo_servico?: string;
  valor_min?: number;
  valor_max?: number;
}

export interface BancoFilters {
  search?: string;
  ativo?: boolean;
  tipo_banco?: string;
  sandbox?: boolean;
}


// Tipos para criação e atualização
export type CreateCliente = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCliente = Partial<CreateCliente>;

export type CreatePlano = Omit<Plano, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePlano = Partial<CreatePlano>;

export type CreateBanco = Omit<Banco, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBanco = Partial<CreateBanco>;


// Tipos para dashboard
export interface DashboardStats {
  total_clientes: number;
  clientes_ativos: number;
  total_planos: number;
  planos_ativos: number;
  total_bancos: number;
  bancos_ativos: number;
  valor_total_pago: number;
  valor_total_pendente: number;
}

// Tipos para configurações de banco
export interface EfiConfig {
  client_id: string;
  client_secret: string;
  sandbox: boolean;
  certificado?: string;
  url_webhook?: string;
}

export interface AsaasConfig {
  access_token: string;
  webhook_token: string;
  sandbox: boolean;
  url_webhook?: string;
}

export interface BancoConfig {
  efi?: EfiConfig;
  asaas?: AsaasConfig;
}
