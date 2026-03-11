import React from 'react';

interface ChartEmptyStateProps {
  title: string;
  message?: string;
  containerClassName?: string;
  compact?: boolean;
}

export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({
  title,
  message = 'Sem dados para exibir',
  containerClassName = 'chart-container',
  compact = false,
}) => {
  return (
    <div className={containerClassName}>
      <h6 className="chart-title">{title}</h6>
      <div className={`chart-empty-state ${compact ? 'chart-empty-state--compact' : ''}`}>
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
};

