export interface TituloForm {
  cliente_id?: number;
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

export interface TituloFormErrors {
  cliente_id?: string;
  plano_id?: string;
  data_vencimento?: string;
}

export interface TituloModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  tituloId?: number | null; // Para edição
  clienteId?: number; // Para criação com cliente específico
  contratoId?: number; // Para criação com contrato específico
}

