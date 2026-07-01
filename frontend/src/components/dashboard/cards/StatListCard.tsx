import React from 'react';

export interface StatRow {
  label: string;
  value: React.ReactNode;
}

export interface StatListCardProps {
  title: string;
  rows: StatRow[];
}

/** Card com lista de métricas simples (label à esquerda, valor à direita). */
const StatListCard: React.FC<StatListCardProps> = ({ title, rows }) => (
  <div className="chart-card">
    <h6 className="chart-title mb-3">{title}</h6>
    <div className="d-flex flex-column gap-2">
      {rows.map((row) => (
        <div key={row.label} className="d-flex justify-content-between">
          <span className="text-muted">{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  </div>
);

export default StatListCard;
