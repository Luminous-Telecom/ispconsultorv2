import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import type { SystemButtonAction } from './config';
import { SYSTEM_BUTTON_CONFIG } from './config';
import { renderSystemButton } from './renderButton';
import type { SystemButtonProps } from './types';

export type { SystemButtonProps } from './types';

function resolveLabel(
  action: SystemButtonAction,
  t: ReturnType<typeof useI18n>['t'],
  options: { label?: string; i18nKey?: SystemButtonProps['i18nKey']; entity?: string }
): string {
  if (options.label) return options.label;
  const key = options.i18nKey ?? SYSTEM_BUTTON_CONFIG[action].i18nKey;
  if (action === 'novo' && options.entity) {
    return t('buttons.createEntity', { entity: options.entity });
  }
  return t(key);
}

const SystemButton: React.FC<SystemButtonProps> = ({
  action,
  entity,
  label: labelOverride,
  i18nKey,
  iconOnly = false,
  isPending,
  isLoading,
  size,
  variant,
  type,
  className = '',
  ...rest
}) => {
  const { t } = useI18n();
  const config = SYSTEM_BUTTON_CONFIG[action];
  const label = resolveLabel(action, t, { label: labelOverride, i18nKey, entity });
  const mergedClassName = [config.className, className].filter(Boolean).join(' ');

  return renderSystemButton({
    label,
    variant: variant ?? config.variant,
    size: size ?? config.defaultSize,
    type: type ?? config.defaultType ?? 'button',
    isPending,
    isLoading,
    className: mergedClassName || undefined,
    iconOnly: iconOnly && action === 'copiar',
    iconClassName: iconOnly && action === 'copiar' ? 'bi bi-clipboard' : undefined,
    ...rest,
  });
};

export default SystemButton;
