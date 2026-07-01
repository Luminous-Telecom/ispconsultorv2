import React from 'react';
import { ResponsivePieChart } from 'components/charts';
import type { ChartDataItem, PieMetricFooter } from 'components/charts/types';

export interface PieStatusCardProps {
  data: ChartDataItem[];
  title: string;
  hiddenItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSliceClick?: (item: ChartDataItem, index: number) => void;
  centerHighlightFilterValue?: string | boolean;
  /** `compact` (dashboard principal) ou `metric` (SaaS, com rodapé e ícone). */
  variant?: 'compact' | 'metric';
  metricHeaderIcon?: 'contracts' | 'payments' | 'clients' | 'plans';
  metricHeaderInfo?: string;
  footerLeft?: PieMetricFooter;
  footerRight?: PieMetricFooter;
}

/** Card de donut de status (clientes, contratos, pagamentos, distribuição). */
const PieStatusCard: React.FC<PieStatusCardProps> = ({
  data,
  title,
  hiddenItems,
  onToggleItem,
  onSliceClick,
  centerHighlightFilterValue,
  variant = 'compact',
  metricHeaderIcon,
  metricHeaderInfo,
  footerLeft,
  footerRight,
}) => {
  const isMetric = variant === 'metric';
  return (
    <div
      className={`chart-card chart-card-pie ${isMetric ? 'chart-card-pie--metric' : 'chart-card-pie--compact'}`}
    >
      <ResponsivePieChart
        data={data}
        title={title}
        hiddenItems={hiddenItems}
        onToggleItem={onToggleItem}
        onSliceClick={onSliceClick}
        centerHighlightFilterValue={centerHighlightFilterValue}
        chartLeading
        {...(isMetric
          ? { metricLayout: true, metricHeaderIcon, metricHeaderInfo, footerLeft, footerRight }
          : { compact: true })}
      />
    </div>
  );
};

export default PieStatusCard;
