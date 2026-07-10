import { useCallback, useState } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { useI18n } from 'contexts/I18nContext';
import { TituloService } from 'services/tituloService';
import { Titulo } from 'types';

export function useContratoTitulosPrint() {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrlLocal, setPdfUrlLocal] = useState<string | null>(null);
  const [isGeneratingPdfLocal, setIsGeneratingPdfLocal] = useState(false);

  const revokePdfUrl = useCallback((url: string | null) => {
    if (url) window.URL.revokeObjectURL(url);
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPdfUrlLocal((current) => {
      revokePdfUrl(current);
      return null;
    });
    setIsGeneratingPdfLocal(false);
  }, [revokePdfUrl]);

  const generatePdfForIds = useCallback(
    async (ids: number[], successMessageKey: 'messages.successPrintSelected' | 'messages.successPrintOpen') => {
      setShowPreview(true);
      setIsGeneratingPdfLocal(true);
      setPdfUrlLocal((current) => {
        revokePdfUrl(current);
        return null;
      });

      try {
        const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrlLocal(url);
        setIsGeneratingPdfLocal(false);
        success(t(successMessageKey));
      } catch {
        const errorKey =
          successMessageKey === 'messages.successPrintSelected'
            ? 'messages.errorPrintSelected'
            : 'messages.errorPrintOpen';
        showApiError(t(errorKey));
        setShowPreview(false);
        setIsGeneratingPdfLocal(false);
      }
    },
    [revokePdfUrl, showApiError, success, t]
  );

  const handleImprimirSelecionados = useCallback(
    async (selectedItems: Titulo[]) => {
      if (selectedItems.length === 0) {
        showApiError(t('messages.noTitleSelected'));
        return;
      }
      await generatePdfForIds(
        selectedItems.map((item) => item.id),
        'messages.successPrintSelected'
      );
    },
    [generatePdfForIds, showApiError, t]
  );

  const handleImprimirTodosEmAberto = useCallback(
    async (titulos: Titulo[] | undefined) => {
      if (!titulos) {
        success(t('messages.noData'));
        return;
      }
      const titulosEmAberto = titulos.filter(
        (titulo) => titulo.status === 'pendente' || titulo.status === 'vencido'
      );
      if (titulosEmAberto.length === 0) {
        success(t('messages.noData'));
        return;
      }
      await generatePdfForIds(
        titulosEmAberto.map((titulo) => titulo.id),
        'messages.successPrintOpen'
      );
    },
    [generatePdfForIds, success, t]
  );

  return {
    showPreview,
    setShowPreview,
    pdfUrlLocal,
    setPdfUrlLocal,
    isGeneratingPdfLocal,
    setIsGeneratingPdfLocal,
    closePreview,
    handleImprimirSelecionados,
    handleImprimirTodosEmAberto,
  };
}
