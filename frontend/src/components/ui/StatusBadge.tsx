import React from 'react';

export type StatusBadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

export interface StatusBadgeConfig {
  label: string;
  className?: string;
  variant?: StatusBadgeVariant;
}

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning text-dark',
  info: 'bg-info',
};

export interface StatusBadgeProps {
  label: string;
  className?: string;
  variant?: StatusBadgeVariant;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, className, variant = 'secondary' }) => (
  <span className={`badge ${className ?? VARIANT_CLASS[variant]}`}>{label}</span>
);

export function renderStatusBadge(
  config: StatusBadgeConfig | undefined,
  fallbackLabel = '—'
): React.ReactElement {
  if (!config) {
    return <StatusBadge label={fallbackLabel} variant="secondary" />;
  }
  return (
    <StatusBadge
      label={config.label}
      className={config.className}
      variant={config.variant}
    />
  );
}

export function createStatusBadgeRenderer<T extends string>(
  map: Record<T, StatusBadgeConfig>,
  fallback?: StatusBadgeConfig
) {
  return (key: T | string): React.ReactElement => {
    const config = (map as Record<string, StatusBadgeConfig>)[key] ?? fallback ?? {
      label: String(key),
      variant: 'secondary' as const,
    };
    return renderStatusBadge(config);
  };
}

export default StatusBadge;
