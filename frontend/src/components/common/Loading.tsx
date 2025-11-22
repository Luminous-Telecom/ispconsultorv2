import React from 'react';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Loading: React.FC<LoadingProps> = ({ 
  message = 'Carregando...', 
  size = 'md' 
}) => {
  const spinnerSize = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '200px' }}>
      <div className={`spinner-border text-primary ${spinnerSize[size]}`} role="status">
        <span className="visually-hidden">{message}</span>
      </div>
      {message && (
        <p className="mt-3 text-muted">{message}</p>
      )}
    </div>
  );
};

export default Loading;

