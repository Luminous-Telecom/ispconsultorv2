import { useMemo } from 'react';
import { useI18n } from 'contexts/I18nContext';
import {
  SYSTEM_BUTTON_CONFIG,
  getSystemButtonBulkProps,
  type BulkBtnVariant,
  type SystemButtonAction,
} from './config';

export type BulkBtnProps = { label: string; variant: BulkBtnVariant };

/** Props de bulk por ação — `bulkBtn.cancelar`, `bulkBtn.novo`, etc. */
export function useBulkBtn(): Record<SystemButtonAction, BulkBtnProps> {
  const { t } = useI18n();

  return useMemo(() => {
    const actions = Object.keys(SYSTEM_BUTTON_CONFIG) as SystemButtonAction[];
    return Object.fromEntries(
      actions.map((action) => [action, getSystemButtonBulkProps(action, t)])
    ) as Record<SystemButtonAction, BulkBtnProps>;
  }, [t]);
}
