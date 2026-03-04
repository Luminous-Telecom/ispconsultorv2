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
}

const sizeStyles: Record<SpinnerSize, React.CSSProperties | undefined> = {
  sm: undefined,
  md: undefined,
  lg: {
    width: '3rem',
    height: '3rem',
    borderWidth: '0.25rem',
  },
};

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className,
  'aria-label': ariaLabel,
  text,
}) => {
  const resolvedAriaLabel = ariaLabel ?? text ?? 'Carregando...';

  const classes = [
    'spinner-border',
    size === 'sm' && 'spinner-border-sm',
    `text-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="d-flex flex-column align-items-center">
      <div
        className={classes}
        role="status"
        aria-label={resolvedAriaLabel}
        style={sizeStyles[size]}
      >
        <span className="visually-hidden">{resolvedAriaLabel}</span>
      </div>

      {text && (
        <span className="mt-2 small text-muted">{text}</span>
      )}
    </div>
  );
};

export default Spinner;
