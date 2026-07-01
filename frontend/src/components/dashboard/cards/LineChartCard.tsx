import React from 'react';
import { ResponsiveLineChart } from 'components/charts';
import type { ChartDataItem } from 'components/charts/types';

export interface LineChartCardProps {
  data: ChartDataItem[];
  title: string;
  titleInfo?: string;
  format?: 'currency' | 'number';
  onPointClick?: (item: ChartDataItem, index: number) => void;
}

/** Card de gráfico de linha moderno (recebidos, a receber, faturamento, etc.). */
const LineChartCard: React.FC<LineChartCardProps> = ({
  data,
  title,
  titleInfo,
  format = 'number',
  onPointClick,
}) => (
  <div className="chart-card chart-card-line">
    <ResponsiveLineChart
      data={data}
      title={title}
      titleInfo={titleInfo}
      format={format}
      onPointClick={onPointClick}
    />
  </div>
);

export default LineChartCard;
