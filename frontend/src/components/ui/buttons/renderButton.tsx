import React from 'react';
import Button from '../Button';
import type { ButtonSize, ButtonVariant } from '../Button';

export interface RenderSystemButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  variant: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  isPending?: boolean;
  isLoading?: boolean;
  className?: string;
  iconOnly?: boolean;
  iconClassName?: string;
  /** Conteúdo customizado — sobrescreve `label` quando informado. */
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
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
  children,
  ref,
  ...rest
}: RenderSystemButtonProps): React.ReactElement {
  const loading = isPending ?? isLoading ?? false;
  const content = children ?? label;

  if (iconOnly && iconClassName) {
    return (
      <Button
        ref={ref}
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

  if (iconOnly && !iconClassName && children) {
    return (
      <Button
        ref={ref}
        type={type}
        variant={variant}
        size={size}
        isLoading={loading}
        className={className}
        aria-label={label}
        title={label}
        {...rest}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      ref={ref}
      type={type}
      variant={variant}
      size={size}
      isLoading={loading}
      className={className}
      {...rest}
    >
      {content}
    </Button>
  );
}
