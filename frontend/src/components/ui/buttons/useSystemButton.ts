import { useI18n } from 'contexts/I18nContext';
import type { SystemButtonAction } from './config';
import { SYSTEM_BUTTON_CONFIG, getBulkActionVariant } from './config';

export function useSystemButton(action: SystemButtonAction, entity?: string) {
  const { t } = useI18n();
  const config = SYSTEM_BUTTON_CONFIG[action];

  const label =
    action === 'novo' && entity
      ? t('buttons.createEntity', { entity })
      : t(config.i18nKey!);

  return {
    label,
    variant: getBulkActionVariant(action),
  };
}
