import React from 'react';
import { useI18n } from 'contexts/I18nContext';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Preenche e centraliza no corpo do modal (Suspense/lazy) */
  variant?: 'default' | 'modal';
}

const Loading: React.FC<LoadingProps> = ({
  message,
  size = 'md',
  variant = 'default',
}) => {
  const { t } = useI18n();
  const loadingMessage = message || t('messages.loading');
  const containerClass =
    variant === 'modal'
      ? 'loading-container loading-container--modal'
      : 'loading-container';

  return (
    <div
      className={`d-flex flex-column align-items-center justify-content-center ${containerClass}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`loading-spinner loading-spinner--${size}`}
        aria-hidden="true"
      />
      <span className="visually-hidden">{loadingMessage}</span>
      {loadingMessage && (
        <p className="loading-message">{loadingMessage}</p>
      )}
    </div>
  );
};

export default Loading;

