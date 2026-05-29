import { useMemo } from 'react';
import { useBulkBtn } from 'components/ui';
import { useModal } from 'contexts/ModalContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { RpkiCaService } from 'services/rpkiCaService';
import type { RpkiRoaAnalysisRow, RpkiRoaRow } from './types';

interface RpkiCaRef {
  id: number;
  nome: string;
}

interface UseRpkiRoaListBulkActionsParams {
  cas: RpkiCaRef[];
  roas: RpkiRoaRow[];
  setRoas: React.Dispatch<React.SetStateAction<RpkiRoaRow[]>>;
  onCreate: () => void;
  onEdit: (roaId: number | string) => void;
  onOpenAnalysis: (params: {
    caNome: string;
    caId: number;
    rows: RpkiRoaAnalysisRow[];
  }) => void;
}

export function useRpkiRoaListBulkActions({
  cas,
  roas,
  setRoas,
  onCreate,
  onEdit,
  onOpenAnalysis,
}: UseRpkiRoaListBulkActionsParams) {
  const bulkBtn = useBulkBtn();
  const { openModal } = useModal();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const bulkActions = useMemo(
    () => [
      {
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        requiresSelection: false,
        action: (_selectedItems: RpkiRoaRow[]) => {
          onCreate();
        },
      },
      {
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        disabled: false,
        action: (selectedItems: RpkiRoaRow[]) => {
          const selected = selectedItems[0];
          if (!selected) return;
          onEdit(selected.id);
        },
      },
      {
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: false,
        action: (selectedItems: RpkiRoaRow[]) => {
          const selected = selectedItems[0];
          if (!selected) return;

          const confirmed = window.confirm(
            'Deseja deletar este ROA permanentemente? Esta ação não pode ser desfeita.'
          );
          if (!confirmed) return;

          const caId = Number(selected.ca_id ?? 0);
          const roaId = Number(selected.id);
          if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(roaId) || roaId <= 0) return;
          RpkiCaService.deleteRoa({ caId, roaId })
            .then(() => {
              setRoas((prev) => prev.filter((r) => r.id !== selected.id));
              success('ROA excluído com sucesso');
            })
            .catch((err) => {
              showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ROA_DELETE_ERROR);
            });
        },
      },
      {
        label: 'Revogar',
        variant: 'primary' as const,
        disabled: false,
        action: (selectedItems: RpkiRoaRow[]) => {
          const selected = selectedItems[0];
          if (!selected) return;

          const confirmed = window.confirm('Tem certeza que deseja revogar este ROA?');
          if (!confirmed) return;

          const caId = Number(selected.ca_id ?? 0);
          const roaId = Number(selected.id);
          if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(roaId) || roaId <= 0) return;
          RpkiCaService.revokeRoa({ caId, roaId })
            .then((updated) => {
              setRoas((prev) =>
                prev.map((r) =>
                  r.id === selected.id
                    ? { ...r, status: updated.status, revoked_at: updated.revoked_at ?? undefined }
                    : r
                )
              );
              success('ROA revogada com sucesso');
            })
            .catch((err) => {
              showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ROA_REVOKE_ERROR);
            });
        },
      },
      {
        label: 'Analisar ROAs',
        variant: 'primary' as const,
        requiresSelection: false,
        disabled: false,
        action: (selectedItems: RpkiRoaRow[]) => {
          const selected = selectedItems[0];
          const uniqueCaIds = Array.from(
            new Set(
              roas
                .map((row) => Number(row.ca_id ?? 0))
                .filter((id) => Number.isFinite(id) && id > 0)
            )
          );
          const availableCaIds = Array.from(
            new Set(
              cas
                .map((ca) => Number(ca.id))
                .filter((id) => Number.isFinite(id) && id > 0)
            )
          );

          const caIdsForGlobal = uniqueCaIds.length > 0 ? uniqueCaIds : availableCaIds;

          if (caIdsForGlobal.length === 0) {
            window.alert('Nenhuma CA encontrada para análise.');
            return;
          }

          const selectedCaId = Number(selected?.ca_id ?? 0);
          const targetCaIds =
            Number.isFinite(selectedCaId) && selectedCaId > 0 ? [selectedCaId] : caIdsForGlobal;

          Promise.all(
            targetCaIds.map((caId) => RpkiCaService.analyzeRoas(caId).then((analysis) => ({ caId, analysis })))
          )
            .then((results) => {
              const mergedRows = results.flatMap((item) =>
                item.analysis.rows.map((row) => ({
                  ...row,
                  selectable: Boolean(
                    row.selectable ||
                      row.status === 'not_found' ||
                      row.status === 'inconsistent' ||
                      row.status === 'expired'
                  ),
                }))
              );
              const effectiveCaId = targetCaIds.length === 1 ? targetCaIds[0] : 0;
              const caLabel =
                effectiveCaId > 0
                  ? (roas.find((row) => Number(row.ca_id) === effectiveCaId)?.ca_nome ?? `#${effectiveCaId}`)
                  : `Múltiplas CAs (${targetCaIds.length})`;
              onOpenAnalysis({
                caNome: caLabel,
                caId: effectiveCaId,
                rows: mergedRows,
              });
            })
            .catch((err) => {
              showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ROA_ANALYZE_ERROR);
            });
        },
      },
      {
        label: 'Validar rota',
        variant: 'primary' as const,
        requiresSelection: true,
        disabled: false,
        action: (selectedItems: RpkiRoaRow[]) => {
          const selected = selectedItems[0];
          if (!selected) return;
          const pref = String(selected.prefix ?? '').trim();
          if (!pref) {
            window.alert('O ROA selecionado não tem prefixo para validar.');
            return;
          }
          const asnRaw = String(selected.asn ?? '').trim();
          const asn = asnRaw.replace(/^AS/i, '').trim();
          openModal('rpki-validar-rota', { initialPrefix: pref, initialAsn: asn });
        },
      },
    ],
    [cas, onCreate, onEdit, onOpenAnalysis, openModal, roas, setRoas, showApiError, success, bulkBtn]
  );

  return { bulkActions };
}
