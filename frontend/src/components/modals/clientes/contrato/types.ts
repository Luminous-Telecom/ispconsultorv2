export interface ContratoForm {
  cliente_id: number;
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string;
  isento_mensalidade: boolean;
  dia_vencimento_id: number;
  conta_boleto: number;
  tipo_cobranca_contrato_id: number | null;
  data_validade_desconto: string;
  modelo_documento_id: number;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  usar_endereco_cliente?: boolean;
}

export interface TermoFormData {
  assinado: 'SIM' | 'NAO';
  termoCadastradoId: number;
}

export interface BulkAction<T = Record<string, unknown>> {
  label: string;
  action?: (selectedItems: T[]) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'light' | 'dark';
  disabled?: boolean | ((selectedItems: T[]) => boolean);
  requiresSelection?: boolean;
  dropdown?: {
    label: string;
    action: (selectedItems?: T[]) => void;
    disabled?: boolean | ((selectedItems: T[]) => boolean);
  }[];
}
