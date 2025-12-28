import React from 'react';
import './ModernLoader.css';

interface ModernLoaderProps {
  message?: string;
}

const ModernLoader: React.FC<ModernLoaderProps> = ({ 
  message = 'Carregando...'
}) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center">
      <div className="modern-loader-dots" role="status" aria-label={message}>
        <span className="modern-loader-dot"></span>
        <span className="modern-loader-dot"></span>
        <span className="modern-loader-dot"></span>
      </div>
      {message && (
        <p className="mt-3 mb-0 text-muted modern-loader-text">
          {message}
        </p>
      )}
    </div>
  );
};

export default ModernLoader;
