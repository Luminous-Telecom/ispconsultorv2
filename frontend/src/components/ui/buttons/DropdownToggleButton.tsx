import React from 'react';
import { NavLinkButton } from './NavLinkButton';

export interface DropdownToggleButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

/** Botão toggle de dropdown customizado (não Bootstrap Dropdown). */
export function DropdownToggleButton({
  children,
  isActive = false,
  className = '',
  type = 'button',
  ...rest
}: DropdownToggleButtonProps): React.ReactElement {
  const mergedClassName = [
    'dropdown-toggle w-100 text-start d-flex align-items-center gap-2',
    isActive ? 'active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <NavLinkButton type={type} className={mergedClassName} {...rest}>
      {children}
    </NavLinkButton>
  );
}
