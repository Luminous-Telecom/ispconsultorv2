import React from 'react';
import type { StatRow } from './StatListCard';

export interface ResourceUsageCardProps {
  title: string;
  usedPercent: number;
  /** Rótulo da linha de uso (ex.: "Uso"). */
  usageLabel: string;
  rows: StatRow[];
}

function getUsageColor(percent: number): string {
  if (percent >= 90) return '#ef4444';
  if (percent >= 70) return '#f59e0b';
  return '#10b981';
}

/** Card de uso de recurso: barra de progresso colorida + lista de métricas (RAM, disco, etc.). */
const ResourceUsageCard: React.FC<ResourceUsageCardProps> = ({
  title,
  usedPercent,
  usageLabel,
  rows,
}) => {
  const color = getUsageColor(usedPercent);
  return (
    <div className="chart-card">
      <h6 className="chart-title mb-3">{title}</h6>
      <div className="d-flex flex-column gap-2">
        <div className="d-flex justify-content-between align-items-center">
          <span className="text-muted">{usageLabel}</span>
          <strong style={{ color }}>{usedPercent}%</strong>
        </div>
        <div className="progress" style={{ height: 8 }}>
          <div className="progress-bar" style={{ width: `${usedPercent}%`, backgroundColor: color }} />
        </div>
        {rows.map((row) => (
          <div key={row.label} className="d-flex justify-content-between">
            <span className="text-muted">{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceUsageCard;
