import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import Spinner, { type SpinnerSize, type SpinnerVariant } from './Spinner';

export type LoadingVariant = 'inline' | 'centered' | 'modal' | 'page' | 'fullscreen';

export interface LoadingProps {
  message?: string;
  size?: SpinnerSize;
  variant?: LoadingVariant;
  className?: string;
  spinnerVariant?: SpinnerVariant;
  /** Exibe texto ao lado/abaixo do spinner. Inline: padrão só se `message` foi passado. */
  showMessage?: boolean;
}

const Loading: React.FC<LoadingProps> = ({
  message,
  size = 'md',
  variant = 'centered',
  className,
  spinnerVariant = 'primary',
  showMessage,
}) => {
  const { t } = useI18n();
  const loadingMessage = message ?? t('messages.loading');
  const shouldShowMessage =
    showMessage ?? (variant === 'inline' ? message != null : true);

  if (variant === 'inline') {
    return (
      <span
        className={`d-inline-flex align-items-center gap-2 ${className ?? ''}`.trim()}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Spinner
          layout="inline"
          size={size}
          variant={spinnerVariant}
          aria-label={loadingMessage}
        />
        {shouldShowMessage && <span className="small text-muted">{loadingMessage}</span>}
      </span>
    );
  }

  const containerClass = [
    'd-flex flex-column align-items-center justify-content-center',
    variant === 'modal' && 'loading-container loading-container--modal',
    variant === 'page' && 'loading-container loading-container--page',
    variant === 'fullscreen' && 'min-vh-100 loading-container loading-container--page',
    variant === 'centered' && 'loading-container',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClass}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner
        layout="inline"
        size={size}
        variant={spinnerVariant}
        aria-label={loadingMessage}
      />
      {shouldShowMessage && <p className="loading-message">{loadingMessage}</p>}
    </div>
  );
};

export default Loading;
