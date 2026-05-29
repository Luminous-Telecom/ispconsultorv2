import { useMemo } from 'react';
import { QueryClient, UseMutationResult } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { useBulkBtn } from 'components/ui';
import ModeloTermoService from 'services/modeloTermoService';
import { TermoContrato } from 'services/termoContratoService';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { BulkAction, TermoFormData } from './types';

export interface UseContratoTermosBulkActionsParams {
  isEditMode: boolean;
  internalContratoId: number | null;
  selectedTermosItems: TermoContrato[];
  setEditingTermo: (termo: TermoContrato | null) => void;
  setTermoFormData: React.Dispatch<React.SetStateAction<TermoFormData>>;
  setShowTermoModal: (show: boolean) => void;
  setTermoParaAssinatura: (termo: TermoContrato | null) => void;
  setShowEnviarAssinaturaModal: (show: boolean) => void;
  deleteTermoMutation: UseMutationResult<unknown, Error, number, unknown>;
  queryClient: QueryClient;
  setShowPreview: (show: boolean) => void;
  setIsGeneratingPdfLocal: (value: boolean) => void;
  pdfUrlLocal: string | null;
  setPdfUrlLocal: (url: string | null) => void;
}

export function useContratoTermosBulkActions({
  isEditMode,
  internalContratoId,
  selectedTermosItems,
  setEditingTermo,
  setTermoFormData,
  setShowTermoModal,
  setTermoParaAssinatura,
  setShowEnviarAssinaturaModal,
  deleteTermoMutation,
  queryClient,
  setShowPreview,
  setIsGeneratingPdfLocal,
  pdfUrlLocal,
  setPdfUrlLocal,
}: UseContratoTermosBulkActionsParams) {
  const { t } = useI18n();
  const bulkBtn = useBulkBtn();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const termosBulkActions: BulkAction<TermoContrato>[] = useMemo(
    () =>
      isEditMode
        ? [
            {
              label: bulkBtn.novo.label,
              variant: bulkBtn.novo.variant,
              action: () => {
                setEditingTermo(null);
                setTermoFormData({
                  assinado: 'NAO',
                  termoCadastradoId: 0,
                });
                setShowTermoModal(true);
              },
            },
            {
              label: bulkBtn.editar.label,
              variant: bulkBtn.editar.variant,
              action: (selectedItems: TermoContrato[]) => {
                const termo =
                  selectedItems && selectedItems.length > 0
                    ? selectedItems[0]
                    : selectedTermosItems.length > 0
                      ? selectedTermosItems[0]
                      : null;
                if (termo) {
                  setEditingTermo(termo);
                  setTermoFormData({
                    assinado: termo.assinado,
                    termoCadastradoId: termo.modelo_documento_id || 0,
                  });
                  setShowTermoModal(true);
                }
              },
              disabled: (selectedItems: TermoContrato[]) =>
                selectedItems.length === 0 && selectedTermosItems.length === 0,
            },
            {
              label: bulkBtn.deletar.label,
              variant: bulkBtn.deletar.variant,
              action: async (selectedItems: TermoContrato[]) => {
                const items =
                  selectedItems && selectedItems.length > 0 ? selectedItems : selectedTermosItems;
                if (items.length === 0) return;

                const confirmMessage =
                  items.length === 1
                    ? t('messages.confirmDelete')
                    : `${t('messages.confirmDelete')} (${items.length} ${t('tabs.terms').toLowerCase()})`;
                const confirmed = window.confirm(confirmMessage);
                if (confirmed) {
                  try {
                    let successCount = 0;
                    for (const item of items) {
                      await deleteTermoMutation.mutateAsync(item.id);
                      successCount++;
                    }
                    if (successCount === 1) {
                      success(t('messages.successDeleteTerm'));
                    } else {
                      success(t('messages.successDeleteTerms'));
                    }
                    queryClient.invalidateQueries({
                      queryKey: ['termos-contrato', internalContratoId],
                    });
                  } catch {
                    if (items.length === 1) {
                      showApiError(t('messages.errorDeleteTerm'));
                    } else {
                      showApiError(t('messages.errorDeleteTerms'));
                    }
                  }
                }
              },
              disabled: (selectedItems: TermoContrato[]) =>
                selectedItems.length === 0 && selectedTermosItems.length === 0,
            },
            {
              label: bulkBtn.imprimir.label,
              variant: bulkBtn.imprimir.variant,
              disabled: () => selectedTermosItems.length === 0,
              action: async () => {
                if (selectedTermosItems.length > 0 && internalContratoId) {
                  const termo = selectedTermosItems[0];
                  if (termo.modelo_documento_id && internalContratoId) {
                    setShowPreview(true);
                    setIsGeneratingPdfLocal(true);

                    if (pdfUrlLocal) {
                      window.URL.revokeObjectURL(pdfUrlLocal);
                      setPdfUrlLocal(null);
                    }

                    try {
                      const blob = await ModeloTermoService.generatePdfWithContrato(
                        termo.modelo_documento_id,
                        internalContratoId
                      );
                      const url = window.URL.createObjectURL(blob);
                      setPdfUrlLocal(url);
                      setIsGeneratingPdfLocal(false);
                    } catch (err) {
                      showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_PRINT_ERROR);
                      setShowPreview(false);
                      setIsGeneratingPdfLocal(false);
                    }
                  }
                }
              },
            },
            {
              label: t('modal.sendSignature'),
              disabled: (selectedItems: TermoContrato[]) => {
                const items =
                  selectedItems && selectedItems.length > 0 ? selectedItems : selectedTermosItems;
                return items.length === 0 || items[0]?.assinado === 'SIM';
              },
              action: (selectedItems: TermoContrato[]) => {
                const items =
                  selectedItems && selectedItems.length > 0 ? selectedItems : selectedTermosItems;
                if (items.length > 0) {
                  const termo = items[0];
                  setTermoParaAssinatura(termo);
                  setShowEnviarAssinaturaModal(true);
                }
              },
            },
          ]
        : [],
    [
      isEditMode,
      internalContratoId,
      selectedTermosItems,
      setEditingTermo,
      setTermoFormData,
      setShowTermoModal,
      setTermoParaAssinatura,
      setShowEnviarAssinaturaModal,
      deleteTermoMutation,
      queryClient,
      setShowPreview,
      setIsGeneratingPdfLocal,
      pdfUrlLocal,
      setPdfUrlLocal,
      t,
      bulkBtn,
      success,
      showApiError,
    ]
  );

  return { termosBulkActions };
}
