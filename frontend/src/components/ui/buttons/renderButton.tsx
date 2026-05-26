import React from 'react';
import Button from '../Button';
import type { ButtonSize, ButtonVariant } from '../Button';

export interface RenderSystemButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'> {
  label: string;
  variant: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  isPending?: boolean;
  isLoading?: boolean;
  className?: string;
  iconOnly?: boolean;
  iconClassName?: string;
}

/** Render interno — único lugar que instancia o primitivo `Button`. */
export function renderSystemButton({
  label,
  variant,
  size = 'sm',
  type = 'button',
  isPending,
  isLoading,
  className,
  iconOnly,
  iconClassName,
  ...rest
}: RenderSystemButtonProps): React.ReactElement {
  const loading = isPending ?? isLoading ?? false;

  if (iconOnly && iconClassName) {
    return (
      <Button
        type={type}
        variant={variant}
        size={size}
        isLoading={loading}
        className={className}
        aria-label={label}
        title={label}
        {...rest}
      >
        <i className={iconClassName} aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      type={type}
      variant={variant}
      size={size}
      isLoading={loading}
      className={className}
      {...rest}
    >
      {label}
    </Button>
  );
}
