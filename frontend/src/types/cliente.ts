// Tipos específicos para substituir 'any' no ClienteEditModal

export interface PlanoInfo {
  id: number;
  nome_plano: string;
  valor_mensal: number;
}

export interface BancoInfo {
  id: number;
  nome: string;
}

export interface ContratoItem {
  id: number;
  plano: PlanoInfo | null;
  status: string;
  desconto_percentual: number | null;
  desconto_valor: number | null;
  valor_final: number | null;
  data_inicio: string;
  data_fim: string | null;
  isento_mensalidade: boolean;
  dia_vencimento: number | null;
  bancoBoleto: BancoInfo | null;
}

export interface TituloItem {
  id: number;
  numero_titulo?: string;
  numero_parcela?: number;
  status: string;
  valor?: number;
  valor_parcela: number;
  valor_pago?: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  charge_id: string | null;
  cliente?: any;
  carne?: any;
}

export interface BulkActionItem {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  disabled?: boolean | ((selectedItems: any[]) => boolean);
  onClick?: (selectedItems: any[]) => void;
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}

export interface ClienteFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  tipo_cobranca: 'titulo';
  valor_primeiro_titulo: 'total' | 'proporcional';
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  observacoes: string;
}

export interface ClienteFormErrors {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
}

export interface ApiError {
  message: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

export interface NotificationMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}
