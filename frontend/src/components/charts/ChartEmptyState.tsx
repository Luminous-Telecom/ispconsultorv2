import React from 'react';

interface ChartEmptyStateProps {
  title: string;
  message?: string;
  containerClassName?: string;
}

export const ChartEmptyState: React.FC<ChartEmptyStateProps> = ({ 
  title, 
  message = 'Sem dados para exibir',
  containerClassName = 'chart-container'
}) => {
  return (
    <div className={containerClassName}>
      <h6 className="chart-title">{title}</h6>
      <div style={{ 
        width: '100%', 
        height: '220px', 
        minWidth: '200px', 
        minHeight: '220px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
};

