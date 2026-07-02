import React from 'react';
import { renderSystemButton } from './renderButton';

export interface PaginationNavButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  children?: React.ReactNode;
}

/** Botão de paginação (Bootstrap page-link). */
export function PaginationNavButton({
  label,
  children,
  className = 'page-link',
  type = 'button',
  ...rest
}: PaginationNavButtonProps): React.ReactElement {
  return renderSystemButton({
    label,
    variant: 'unstyled',
    type,
    className,
    children,
    ...rest,
  });
}
