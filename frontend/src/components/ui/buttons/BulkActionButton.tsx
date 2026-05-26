import React from 'react';
import { renderSystemButton } from './renderButton';
import type { ButtonSize, ButtonVariant } from '../Button';

type BulkVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

export interface BulkActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  variant?: BulkVariant;
  size?: ButtonSize;
  isPending?: boolean;
  isLoading?: boolean;
  dropdown?: boolean;
  className?: string;
}

function toButtonVariant(variant: BulkVariant): ButtonVariant {
  return variant;
}

/** Botão de ação em lote (Table / TableActions) — estilo centralizado. */
const BulkActionButton: React.FC<BulkActionButtonProps> = ({
  label,
  variant = 'primary',
  size = 'sm',
  isPending,
  isLoading,
  dropdown = false,
  className = '',
  ...rest
}) => {
  const extra = [
    'table-flex-shrink-0',
    dropdown ? 'dropdown-toggle dropdown-toggle-custom' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return renderSystemButton({
    label,
    variant: toButtonVariant(variant),
    size,
    isPending,
    isLoading,
    className: extra || undefined,
    ...rest,
  });
};

export default BulkActionButton;
