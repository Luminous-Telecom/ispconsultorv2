import { useState, useCallback } from 'react';
import { Titulo } from 'types';
import { TituloService } from 'services/tituloService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useI18n } from 'contexts/I18nContext';
import { TituloItemUnion } from './contasReceberListTypes';

interface UseContasReceberPrintActionsParams {
  selectedItems: TituloItemUnion[];
  titulos: TituloItemUnion[];
}

export function useContasReceberPrintActions({
  selectedItems,
  titulos,
}: UseContasReceberPrintActionsParams) {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showImprimirModal, setShowImprimirModal] = useState(false);

  const clearPdfUrl = useCallback(() => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  const openPrintModal = useCallback(() => {
    clearPdfUrl();
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
  }, [clearPdfUrl]);

  const getItensComNFSe = useCallback((items: Titulo[]) => {
    return items.filter((item) => item.nfse_status === 'emitida' && item.nfse_numero);
  }, []);

  const resolveItems = useCallback(
    (items?: TituloItemUnion[]) => (items?.length ? items : selectedItems),
    [selectedItems]
  );

  const handleImprimirSelecionados = useCallback(async (items?: TituloItemUnion[]) => {
    const toPrint = resolveItems(items);
    if (toPrint.length === 0) {
      showApiError(t('messages.noTitleSelected'));
      return;
    }
    openPrintModal();

    try {
      const ids = toPrint.map((item) => item.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);

      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);

      success(t('messages.successPrintSelected'));
    } catch {
      showApiError(t('messages.errorPrintSelected'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [resolveItems, showApiError, success, openPrintModal, t]);

  const handleImprimirRecibos = useCallback(async (items?: TituloItemUnion[]) => {
    const toPrint = resolveItems(items);
    if (toPrint.length === 0) {
      showApiError(t('messages.noTitleSelected'));
      return;
    }

    const itensPagos = toPrint.filter(
      (item) => item.status === 'pago' || item.status === 'pago_atraso'
    );

    if (itensPagos.length === 0) {
      showApiError(t('messages.noPaidTitleSelected'));
      return;
    }

    openPrintModal();

    try {
      const ids = itensPagos.map((item) => item.id).join(',');
      const axios = (await import('axios')).default;

      const response = await axios.get(`/api/recibo/web/multiplos?ids=${ids}`, {
        responseType: 'blob',
        timeout: 120000,
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(response.data);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.receiptsGenerated', { count: itensPagos.length }));
    } catch {
      showApiError(t('messages.errorGeneratingReceipts'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [resolveItems, showApiError, success, openPrintModal, t]);

  const handleImprimirTodosEmAberto = useCallback(async () => {
    if (!titulos || titulos.length === 0) {
      showApiError(t('messages.noTitlesFound'));
      return;
    }
    const titulosEmAberto = (titulos as TituloItemUnion[]).filter(
      (titulo) => titulo.status === 'pendente' || titulo.status === 'vencido'
    );
    if (titulosEmAberto.length === 0) {
      showApiError(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();

    try {
      const ids = titulosEmAberto.map((titulo: TituloItemUnion) => titulo.id);
      const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);

      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);

      success(t('messages.successPrintOpen'));
    } catch {
      showApiError(t('messages.errorPrintOpen'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [titulos, showApiError, success, openPrintModal, t]);

  const handleImprimirNFSe = useCallback(
    async (items: Titulo[]) => {
      if (!items || items.length === 0) {
        showApiError(t('messages.noNFSeTitlesSelected'));
        return;
      }
      const itensComNFSe = getItensComNFSe(items);
      if (itensComNFSe.length === 0) {
        showApiError(t('messages.noNFSeTitlesSelected'));
        return;
      }

      openPrintModal();

      try {
        const ids = itensComNFSe.map((item) => item.id).join(',');
        const { defaultApiClient } = await import('services/core/ApiClient');

        const response = await defaultApiClient.get(
          `/notas-fiscais/nfse/multiplos?ids=${ids}&print=true`,
          { responseType: 'blob' }
        );

        if (response.data instanceof Blob) {
          const url = window.URL.createObjectURL(response.data);
          setPdfUrl(url);
          setIsGeneratingPdf(false);
          success(t('messages.nfseGenerated'));
        } else {
          throw new Error(t('messages.error'));
        }
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.NFSE_GENERATE_ERROR);
        setShowImprimirModal(false);
        setIsGeneratingPdf(false);
      }
    },
    [showApiError, success, getItensComNFSe, openPrintModal, t]
  );

  return {
    pdfUrl,
    isGeneratingPdf,
    showImprimirModal,
    setShowImprimirModal,
    clearPdfUrl,
    openPrintModal,
    getItensComNFSe,
    handleImprimirSelecionados,
    handleImprimirRecibos,
    handleImprimirTodosEmAberto,
    handleImprimirNFSe,
  };
}
