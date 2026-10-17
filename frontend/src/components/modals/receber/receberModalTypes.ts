export type ReceberModalVariant = 'erp';

export interface ReceberTarget {
  id: number;
  numero_titulo?: string | null;
  valor: number;
  data_vencimento: string;
  clienteLabel: string;
}
