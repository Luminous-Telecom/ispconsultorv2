/**
 * Exemplo de uso do PolarAreaChart (Coxcomb)
 *
 * Uso:
 * import { PolarAreaChart, NetworkData } from '@/components/charts';
 */

import React from 'react';
import { PolarAreaChart, NetworkData } from './PolarAreaChart';

const exemploData: NetworkData[] = [
  { label: 'Valve Corp.', value: 13.93, percentage: 18.71 },
  { label: 'Google', value: 12.45, percentage: 16.72 },
  { label: 'Akamai', value: 10.2, percentage: 13.7 },
  { label: 'Cloudflare', value: 8.9, percentage: 11.95 },
  { label: 'AWS', value: 7.5, percentage: 10.07 },
  { label: 'Fastly', value: 5.2, percentage: 6.98 },
  { label: 'Outros', value: 16.3, percentage: 21.87 }
];

export const PolarAreaChartExample: React.FC = () => (
  <div style={{ width: 500, height: 450 }}>
    <PolarAreaChart
      data={exemploData}
      equalAngles
      radiusScale="sqrt"
      showLabels
      padAngleDegrees={2}
    />
  </div>
);
