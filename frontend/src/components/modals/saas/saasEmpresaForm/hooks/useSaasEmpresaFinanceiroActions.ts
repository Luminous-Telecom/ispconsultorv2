import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBulkBtn } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { saasTituloService, type SaasTitulo } from 'services/saas/saasCrudService';
import type { BulkAction } from 'components/tables/types';
import { formatCurrency } from 'utils/formatters';
import type { SaasEmpresaTranslateFn } from '../types';

interface UseSaasEmpresaFinanceiroActionsParams {
  empresaId: number | null;
  titulosParaFiltro: SaasTitulo[];
  refetchTitulos: () => void;
  setShowTituloCreate: (show: boolean) => void;
  setShowReceberModal: (show: boolean) => void;
  setTituloReceber: (titulo: SaasTitulo | null) => void;
  t: SaasEmpresaTranslateFn;
}

export function useSaasEmpresaFinanceiroActions({
  empresaId,
  titulosParaFiltro,
  refetchTitulos,
  setShowTituloCreate,
  setShowReceberModal,
  setTituloReceber,
  t,
}: UseSaasEmpresaFinanceiroActionsParams) {
  const bulkBtn = useBulkBtn();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const [selectedTitulos, setSelectedTitulos] = useState<SaasTitulo[]>([]);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const handleDeleteTitulo = useCallback(async (sel: SaasTitulo[]) => {
    const item = sel[0];
    if (!item || !window.confirm(t('messages.confirmDelete'))) return;
    try {
      await saasTituloService.delete(item.id);
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      refetchTitulos();
      success(t('messages.success'));
    } catch {
      showApiError(t('messages.error'));
    }
  }, [queryClient, empresaId, refetchTitulos, success, showApiError, t]);

  const handleCancelarTitulo = useCallback(async (sel: SaasTitulo[]) => {
    const items = sel?.length ? sel : selectedTitulos;
    if (items.length === 0) return;
    const msg = items.length === 1 ? t('messages.confirmCancelTitle') : t('messages.confirmCancelTitles', { count: items.length });
    if (!window.confirm(msg)) return;
    try {
      let okCount = 0;
      for (const item of items) {
        try {
          await saasTituloService.update(item.id, { status: 'cancelado' } as Partial<SaasTitulo>);
          okCount++;
        } catch {
          // continua
        }
      }
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      refetchTitulos();
      setSelectedTitulos([]);
      if (okCount > 0) success(okCount === 1 ? t('financial.titleCanceled') : `${okCount} ${t('financial.titlesCanceled')}`);
    } catch {
      showApiError(t('financial.errorCanceling'));
    }
  }, [selectedTitulos, queryClient, empresaId, refetchTitulos, success, showApiError, t]);

  const handleEstornarTitulo = useCallback(async (sel: SaasTitulo[]) => {
    const item = sel?.length ? sel[0] : selectedTitulos[0];
    if (!item) return;
    const statusPago = item.status === 'pago' || item.status === 'pago_atraso' || item.status === 'parcial';
    if (!statusPago) {
      showApiError(t('financial.canOnlyReversePaid'));
      return;
    }
    const msg = `${t('financial.titleWillReturnPending')}\n\n${t('document.title')} ${item.numero_titulo || item.id}\n${t('summary.value')} ${formatCurrency(Number(item.valor))}`;
    if (!window.confirm(msg)) return;
    try {
      await saasTituloService.update(item.id, { status: 'pendente', pago: false, data_pagamento: null, valor_pago: null } as Partial<SaasTitulo>);
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      refetchTitulos();
      setSelectedTitulos([]);
      success(t('financial.titleReversed'));
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_REVERSE_ERROR);
    }
  }, [selectedTitulos, queryClient, empresaId, refetchTitulos, success, showApiError, t]);

  const handleImprimirSelecionados = useCallback(async (sel?: SaasTitulo[]) => {
    const items = sel?.length ? sel : selectedTitulos;
    if (items.length === 0) {
      showApiError(t('messages.noTitleSelected'));
      return;
    }
    const emAberto = items.filter((titulo) => titulo.status === 'pendente' || titulo.status === 'vencido');
    if (emAberto.length === 0) {
      showApiError(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    try {
      const ids = emAberto.map((item) => item.id);
      const pdfBlob = await saasTituloService.gerarPdfBoletosMultiplos(ids);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintSelected'));
    } catch {
      showApiError(t('messages.errorPrintSelected'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedTitulos, showApiError, success, openPrintModal, t]);

  const handleImprimirTodosEmAberto = useCallback(async () => {
    const emAberto = titulosParaFiltro.filter((titulo) => titulo.status === 'pendente' || titulo.status === 'vencido');
    if (emAberto.length === 0) {
      showApiError(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    try {
      const ids = emAberto.map((item) => item.id);
      const pdfBlob = await saasTituloService.gerarPdfBoletosMultiplos(ids);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintOpen'));
    } catch {
      showApiError(t('messages.errorPrintOpen'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [titulosParaFiltro, showApiError, success, openPrintModal, t]);

  const titulosBulkActions = useMemo((): BulkAction<SaasTitulo>[] => [
    { key: 'novo', label: bulkBtn.novo.label, variant: bulkBtn.novo.variant, requiresSelection: false, onClick: () => setShowTituloCreate(true) },
    { key: 'excluir', label: bulkBtn.deletar.label, variant: bulkBtn.deletar.variant, disabled: (s: SaasTitulo[]) => s.length === 0, onClick: handleDeleteTitulo },
    {
      key: 'receber',
      label: bulkBtn.receber.label,
      variant: bulkBtn.receber.variant,
      disabled: (s: SaasTitulo[]) => {
        const items = s.length > 0 ? s : selectedTitulos;
        const emAberto = items.filter((i) => !i.pago && (i as { status?: string }).status !== 'cancelado');
        return emAberto.length !== 1;
      },
      onClick: (sel?: SaasTitulo[]) => {
        const items = sel && sel.length > 0 ? sel : selectedTitulos;
        const emAberto = items.filter((i) => !i.pago && (i as { status?: string }).status !== 'cancelado');
        if (emAberto.length === 1) {
          setTituloReceber(emAberto[0]);
          setShowReceberModal(true);
        }
      },
    },
    {
      key: 'cancelar',
      label: bulkBtn.cancelar.label,
      variant: bulkBtn.cancelar.variant,
      disabled: (s: SaasTitulo[]) => {
        const items = s.length > 0 ? s : selectedTitulos;
        return items.length === 0 || items.every((i) => i.status === 'pago' || i.status === 'cancelado');
      },
      onClick: handleCancelarTitulo,
    },
    {
      key: 'estornar',
      label: bulkBtn.estornar.label,
      variant: bulkBtn.estornar.variant,
      disabled: (s: SaasTitulo[]) => {
        const items = s.length > 0 ? s : selectedTitulos;
        const statusPago = (st: string) => st === 'pago' || st === 'pago_atraso' || st === 'parcial';
        return items.length === 0 || items.every((i) => !statusPago(i.status || ''));
      },
      onClick: handleEstornarTitulo,
    },
    {
      key: 'imprimir',
      label: bulkBtn.imprimir.label,
      variant: bulkBtn.imprimir.variant,
      dropdown: [
        { label: t('other.selected'), action: (sel?: SaasTitulo[]) => handleImprimirSelecionados(sel) },
        { label: t('other.open'), action: () => handleImprimirTodosEmAberto() },
      ],
    },
  ], [selectedTitulos, handleCancelarTitulo, handleDeleteTitulo, handleEstornarTitulo, handleImprimirSelecionados, handleImprimirTodosEmAberto, bulkBtn, t, setShowTituloCreate, setTituloReceber, setShowReceberModal]);

  const handleTituloRowDoubleClick = useCallback((i: SaasTitulo) => {
    if (!i.pago && (i as { status?: string }).status !== 'cancelado') {
      setTituloReceber(i);
      setShowReceberModal(true);
    }
  }, [setTituloReceber, setShowReceberModal]);

  const resetSelectedTitulos = useCallback(() => setSelectedTitulos([]), []);

  return {
    selectedTitulos,
    setSelectedTitulos,
    showImprimirModal,
    setShowImprimirModal,
    pdfUrl,
    isGeneratingPdf,
    clearPdfUrl,
    titulosBulkActions,
    handleTituloRowDoubleClick,
    resetSelectedTitulos,
  };
}
