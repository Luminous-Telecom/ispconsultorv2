export interface ContratoForm {
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
  data_validade_desconto: string;
  modelo_contrato_id: number;
}

export interface TermoFormData {
  assinado: 'SIM' | 'NAO';
  termoCadastradoId: number;
}

export interface BulkAction<T = Record<string, unknown>> {
  label: string;
  action?: (selectedItems: T[]) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: boolean | ((selectedItems: T[]) => boolean);
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}
