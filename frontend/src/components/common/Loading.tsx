import React from 'react';
import { useI18n } from 'contexts/I18nContext';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Loading: React.FC<LoadingProps> = ({ 
  message, 
  size = 'md' 
}) => {
  const { t } = useI18n();
  const loadingMessage = message || t('messages.loading');
  const spinnerSize = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center loading-container">
      <div className={`spinner-border text-primary ${spinnerSize[size]}`} role="status">
        <span className="visually-hidden">{loadingMessage}</span>
      </div>
      {loadingMessage && (
        <p className="mt-3 text-muted">{loadingMessage}</p>
      )}
    </div>
  );
};

export default Loading;

