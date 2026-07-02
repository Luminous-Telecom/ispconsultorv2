import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export type SpinnerVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark';

export interface SpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
  'aria-label'?: string;
  text?: string;
  /** inline: só o spinner (uso em linha/tabelas). block: coluna com texto opcional. */
  layout?: 'inline' | 'block';
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className,
  'aria-label': ariaLabel,
  text,
  layout = 'block',
}) => {
  const resolvedAriaLabel = ariaLabel ?? text ?? 'Carregando...';

  const classes = [
    'spinner-border',
    size === 'sm' && 'spinner-border-sm',
    size === 'lg' && 'spinner-border-lg-custom',
    `text-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const spinnerEl = (
    <div
      className={classes}
      role="status"
      aria-label={resolvedAriaLabel}
    >
      <span className="visually-hidden">{resolvedAriaLabel}</span>
    </div>
  );

  if (layout === 'inline') {
    return spinnerEl;
  }

  return (
    <div className="d-flex flex-column align-items-center">
      {spinnerEl}
      {text && <span className="mt-2 small text-muted">{text}</span>}
    </div>
  );
};

export default Spinner;
