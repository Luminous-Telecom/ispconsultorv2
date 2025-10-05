// Tipos para o sistema ERP Assessoria - Frontend

export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
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
  tipo_cobranca?: 'titulo' | 'carne';
  valor_primeiro_titulo?: 'total' | 'proporcional';
  isento_mensalidade: boolean;
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  dia_vencimento?: number;
  conta_boleto?: number;
  data_validade_desconto?: string;
  
  // Relacionamentos
  planos?: Plano[];
  contratos?: Contrato[];
  carnes?: Carne[];
  banco_boleto?: Banco;
}

export interface Plano extends BaseEntity {
  nome_plano: string;
  descricao?: string;
  tipo_servico: 'internet' | 'telefonia' | 'tv' | 'suporte' | 'infraestrutura' | 'consultoria' | 'outros';
  servicos_inclusos?: string[];
  quantidade_usuarios?: number;
  valor_mensal: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  desconto_ativo: boolean;
  periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  renovacao_automatica: boolean;
  data_inicio?: string;
  data_fim?: string;
  status: 'ativo' | 'suspenso' | 'cancelado';
  observacoes?: string;
  
  // Relacionamentos
  clientes?: Cliente[];
  contratos?: Contrato[];
  carnes?: Carne[];
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
  layout_carne?: string;
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
  configuracoes_json?: Record<string, any>;
  
  // Relacionamentos
  clientes?: Cliente[];
  carnes?: Carne[];
  configuracoes?: BancoConfiguracao[];
  configuracao_principal?: BancoConfiguracao;
}

export interface BancoConfiguracao extends BaseEntity {
  banco_id: number;
  tipo_banco: string;
  configuracao: Record<string, any>;
  ativo: boolean;
  observacoes?: string;
  
  // Relacionamentos
  banco?: Banco;
}

export interface Carne extends BaseEntity {
  cliente_id: number;
  plano_id: number;
  banco_id: number;
  numero_carne: string;
  carnet_id?: string;
  valor_total: number;
  quantidade_parcelas: number;
  data_vencimento_primeira: string;
  status: 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
  observacoes?: string;
  codigo_barras?: string;
  linha_digitavel?: string;
  
  // Campos calculados
  valor_parcela?: number;
  parcelas_pagas_count?: number;
  valor_total_carne?: number;
  
  // Relacionamentos
  cliente?: Cliente;
  plano?: Plano;
  banco?: Banco;
  parcelas?: CarneParcela[];
}

export interface CarneParcela extends BaseEntity {
  carne_id: number;
  plano_id: number;
  numero_parcela: number;
  valor_parcela: number;
  tipo?: string;
  data_vencimento: string;
  pago: boolean;
  data_pagamento?: string;
  valor_pago?: number;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  codigo_barras?: string;
  linha_digitavel?: string;
  qrcode?: string;
  qrcode_image?: string;
  observacoes?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  acrescimo_percentual?: number;
  acrescimo_valor?: number;
  valor_final?: number;
  descricao?: string;
  charge_id?: string;
  url_boleto?: string;
  nosso_numero?: string;
  
  // Relacionamentos
  carne?: Carne;
  plano?: Plano;
}

export interface Contrato extends BaseEntity {
  cliente_id: number;
  plano_id: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_final?: number;
  data_inicio?: string;
  data_fim?: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string;
  isento_mensalidade?: boolean;
  dia_vencimento?: number;
  conta_boleto?: number;
  data_validade_desconto?: string;
  
  // Relacionamentos
  cliente?: Cliente;
  plano?: Plano;
}

// Tipos para requisições e respostas da API
export interface ApiResponse<T = any> {
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
  tipo_cobranca?: string;
  cidade?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface PlanoFilters {
  search?: string;
  status?: string;
  tipo_servico?: string;
  cliente_id?: number;
  valor_min?: number;
  valor_max?: number;
  page?: number;
  limit?: number;
}

export interface BancoFilters {
  search?: string;
  ativo?: boolean;
  tipo?: string;
  tipo_banco?: string;
  sandbox?: boolean;
  page?: number;
  limit?: number;
}

export interface CarneFilters {
  search?: string;
  status?: string;
  cliente_id?: number;
  plano_id?: number;
  banco_id?: number;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  page?: number;
  limit?: number;
}

export interface CarneParcelaFilters {
  search?: string;
  status?: string;
  carne_id?: number;
  cliente_id?: number;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  page?: number;
  limit?: number;
}

// Tipos para criação e atualização
export type CreateCliente = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCliente = Partial<CreateCliente>;

export type CreatePlano = Omit<Plano, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePlano = Partial<CreatePlano>;

export type CreateBanco = Omit<Banco, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBanco = Partial<CreateBanco>;

export type CreateCarne = Omit<Carne, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCarne = Partial<CreateCarne>;

export type CreateCarneParcela = Omit<CarneParcela, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCarneParcela = Partial<CreateCarneParcela>;

// Tipos para dashboard
export interface DashboardStats {
  total_clientes: number;
  clientes_ativos: number;
  total_planos: number;
  planos_ativos: number;
  total_bancos: number;
  bancos_ativos: number;
  total_carnes: number;
  carnes_ativos: number;
  carnes_pagos: number;
  carnes_pendentes: number;
  valor_total_carnes: number;
  valor_total_pago: number;
  valor_total_pendente: number;
}

// Tipos para dados de CEP
export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

// Tipos para gráficos
export interface GraficoData {
  label: string;
  value: number;
}

export interface GraficoCarnesPorStatus {
  status: string;
  total: number;
}

export interface GraficoClientesPorCidade {
  cidade: string;
  total: number;
}

// Tipos para resumo mensal
export interface ResumoMensal {
  mes: number;
  ano: number;
  carnes_criados: number;
  parcelas_pagas: number;
  valor_total_pago: number;
  clientes_novos: number;
}
