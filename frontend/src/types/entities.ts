/**
 * Tipos e Interfaces das Entidades do Sistema
 * BackNet
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
  tipo_cobranca?: 'titulo' | 'boleto' | 'carne';
  valor_primeiro_titulo?: 'total' | 'proporcional';
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  observacoes?: string;
  isento_mensalidade?: boolean;
  dia_vencimento_id?: number;
  conta_boleto?: number;
  data_validade_desconto?: string;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  planos?: Plano[];
  contratos?: Contrato[];
  carnes?: Carne[];
  banco_boleto?: Banco;
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
  modelo_contrato_id?: number;
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
  layout_carne?: string;
  local_pagamento?: string;
  dados_avalista?: string;
  exibir_mes_referente: boolean;
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
  configuracoes_json?: Record<string, unknown>;
  logo?: string;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  clientes?: Cliente[];
  banco_configuracoes?: BancoConfiguracao[];
  configuracao_principal?: BancoConfiguracao;
}

// ============================================
// Carne (Carnê de Pagamento)
// ============================================
export interface Carne {
  id: number;
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
  valor_parcela?: number;
  parcelas_pagas_count?: number;
  valor_total_carne?: number;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  cliente?: Cliente;
  plano?: Plano;
  banco?: Banco;
  parcelas?: CarneParcela[];
}

// ============================================
// Carne Parcela (Parcela do Carnê)
// ============================================
export interface CarneParcela {
  id: number;
  carne_id: number;
  plano_id: number;
  numero_parcela: number;
  numero_titulo?: string;
  valor_parcela: number;
  valor?: number;
  valor_aberto?: number;
  tipo?: string;
  data_vencimento: string;
  pago: boolean;
  data_pagamento?: string;
  valor_pago?: number;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'pago_atraso' | 'parcial';
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
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  carne?: Carne;
  plano?: Plano;
}

// ============================================
// Banco Configuração
// ============================================
export interface BancoConfiguracao {
  id: number;
  banco_id: number;
  tipo_banco: string;
  configuracao: Record<string, unknown>;
  ativo: boolean;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  banco?: Banco;
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

export interface Column<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  width?: string;
}

export interface BulkAction<T = unknown> {
  label: string;
  action?: (selectedItems: T[], event?: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: (selectedItems: T[]) => boolean;
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}

// ============================================
// Rotina Agendada
// ============================================
export interface RotinaAgendada {
  id: number;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros';
  descricao?: string;
  configuracao?: Record<string, unknown>;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  hora_execucao: string;
  ativo: boolean;
  ultima_execucao?: string;
  proxima_execucao?: string;
  total_execucoes: number;
  execucoes_com_sucesso: number;
  execucoes_com_erro: number;
  created_at: string;
}

export interface RoutineExecutionLog {
  id: number;
  routine_id: number;
  status: 'executando' | 'sucesso' | 'erro';
  data_inicio: string;
  data_fim?: string;
  duracao_ms?: number;
  resultado?: Record<string, unknown>;
  erro?: string;
  stack_trace?: string;
  created_at: string;
}

// ============================================
// Validation Error
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

