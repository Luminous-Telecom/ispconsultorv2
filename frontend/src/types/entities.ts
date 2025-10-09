/**
 * Tipos e Interfaces das Entidades do Sistema
 * CTM Telecom ERP
 */

// ============================================
// Cliente
// ============================================
export interface Cliente {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  celular?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  data_cadastro: string;
  ativo: boolean;
  tipo_cobranca?: 'titulo' | 'boleto';
  valor_primeiro_titulo?: 'total' | 'proporcional';
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Plano
// ============================================
export interface Plano {
  id: number;
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
  status: 'ativo' | 'inativo' | 'cancelado';
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
}

// ============================================
// Título/Parcela
// ============================================
export interface Titulo {
  id: number;
  cliente_id: number;
  plano_id: number;
  banco_id: number;
  contrato_id?: number;
  numero_titulo: string;
  valor: number;
  valor_final?: number;
  valor_pago?: number;
  valor_aberto?: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'parcial' | 'pago_atraso';
  pago: boolean;
  desconto_percentual?: number;
  desconto_valor?: number;
  acrescimo_percentual?: number;
  acrescimo_valor?: number;
  descricao?: string;
  observacoes?: string;
  codigo_barras?: string;
  linha_digitavel?: string;
  qrcode?: string;
  qrcode_image?: string;
  nosso_numero?: string;
  charge_id?: string;
  url_boleto?: string;
  created_at: string;
  updated_at?: string;
  
  // Relacionamentos
  cliente?: Cliente;
  plano?: Plano;
  banco?: Banco;
}

// ============================================
// Contrato
// ============================================
export interface Contrato {
  id: number;
  cliente_id: number;
  plano_id: number;
  desconto_percentual?: string | number;
  desconto_valor?: string | number;
  valor_final?: number;
  data_inicio?: string;
  data_fim?: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string;
  isento_mensalidade: boolean;
  dia_vencimento?: number;
  conta_boleto?: number;
  data_validade_desconto?: string;
  created_at: string;
  updated_at?: string;
  
  // Relacionamentos
  cliente?: Cliente;
  plano?: Plano;
  bancoBoleto?: Banco;
}

// ============================================
// Banco
// ============================================
export interface Banco {
  id: number;
  nome: string;
  tipo_banco: 'asaas' | 'bradesco' | 'sicoob' | 'bb' | 'itau' | 'santander' | 'caixa' | 'outro';
  ativo: boolean;
  
  // Configurações específicas por tipo
  codigo_banco?: string;
  agencia?: string;
  conta?: string;
  digito_verificador?: string;
  carteira?: string;
  convenio?: string;
  
  // Asaas
  asaas_api_key?: string;
  asaas_wallet_id?: string;
  asaas_ambiente?: 'producao' | 'homologacao';
  
  // URLs
  url_base?: string;
  url_homologacao?: string;
  
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Dados da Empresa
// ============================================
export interface DadosEmpresa {
  id: number;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  telefone?: string;
  email?: string;
  site?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  logo?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// Types Auxiliares
// ============================================

export type StatusTitulo = Titulo['status'];
export type StatusContrato = Contrato['status'];
export type StatusPlano = Plano['status'];
export type TipoServico = Plano['tipo_servico'];
export type Periodicidade = NonNullable<Plano['periodicidade']>;
export type TipoBanco = Banco['tipo_banco'];

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface CreateTituloDTO {
  cliente_id: number;
  plano_id: number;
  contrato_id?: number;
  data_vencimento: string;
  observacoes?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  acrescimo_percentual?: number;
  acrescimo_valor?: number;
  descricao?: string;
}

export interface UpdateTituloDTO extends Partial<CreateTituloDTO> {
  valor?: number;
  status?: StatusTitulo;
  data_pagamento?: string;
  valor_pago?: number;
}

export interface CreateContratoDTO {
  cliente_id: number;
  plano_id: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  isento_mensalidade?: boolean;
  dia_vencimento?: number;
  conta_boleto?: number;
}

export interface UpdateContratoDTO extends Partial<CreateContratoDTO> {
  status?: StatusContrato;
}

// ============================================
// Table/DataTable Types
// ============================================

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  width?: string;
}

export interface BulkAction<T = any> {
  label: string;
  action?: (selectedItems: T[], event?: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: (selectedItems: T[]) => boolean;
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}

export interface Pagination {
  from: number;
  to: number;
  total: number;
  current_page: number;
  last_page: number;
  per_page?: number;
}

// ============================================
// Form Types
// ============================================

export interface TituloFormData {
  plano_id: number;
  contrato_id?: number;
  data_vencimento: string;
  observacoes: string;
  desconto_percentual: number;
  desconto_valor: number;
  acrescimo_percentual: number;
  acrescimo_valor: number;
  descricao: string;
}

export interface ContratoFormData {
  cliente_id: number;
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_inicio: string;
  data_fim: string;
  status: StatusContrato;
  observacoes: string;
  isento_mensalidade: boolean;
  dia_vencimento: number;
  conta_boleto: number;
}

export interface ClienteFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  whatsapp: string;
  celular: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  tipo_cobranca: 'titulo' | 'boleto';
  valor_primeiro_titulo: 'total' | 'proporcional';
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  observacoes: string;
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
  message: string;
  error?: string;
  details?: any;
  statusCode?: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

