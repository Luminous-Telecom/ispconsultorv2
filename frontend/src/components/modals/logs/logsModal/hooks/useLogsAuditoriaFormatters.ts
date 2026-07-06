import { useCallback } from 'react';
import { useI18n } from 'contexts/I18nContext';
import type { BadgeVariant } from 'components/ui/Badge';
import { formatDateTime } from 'utils/formatters';

export function useLogsAuditoriaFormatters() {
  const { t } = useI18n();

  const formatTimestamp = useCallback((ts: string) => {
    try {
      return formatDateTime(new Date(ts));
    } catch {
      return ts;
    }
  }, []);

  const formatAcao = useCallback(
    (acao: string) => {
      const map: Record<string, string> = {
        create: t('audit.actions.create'),
        update: t('audit.actions.update'),
        delete: t('audit.actions.delete'),
        login: t('audit.actions.login'),
        logout: t('audit.actions.logout'),
        export: t('audit.actions.export'),
        import: t('audit.actions.import'),
        executar: t('audit.actions.executar'),
      };
      return map[acao] || acao;
    },
    [t]
  );

  const getAcaoBadgeVariant = useCallback((acao: string): BadgeVariant => {
    const map: Record<string, BadgeVariant> = {
      create: 'success',
      update: 'primary',
      delete: 'danger',
      login: 'info',
      logout: 'secondary',
      export: 'warning',
      import: 'warning',
      executar: 'info',
    };
    return map[acao] || 'secondary';
  }, []);

  return { formatTimestamp, formatAcao, getAcaoBadgeVariant };
}
