import React from 'react';
import { ModernBarChart } from 'components/charts';
import type { ChartDataItem } from 'components/charts/types';

export interface ClientsByPlanCardProps {
  data: ChartDataItem[];
  title: string;
  titleInfo?: string;
  onBarClick?: (item: ChartDataItem, index: number) => void;
}

/** Card de barras horizontais modernas (clientes por plano). */
const ClientsByPlanCard: React.FC<ClientsByPlanCardProps> = ({
  data,
  title,
  titleInfo,
  onBarClick,
}) => (
  <div className="chart-card chart-card-auto-height" >
    <ModernBarChart
      data={data}
      title={title}
      titleInfo={titleInfo}
      format="number"
      onBarClick={onBarClick}
    />
  </div>
);

export default ClientsByPlanCard;
