import React from 'react';
import { renderSystemButton } from './renderButton';
import type { ButtonSize, ButtonVariant } from '../Button';

export interface BulkActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isPending?: boolean;
  isLoading?: boolean;
  dropdown?: boolean;
  className?: string;
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
    variant,
    size,
    isPending,
    isLoading,
    className: extra || undefined,
    ...rest,
  });
};

export default BulkActionButton;
