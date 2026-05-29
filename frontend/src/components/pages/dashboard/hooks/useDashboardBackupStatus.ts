import { useCallback, useMemo } from 'react';
import { DashboardService } from 'services/dashboardService';
import type { BackupStatusKey } from 'components/charts';
import type { ModalType } from 'contexts/ModalContext';
import type { DashboardData } from 'services/dashboardService';
import type { TranslationKeys } from 'contexts/I18nContext';

interface UseDashboardBackupStatusParams {
  dashboardData: DashboardData | undefined;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  openModal: (modalName: ModalType, data?: Record<string, unknown>) => void;
}

export function useDashboardBackupStatus({
  dashboardData,
  t,
  openModal,
}: UseDashboardBackupStatusParams) {
  const backupStatusLegendLabels = useMemo(
    () => ({
      falha: t('dashboard.backupStatusLegendFalha'),
      sucesso: t('dashboard.backupStatusLegendSucesso'),
      somente_local: t('dashboard.backupStatusLegendSomenteLocal'),
      falha_envio: t('dashboard.backupStatusLegendFalhaEnvio'),
      verificado: t('dashboard.backupStatusLegendVerificado'),
    }),
    [t]
  );

  const backupStatusGraficoUltimos7Dias = useMemo(
    () => dashboardData?.backupStatusGrafico ?? [],
    [dashboardData?.backupStatusGrafico]
  );

  const backupStatusPeriodoTemEventos = useMemo(
    () =>
      backupStatusGraficoUltimos7Dias.some(
        (d) => d.falha + d.sucesso + d.somente_local + d.falha_envio + d.verificado > 0
      ),
    [backupStatusGraficoUltimos7Dias]
  );

  const backupStatusDashboardSummary = useMemo(() => {
    let sucesso = 0;
    let falha = 0;
    for (const d of backupStatusGraficoUltimos7Dias) {
      sucesso += d.sucesso;
      falha += d.falha;
    }
    const total = sucesso + falha;
    const failureBadgeText =
      falha > 0
        ? falha === 1
          ? t('dashboard.backupStatusFailureBadgeOne', { count: falha })
          : t('dashboard.backupStatusFailureBadgeMany', { count: falha })
        : null;
    return { total, sucesso, falha, failureBadgeText };
  }, [backupStatusGraficoUltimos7Dias, t]);

  const handleBackupStatusSegmentClick = useCallback(
    async (dataISO: string, status: BackupStatusKey) => {
      const { items } = await DashboardService.getBackupStatusDetalhe(dataISO, status);
      openModal('dashboard-backup-equipamentos', {
        items: items.map((row) => ({
          id: String(row.id),
          deviceId: row.deviceId,
          deviceName: row.deviceName,
          fileName: row.fileName,
          sizeBytes: row.sizeBytes,
          startedAt: row.startedAt,
          finishedAt: row.finishedAt,
          detail: row.detail,
        })),
      });
    },
    [openModal]
  );

  return {
    backupStatusLegendLabels,
    backupStatusGraficoUltimos7Dias,
    backupStatusPeriodoTemEventos,
    backupStatusDashboardSummary,
    handleBackupStatusSegmentClick,
  };
}
