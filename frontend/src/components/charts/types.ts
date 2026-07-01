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
  /** Texto do tooltip do ícone de informação ao lado do título */
  titleInfo?: string;
  format?: 'currency' | 'number';
  onPointClick?: (item: ChartDataItem, index: number) => void;
}

export interface PieMetricFooter {
  label: string;
  value: string | number;
  accentColor?: string;
}

export interface PieChartProps {
  data: ChartDataItem[];
  title: string;
  hiddenItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSliceClick?: (item: ChartDataItem, index: number) => void;
  /** Ex.: `true` (clientes ativos), `'ativo'` (contratos), `'pendente'` (pagamentos) — % no buraco do donut */
  centerHighlightFilterValue?: string | boolean;
  /** Donut à esquerda, legenda à direita (layout tipo cards de métrica) */
  chartLeading?: boolean;
  /** Título em caixa alta e rodapé com duas métricas (quando `footerLeft` / `footerRight` forem passados) */
  metricLayout?: boolean;
  footerLeft?: PieMetricFooter;
  footerRight?: PieMetricFooter;
  /** Badge opcional à direita do título (ex.: alerta ou período) */
  metricHeaderBadge?: string;
  /** Ícone à esquerda do título (com `metricLayout`) */
  metricHeaderIcon?: 'contracts' | 'payments' | 'clients' | 'plans';
  /** Tooltip do ícone de informação ao lado do título (layout métrico) */
  metricHeaderInfo?: string;
  /** Reduz a margem interna do donut para ocupar melhor o SVG (cards compactos) */
  compact?: boolean;
}

