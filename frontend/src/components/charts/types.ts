/**
 * Tipos compartilhados para componentes de gráficos
 */
import React from 'react';

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
  // Propriedades adicionais permitidas para compatibilidade com diferentes formatos de dados
  [key: string]: string | number | undefined;
}

export type ChartFormat = 'currency' | 'number' | 'percentage';

export interface LineChartProps {
  data: ChartDataItem[];
  title: string | React.ReactNode;
  format?: 'currency' | 'number';
}

export interface PieChartProps {
  data: ChartDataItem[];
  title: string;
  hiddenItems: Set<number>;
  onToggleItem: (index: number) => void;
}

