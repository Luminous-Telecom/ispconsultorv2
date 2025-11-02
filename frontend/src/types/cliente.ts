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
  dia_vencimento_id: number | null;
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
  cliente?: unknown;
  carne?: unknown;
}

export interface BulkActionItem<T = unknown> {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  disabled?: boolean | ((selectedItems: T[]) => boolean);
  onClick?: (selectedItems: T[]) => void;
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}

// ClienteFormData e ClienteFormErrors estão em forms.ts

export interface NotificationMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}
