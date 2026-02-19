/**
 * Exemplo de uso do DonutChart
 *
 * Como integrar:
 * 1. Importe: import { DonutChart, ChartData } from '@/components/charts';
 * 2. Prepare os dados no formato ChartData[]
 * 3. Renderize: <DonutChart data={data} />
 */

import React from 'react';
import { DonutChart, ChartData } from './DonutChart';

const exemploData: ChartData[] = [
  { name: 'MHNET TELECOM', value: 500, color: '#4facfe' },
  { name: 'GOOGLE', value: 100, color: '#00f2fe' },
  { name: 'AMAZON-02', value: 80, color: '#ffb3ba' },
  { name: 'BYTEDANCE', value: 70, color: '#baffc9' },
  { name: 'AKAMAI-ASN1', value: 60, color: '#bae1ff' },
  { name: 'FASTLY', value: 50, color: '#f7d3d3' },
  { name: 'VALVE-CORPORATION', value: 40, color: '#ffeaa7' },
  { name: 'Outros', value: 100, color: '#d3f7f3' }
];

export const DonutChartExample: React.FC = () => (
  <div style={{ width: 400, height: 350 }}>
    <DonutChart
      data={exemploData}
      showLabels
      showTooltip
      innerRadiusRatio={0.45}
      padAngleDegrees={4}
    />
  </div>
);

export default DonutChartExample;
