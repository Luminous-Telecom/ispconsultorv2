import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { renderSystemButton } from './renderButton';

export interface CloseIconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  /** Sobrescreve o aria-label padrão (i18n ui.close). */
  label?: string;
}

/** Botão fechar modal (Bootstrap btn-close). */
export function CloseIconButton({
  label,
  className = 'btn-close',
  type = 'button',
  ...rest
}: CloseIconButtonProps): React.ReactElement {
  const { t } = useI18n();
  const resolvedLabel = label ?? t('ui.close');

  return renderSystemButton({
    label: resolvedLabel,
    variant: 'unstyled',
    type,
    className,
    iconOnly: true,
    children: null,
    'aria-label': resolvedLabel,
    ...rest,
  });
}
