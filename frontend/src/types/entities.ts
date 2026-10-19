/**
 * Tipos e Interfaces das Entidades do Sistema
 * ISP Consultor
 */

// ============================================
// Empresa (Multi-Tenant) — usa dados_empresa
// ============================================
export type Empresa = DadosEmpresa;

export type CreateEmpresa = {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  email: string;
  telefone?: string;
  celular?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_cargo?: string;
};

export type UpdateEmpresa = Partial<CreateEmpresa>;

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
  recebe_whatsapp: boolean;
  observacoes?: string;
  central_assinante_senha?: string | null;
  isento_mensalidade?: boolean;
  dia_vencimento_id?: number;
  conta_boleto?: number;
  data_validade_desconto?: string;
  created_at?: string;
  created_at_formatada?: string | null;
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
  tipo_servico: 'infraestrutura' | 'consultoria' | 'blockdomi';
  servicos_inclusos?: string[];
  quantidade_usuarios?: number;
  valor_mensal: number;
  periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal';
  status: 'ativo' | 'inativo';
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
  created_at: string;
  created_at_formatada?: string | null;
  updated_at?: string;
  quantidade_clientes?: number; // Quantidade de clientes associados ao plano
  clientes?: Cliente[]; // Lista de clientes associados (quando incluído no backend)
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
  data_pagamento_formatada?: string | null;
  created_at_formatada?: string | null;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'parcial' | 'pago_atraso';
  pago: boolean;
  vencida?: boolean;
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
  is_avulso?: boolean;
  nota_fiscal_id?: number | null;
  // Campos calculados do backend (vindos da nota fiscal vinculada)
  nfse_numero?: string | null;
  nfse_status?: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null;
  created_at: string;
  updated_at?: string;
  
  // Relacionamentos
  cliente?: Cliente;
  plano?: Plano;
  banco?: Banco;
  contrato?: Contrato;
}

export interface TituloFilters extends Record<string, string | number | boolean | null | undefined> {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  status?: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'parcial' | 'pago_atraso' | `!${string}` | string;
  cliente_id?: number;
  empresa_id?: number;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  data_pagamento_inicio?: string;
  data_pagamento_fim?: string;
  sortColumn?: string;
  sortDirection?: string;
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
  tipo_cobranca_contrato_id?: number | null;
  data_validade_desconto?: string;
  modelo_documento_id?: number;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  usar_endereco_cliente?: boolean;
  created_at: string;
  created_at_formatada?: string | null;
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
  local_pagamento?: string;
  dados_avalista?: string;
  exibir_mes_referente: boolean;
  taxa_cobranca?: number;
  incluir_taxa: boolean;
  usar_integracao_banco_nfse: boolean;
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
  
  // Relacionamentos
  clientes?: Cliente[];
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
  data_pagamento_formatada?: string | null;
  valor_pago?: number;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado' | 'pago_atraso' | 'parcial';
  vencida?: boolean;
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
  nota_fiscal_id?: number | null;
  // Campos calculados do backend (vindos da nota fiscal vinculada)
  nfse_numero?: string | null;
  nfse_status?: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos
  carne?: Carne;
  plano?: Plano;
  cliente_id?: number;
  contrato_id?: number;
  cliente?: Cliente;
  contrato?: Contrato;
}

// ============================================
// Fornecedor
// ============================================
export interface Fornecedor {
  id: number;
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  nome_razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  observacoes?: string;
  created_at?: string;
  created_at_formatada?: string | null;
  updated_at?: string;
  
  // Relacionamentos
  contasPagar?: ContaPagar[];
}

// ============================================
// Conta a Pagar
// ============================================
export interface ContaPagar {
  id: number;
  fornecedor_id: number;
  data_vencimento: string;
  valor: number;
  tipo_pagamento: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  numero_documento?: string;
  nota_fiscal?: string;
  descricao?: string;
  observacoes?: string;
  linha_digitavel?: string;
  tipo_chave_pix?: 'CPF_CNPJ' | 'CELULAR' | 'EMAIL' | 'ALEATORIA' | 'QRCODE';
  chave_pix?: string;
  status: 'A_PAGAR' | 'PAGO' | 'PARCIAL' | 'CANCELADO';
  valor_pago: number;
  data_pagamento?: string;
  data_cadastro: string;
  created_at?: string;
  created_at_formatada?: string | null;
  updated_at?: string;
  saldo_devedor?: number; // Calculado no backend
  vencida?: boolean; // Calculado no backend
  
