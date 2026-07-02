import React from 'react';
import { renderSystemButton } from './renderButton';

export interface DropdownItemButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  isPending?: boolean;
  isLoading?: boolean;
  /** Classes extras além de `dropdown-item`. */
  className?: string;
}

/** Item de menu dropdown (Bootstrap dropdown-item). */
export function DropdownItemButton({
  label,
  isPending,
  isLoading,
  className = '',
  type = 'button',
  ...rest
}: DropdownItemButtonProps): React.ReactElement {
  const mergedClassName = ['dropdown-item', className].filter(Boolean).join(' ');

  return renderSystemButton({
    label,
    variant: 'unstyled',
    type,
    isPending,
    isLoading,
    className: mergedClassName,
    ...rest,
  });
}
