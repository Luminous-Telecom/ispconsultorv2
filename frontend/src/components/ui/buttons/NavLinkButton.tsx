import React from 'react';
import { renderSystemButton } from './renderButton';

export interface NavLinkButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: React.ReactNode;
  /** Usado para aria-label quando children não é texto simples. */
  ariaLabel?: string;
}

/** Botão sem estilo Bootstrap — nav-link, accordion, home-nav, etc. */
export const NavLinkButton = React.forwardRef<HTMLButtonElement, NavLinkButtonProps>(
  function NavLinkButton(
    { children, className, ariaLabel, type = 'button', ...rest },
    ref,
  ) {
    const label =
      ariaLabel ??
      (typeof children === 'string' ? children : undefined) ??
      'Ação';

    return renderSystemButton({
      label,
      variant: 'unstyled',
      type,
      className,
      children,
      ref,
      ...rest,
    });
  },
);