  // Relacionamentos
  fornecedor?: Fornecedor;
  pagamentos?: ContaPagarPagamento[];
}

// ============================================
// Nota Fiscal Eletrônica
// ============================================
export interface NotaFiscal {
  id: number;
  cliente_id: number;
  titulo_id?: number | null;
  numero?: string;
  serie?: string;
  chave_acesso?: string;
  status: 'PENDENTE' | 'PROCESSANDO' | 'AUTORIZADA' | 'CANCELADA' | 'REJEITADA' | 'ERRO';
  tipo_operacao: 'ENTRADA' | 'SAIDA';
  modelo: number;
  natureza_operacao: string;
  data_emissao: string;
  data_vencimento?: string;
  valor_total: number;
  valor_produtos: number;
  valor_servicos: number;
  valor_desconto: number;
  valor_icms: number;
  valor_iss: number;
  aliquota_iss: number;
  cst_icms?: string;
  cfop?: string;
  descricao?: string;
  observacoes?: string;
  xml?: string;
  pdf_url?: string;
  danfe_url?: string;
  protocolo?: string;
  data_autorizacao?: string;
  mensagem_erro?: string;
  codigo_erro?: string;
  nfse_status?: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null;
  asaas_invoice_id?: string | null;
  created_at?: string;
  created_at_formatada?: string | null;
  updated_at?: string;
  valor_formatado?: string;
  is_autorizada?: boolean;
  pode_cancelar?: boolean;
  
  // Relacionamentos
  cliente?: Cliente;
}

export interface CreateNotaFiscal {
  cliente_id: number;
  titulo_id?: number;
  natureza_operacao?: string;
  data_emissao?: string;
  data_vencimento?: string;
  valor_total: number;
  valor_servicos?: number;
  valor_produtos?: number;
  valor_desconto?: number;
  aliquota_iss?: number;
  descricao?: string;
  observacoes?: string;
  modelo?: number;
  cfop?: string;
  cst_icms?: string;
}

export interface NotaFiscalFilters {
  search?: string;
  status?: string;
  cliente_id?: number;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  limit?: number;
}

export interface ContaPagarPagamento {
  id: number;
  conta_pagar_id: number;
  data: string;
  valor: number;
  tipo_pagamento: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  usuario_id?: number;
  observacao?: string;
  created_at?: string;
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
  celular?: string;
  email?: string;
  site?: string;
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
  created_at?: string;
  created_at_formatada?: string | null;
  updated_at?: string;
}

// ============================================
// Modelo Documento
// ============================================
export interface ModeloDocumento {
  id: number;
  nome: string;
  tipo: 'contrato' | 'recibo' | 'carta' | 'boleto' | 'comprovante' | 'outro';
  conteudo: string;
  conteudo_adesao?: string;
  conteudo_permanencia?: string;
  descricao?: string;
  ativo: boolean;
  tamanho_maximo: number;
  tipos_permitidos: string;
  retencao_dias: number;
  auto_backup: boolean;
  criptografia: boolean;
  created_at?: string;
  created_at_formatada?: string | null;
  updated_at?: string;
}

