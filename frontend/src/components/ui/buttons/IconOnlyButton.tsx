import React from 'react';
import { renderSystemButton } from './renderButton';
import type { ButtonSize, ButtonVariant } from '../Button';

export interface IconOnlyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  iconClassName?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  isPending?: boolean;
  isLoading?: boolean;
}

/** Botão só com ícone — exceções: copiar, paginação, limpar busca, fechar. */
export const IconOnlyButton = React.forwardRef<HTMLButtonElement, IconOnlyButtonProps>(
  function IconOnlyButton(
    {
      label,
      iconClassName,
      children,
      variant = 'unstyled',
      size = 'sm',
      type = 'button',
      isPending,
      isLoading,
      className,
      ...rest
    },
    ref,
  ) {
    return renderSystemButton({
      label,
      variant,
      size,
      type,
      isPending,
      isLoading,
      className,
      iconOnly: true,
      iconClassName,
      children,
      ref,
      ...rest,
    });
  },
);
