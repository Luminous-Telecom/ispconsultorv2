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