// ============================================
// Assinatura Digital
// ============================================
export interface AssinaturaDigital {
  id: number;
  termo_contrato_id: number | null;
  cliente_id: number | null;
  documento_tipo: 'termo' | 'contrato' | 'outro';
  documento_id: number | null;
  api_provider: 'assinafy' | 'zapsign';
  api_document_id: string | null;
  api_signature_id: string | null;
  status: 'pendente' | 'enviado' | 'assinado' | 'cancelado' | 'expirado' | 'erro';
  url_assinatura: string | null;
  email_assinante: string | null;
  nome_assinante: string | null;
  cpf_cnpj_assinante: string | null;
  data_envio: string | null;
  data_assinatura: string | null;
  data_expiracao: string | null;
  pdf_assinado_url: string | null;
  pdf_assinado_base64: string | null;
  metadata: string | null;
  erro_mensagem: string | null;
  created_at?: string;
  created_at_formatada?: string | null;
  updated_at?: string;
  termoContrato?: {
    id: number;
    tipo_termo: string;
    assinado: string;
  };
  cliente?: {
    id: number;
    nome: string;
    email: string;
    cpf_cnpj: string;
  };
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
export type StatusAssinaturaDigital = AssinaturaDigital['status'];
export type ApiProviderAssinatura = AssinaturaDigital['api_provider'];

// ============================================
// DTOs (Data Transfer Objects) - Usar sufixo Data conforme convenções
// ============================================

export interface CreateTituloData {
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

export interface UpdateTituloData extends Partial<CreateTituloData> {
  valor?: number;
  status?: StatusTitulo;
  data_pagamento?: string;
  valor_pago?: number;
}

export interface CreateContratoData {
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

export interface UpdateContratoData extends Partial<CreateContratoData> {
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
    action: (selectedItems?: T[]) => void;
  }[];
}

// ============================================
// Rotina Agendada
// ============================================
export interface RotinaAgendada {
  id: number;
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'backup_equipamentos_ssh' | 'rpki_sync_parent_resources' | 'rpki_sync_repositories' | 'consulta_titulos_asaas' | 'consulta_titulos_efi' | 'ixc_sync_ordens_servico' | 'suspender_contratos_atraso' | 'outros';
  dia_semana?: string | number;
  minuto?: string;
  hora?: string;
  dia_mes?: string;
  mes?: string;
  ativo: boolean;
  ultima_execucao?: string;
  ultima_execucao_formatada?: string | null;
  proxima_execucao?: string;
  total_execucoes: number;
  execucoes_com_sucesso: number;
  execucoes_com_erro: number;
  created_at: string;
  created_at_formatada?: string | null;
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

// ============================================
// Usuario
// ============================================
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: 'admin' | 'financeiro' | 'user';
  ativo: boolean;
  precisa_trocar_senha: boolean;
  ultimo_login?: string | null;
  webhook_secret?: string | null;
  totp_enabled?: boolean;
  created_at?: string;
  created_at_formatada?: string | null;
  updated_at?: string;
}

export interface CreateUsuario {
  nome: string;
  email: string;
  password: string;
  role?: 'admin' | 'financeiro' | 'user';
  ativo?: boolean;
}

export interface UpdateUsuario {
  nome?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'financeiro' | 'user';
  ativo?: boolean;
}

export interface UsuarioFilters extends Record<string, string | number | boolean | null | undefined> {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: boolean;
}

// ============================================
// Blockdomi - Dominio
// ============================================
export interface Dominio {
  id: number;
  dominio: string;
  versao?: string | null;
  descricao?: string | null;
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  /** Número SEI do protocolo eletrônico (ofício Anatel). */
  numero_sei_anatel?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  created_at_formatada?: string | null;
}

// ============================================
// Blockdomi - IPv4
// ============================================
export interface IPv4 {
  id: number;
  ip: string;
  versao?: string | null;
  descricao?: string | null;
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  numero_sei_anatel?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  created_at_formatada?: string | null;
}

// ============================================
// Blockdomi - IPv6
// ============================================
export interface IPv6 {
  id: number;
  ip: string;
  versao?: string | null;
  descricao?: string | null;
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  numero_sei_anatel?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  created_at_formatada?: string | null;
}


// ============================================
// SSH Manager — Devices
// ============================================
export type SshDeviceType = 'mikrotik' | 'cisco' | 'huawei' | 'swos';

export type SshAuditAction =
  | 'CONNECT'
  | 'DISCONNECT'
  | 'COMMAND'
  | 'TERMINAL_COMMAND'
  | 'AUTH_FAIL'
  | 'TERMINAL_OPEN'
  | 'TERMINAL_CLOSE'
  | 'AGENT_CONNECT'
  | 'AGENT_DISCONNECT';

export type SshClienteRef = Pick<Cliente, 'id' | 'razao_social' | 'nome_fantasia'>;

export interface SshDevice {
  id: string;
  agent_id?: string | null;
  cliente_id?: number | null;
  name: string;
  host: string;
  port: number;
  username: string;
  device_type: SshDeviceType;
  description?: string | null;
  is_active: boolean;
  backup_enabled?: boolean;
  tags?: string[] | null;
  agent?: Pick<Agent, 'id' | 'name' | 'online'>;
  cliente?: SshClienteRef | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSshDevice {
  agent_id?: string | null;
  cliente_id?: number | null;
  empresa_id?: number;
  name: string;
  host: string;
  port?: number;
  username: string;
  password: string;
  private_key?: string | null;
  device_type?: SshDeviceType;
  description?: string | null;
  is_active?: boolean;
  backup_enabled?: boolean;
  tags?: string[] | null;
}

export interface UpdateSshDevice {
  agent_id?: string | null;
  cliente_id?: number | null;
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  private_key?: string | null;
  device_type?: SshDeviceType;
  description?: string | null;
  is_active?: boolean;
  backup_enabled?: boolean;
  tags?: string[] | null;
}

// ============================================
// SSH Manager — Auditoria
// ============================================
export interface SshAuditLog {
  id?: string;
  timestamp: string;
  action: SshAuditAction;
  userId: string;
  userName?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  clienteId?: number | null;
  clienteName?: string | null;
  /** Preenchido na listagem (equipamento ou agente → DadosEmpresa) */
  empresa_id?: number | null;
  empresa_nome?: string | null;
  command?: string | null;
  output?: string | null;
  success: boolean;
  errorMessage?: string | null;
  ip: string;
  duration?: number | null;
}

// ============================================
// SSH Manager — Teste de Conexão
// ============================================
export interface SshConnectionTestResult {
  success: boolean;
  latency: number | null;
  error: string | null;
}

// ============================================
// SSH Manager — Execução de Comando
// ============================================
export interface SshCommandResult {
  output: string;
  duration: number;
}

// ============================================
// Agents
// ============================================
export interface Agent {
  id: string;
  cliente_id?: number | null;
  cliente?: SshClienteRef | null;
  name: string;
  token_hint: string | null;
  description?: string | null;
  is_active: boolean;
  online: boolean;
  last_seen_at?: string | null;
  version?: string | null;
  hostname?: string | null;
  os_info?: string | null;
  ip_address?: string | null;
  connection_mode?: 'socket' | 'wireguard' | string | null;
  mikrotik_host?: string | null;
  mikrotik_api_port?: number | null;
  mikrotik_api_tls?: boolean;
  mikrotik_username?: string | null;
  has_mikrotik_password?: boolean;
  wg_listen_port?: number | null;
  wg_lan_cidrs?: string | null;
  wg_interface_name?: string | null;
  wg_our_public_key?: string | null;
  wg_peer_public_key?: string | null;
  wg_address_ours?: string | null;
  wg_address_peer?: string | null;
  wg_status?: string | null;
  wg_last_error?: string | null;
  created_at?: string;
  updated_at?: string;
  /** Retornado somente na criação/regeneração */
  token?: string;
}

export interface ConfigureAgentWireguard {
  mikrotik_host: string;
  mikrotik_api_port: number;
  mikrotik_api_tls: boolean;
  mikrotik_username: string;
  mikrotik_password?: string;
  wg_listen_port: number;
  wg_lan_cidrs: string;
}

export interface CreateAgent {
  name: string;
  description?: string | null;
  cliente_id?: number | null;
  empresa_id?: number;
}

export interface UpdateAgent {
  name?: string;
  description?: string | null;
  is_active?: boolean;
  cliente_id?: number | null;
}

export interface AgentConnectionTestResult {
  success: boolean;
  latency: number | null;
  error: string | null;
}
