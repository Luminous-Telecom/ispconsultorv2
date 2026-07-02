import React from 'react';

interface LoadingBarProps {
  className?: string;
}

/** Barra animada no topo do layout durante requisições globais (LoadingContext). */
const LoadingBar: React.FC<LoadingBarProps> = ({ className = '' }) => (
  <div className={`loading-dots-track loading-dots ${className}`.trim()}>
    <div className="loading-dots-slide" />
  </div>
);

export default LoadingBar;
