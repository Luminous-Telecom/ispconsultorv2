// Constantes do sistema centralizadas

/**
 * Status de Contrato
 */
export const CONTRATO_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
  CANCELADO: 'cancelado',
  SUSPENSO: 'suspenso',
} as const;

export type ContratoStatus = typeof CONTRATO_STATUS[keyof typeof CONTRATO_STATUS];

/**
 * Status de Título/Parcela
 */
export const TITULO_STATUS = {
  PENDENTE: 'pendente',
  PAGO: 'pago',
  VENCIDO: 'vencido',
  CANCELADO: 'cancelado',
  PARCIAL: 'parcial',
  PAGO_ATRASO: 'pago_atraso',
} as const;

export type TituloStatus = typeof TITULO_STATUS[keyof typeof TITULO_STATUS];

/**
 * Status de Plano
 */
export const PLANO_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
  SUSPENSO: 'suspenso',
} as const;

export type PlanoStatus = typeof PLANO_STATUS[keyof typeof PLANO_STATUS];

/**
 * Tipos de Banco
 */
export const BANCO_TIPO = {
  EFI: 'efi',
  ASAAS: 'asaas',
  BANCARIO: 'bancario',
  OUTROS: 'outros',
} as const;

export type BancoTipo = typeof BANCO_TIPO[keyof typeof BANCO_TIPO];

/**
 * Periodicidade de Plano
 */
export const PLANO_PERIODICIDADE = {
  MENSAL: 'mensal',
  TRIMESTRAL: 'trimestral',
  SEMESTRAL: 'semestral',
  ANUAL: 'anual',
} as const;

export type PlanoPeriodicidade = typeof PLANO_PERIODICIDADE[keyof typeof PLANO_PERIODICIDADE];

/**
 * Tipo de Cobrança
 */
export const TIPO_COBRANCA = {
  TITULO: 'titulo',
  BOLETO: 'boleto',
  CARTAO: 'cartao',
  PIX: 'pix',
} as const;

export type TipoCobranca = typeof TIPO_COBRANCA[keyof typeof TIPO_COBRANCA];

/**
 * Status de Conexão WhatsApp
 */
export const WHATSAPP_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  QR_REQUIRED: 'qr_required',
} as const;

export type WhatsAppStatus = typeof WHATSAPP_STATUS[keyof typeof WHATSAPP_STATUS];

/**
 * Tipo de Envio de Mensagem
 */
export const TIPO_ENVIO = {
  DESATIVADO: 'desativado',
  PDF: 'pdf',
} as const;

export type TipoEnvio = typeof TIPO_ENVIO[keyof typeof TIPO_ENVIO];

/**
 * Valores padrão para formulários
 */
export const DEFAULT_FORM_VALUES = {
  DATA_INICIO: () => new Date().toISOString().split('T')[0],
  VALOR_ZERO: 0,
  DESCONTO_ZERO: 0,
  QUANTIDADE_USUARIOS: 1,
} as const;

/**
 * Limites de validação
 */
export const VALIDATION_LIMITS = {
  MAX_OBSERVACOES_LENGTH: 500,
  MAX_DESCRICAO_LENGTH: 1000,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 50,
  MAX_EMAIL_LENGTH: 255,
  MAX_NAME_LENGTH: 255,
  MAX_CNPJ_LENGTH: 18,
  MAX_CPF_LENGTH: 14,
  MAX_PHONE_LENGTH: 15,
  MAX_CEP_LENGTH: 9,
} as const;

/**
 * Cores de status para badges
 */
export const STATUS_COLORS = {
  ativo: 'success',
  inativo: 'secondary',
  cancelado: 'danger',
  suspenso: 'warning',
  pendente: 'warning',
  pago: 'success',
  vencido: 'danger',
  parcial: 'info',
  pago_atraso: 'warning',
  disconnected: 'danger',
  connecting: 'warning',
  connected: 'success',
  qr_required: 'info',
} as const;

/**
 * Mensagens padrão
 */
export const DEFAULT_MESSAGES = {
  CONFIRM_DELETE: 'Tem certeza que deseja deletar este item?',
  CONFIRM_DELETE_MULTIPLE: (count: number) => `Tem certeza que deseja deletar ${count} item(ns)?`,
  SAVE_SUCCESS: 'Salvo com sucesso!',
  UPDATE_SUCCESS: 'Atualizado com sucesso!',
  DELETE_SUCCESS: 'Deletado com sucesso!',
  ERROR_GENERIC: 'Ocorreu um erro. Tente novamente.',
  LOADING: 'Carregando...',
  NO_DATA: 'Nenhum dado encontrado',
  SELECT_ITEM: 'Selecione um item',
} as const;

/**
 * Regex patterns
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  PHONE: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  CEP: /^\d{5}-\d{3}$/,
  URL: /^https?:\/\/.+/,
} as const;

/**
 * Intervalos de tempo (em milissegundos)
 */
export const TIME_INTERVALS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

