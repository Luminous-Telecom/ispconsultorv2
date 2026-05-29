export interface ContaPagarModalProps {
  show: boolean;
  onClose: () => void;
  contaPagarId?: number | null;
  onSuccess?: () => void;
  showPagamentoOnOpen?: boolean;
}

export interface ContaPagarFormData {
  tipo_criacao: 'unica' | 'lote';
  fornecedor_id: number;
  data_vencimento: string;
  data_vencimento_inicial: string;
  data_vencimento_final: string;
  valor: string;
  tipo_pagamento: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  numero_documento: string;
  nota_fiscal: string;
  descricao: string;
  observacoes: string;
  linha_digitavel: string;
  tipo_chave_pix: 'CPF_CNPJ' | 'CELULAR' | 'EMAIL' | 'ALEATORIA' | 'QRCODE' | '';
  chave_pix: string;
}

export type ContaPagarFormErrors = Partial<Record<keyof ContaPagarFormData, string>>;

export type TipoPagamento = ContaPagarFormData['tipo_pagamento'];

export interface PagamentoData {
  tipo_pagamento: TipoPagamento;
  desconto_percentual: string;
  desconto_valor: string;
  acrescimo_percentual: string;
  acrescimo_valor: string;
  data_pagamento: string;
  observacao: string;
  valor_total: string;
}
