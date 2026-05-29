import { useCallback, useState } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { RpkiCaService } from 'services/rpkiCaService';
import type { RpkiRoaAnalysisRow } from './types';

export function useRpkiRoaListAnalysisState() {
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisCaNome, setAnalysisCaNome] = useState('');
  const [analysisCaId, setAnalysisCaId] = useState<number>(0);
  const [analysisRows, setAnalysisRows] = useState<RpkiRoaAnalysisRow[]>([]);

  const handleOpenAnalysis = useCallback(
    (params: { caNome: string; caId: number; rows: RpkiRoaAnalysisRow[] }) => {
      setAnalysisCaNome(params.caNome);
      setAnalysisCaId(params.caId);
      setAnalysisRows(params.rows);
      setShowAnalysisModal(true);
    },
    []
  );

  const handleAnalysisClose = useCallback(() => {
    setShowAnalysisModal(false);
  }, []);

  return {
    showAnalysisModal,
    analysisCaNome,
    analysisCaId,
    analysisRows,
    handleOpenAnalysis,
    handleAnalysisClose,
  };
}

interface UseRpkiRoaListAnalysisConfirmParams {
  analysisCaId: number;
  reloadRoas: () => Promise<void>;
  onClose: () => void;
}

export function useRpkiRoaListAnalysisConfirm({
  analysisCaId,
  reloadRoas,
  onClose,
}: UseRpkiRoaListAnalysisConfirmParams) {
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const handleAnalysisConfirm = useCallback(
    (selectedRows: RpkiRoaAnalysisRow[]) => {
      const rowsToRevoke = selectedRows.filter(
        (row) =>
          row.selectable &&
          row.roa_id > 0 &&
          (row.status === 'not_found' || row.status === 'inconsistent' || row.status === 'expired')
      );
      const rowsToCreate = selectedRows.filter((row) => row.selectable && row.roa_id === 0);
      const suggestionsToCreate = rowsToCreate.map((row) => ({
        prefix: row.prefix,
        asn: row.asn,
        max_length: row.max_length,
      }));

      if (analysisCaId <= 0) {
        onClose();
        success(`Análise concluída. ${selectedRows.length} ROA(s) selecionada(s).`);
        return;
      }

      Promise.resolve()
        .then(async () => {
          let created = 0;
          if (suggestionsToCreate.length > 0) {
            const result = await RpkiCaService.applyRoaSuggestions({
              caId: analysisCaId,
              suggestions: suggestionsToCreate,
            });
            created = result.created;
          }

          let revoked = 0;
          for (const row of rowsToRevoke) {
            await RpkiCaService.revokeRoa({ caId: analysisCaId, roaId: row.roa_id });
            revoked += 1;
          }

          success(`${created} ROA(s) criada(s) e ${revoked} ROA(s) revogada(s) automaticamente.`);
        })
        .then(() => reloadRoas())
        .then(() => {
          onClose();
        })
        .catch((err) => {
          showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_ROA_SUGGEST_ERROR);
        });
    },
    [analysisCaId, onClose, reloadRoas, showApiError, success]
  );

  return { handleAnalysisConfirm };
}
