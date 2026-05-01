/**
 * Tipos compartilhados para componentes de gráficos
 */

/**
 * Interface para dados de gráfico
 * Suporta propriedades conhecidas e permite propriedades adicionais para flexibilidade
 */
export interface ChartDataItem {
  valor?: number;
  value?: number;
  label?: string;
  color?: string;
  mes?: string;
  name?: string;
  filterValue?: string | boolean;
  // Propriedades adicionais permitidas para compatibilidade com diferentes formatos de dados
  [key: string]: string | number | boolean | undefined;
}

export type ChartFormat = 'currency' | 'number' | 'percentage';

export interface LineChartProps {
  data: ChartDataItem[];
  title: string;
  format?: 'currency' | 'number';
  onPointClick?: (item: ChartDataItem, index: number) => void;
}

export interface PieChartProps {
  data: ChartDataItem[];
  title: string;
  hiddenItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSliceClick?: (item: ChartDataItem, index: number) => void;
  /** Ex.: `true` (clientes ativos), `'ativo'` (contratos), `'pago,...'` (pagamentos) — % no buraco do donut */
  centerHighlightFilterValue?: string | boolean;
}

