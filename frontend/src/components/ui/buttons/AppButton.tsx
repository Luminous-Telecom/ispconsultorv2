import React from 'react';
import { renderSystemButton } from './renderButton';
import type { ButtonSize, ButtonVariant } from '../Button';

export interface AppButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  isPending?: boolean;
  isLoading?: boolean;
}

/** Botão genérico — use quando não houver *Button nomeado no sistema. */
export function AppButton({
  label,
  variant = 'primary',
  size = 'sm',
  type = 'button',
  isPending,
  isLoading,
  className,
  ...rest
}: AppButtonProps): React.ReactElement {
  return renderSystemButton({
    label,
    variant,
    size,
    type,
    isPending,
    isLoading,
    className,
    ...rest,
  });
}
