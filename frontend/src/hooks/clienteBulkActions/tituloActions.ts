import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TituloService } from '../../services/tituloService';
import { useNotificationContext } from '../../components/notifications/NotificationProvider';
import { useApiError } from '../useApiError';
import { extractApiErrorMessageSync } from '../../utils/apiErrorHelper';
import { CONTEXT_ERROR_MESSAGES } from '../../constants/ErrorMessages';
import { TituloItem } from '../../types/cliente';
import { CarneParcela } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { BulkAction } from '../../components/modals/clientes/cliente/types';
import { useI18n } from '../../contexts/I18nContext';
import { useBulkBtn } from '../../components/ui';
import { awaitRefreshResult, isTituloDeletavel } from './utils';

interface UseTituloActionsParams {
  effectiveClienteId: number | null;
  selectedItems: TituloItem[];
  getItemsCompletos: CarneParcela[];
  hasNFSeEmitida: boolean;
  onRefreshParcelas: () => void | Promise<void>;
  onShowTituloEditModal: (tituloId: number) => void;
  onShowReceberModal: (parcela: TituloItem) => void;
  onShowGerarNFeModal: (titulo?: CarneParcela) => void;
  handleImprimirTitulosSelecionados: (selectedItems: TituloItem[]) => Promise<void>;
  handleImprimirTodosEmAberto: () => Promise<void>;
  handleImprimirRecibosWrapper: (items: CarneParcela[]) => Promise<void>;
  handleImprimirNF: (ids: number[]) => Promise<void>;
}

export function useTituloActions({
  effectiveClienteId,
  selectedItems,
  getItemsCompletos,
  hasNFSeEmitida,
  onRefreshParcelas,
  onShowTituloEditModal,
  onShowReceberModal,
  onShowGerarNFeModal,
  handleImprimirTitulosSelecionados,
  handleImprimirTodosEmAberto,
  handleImprimirRecibosWrapper,
  handleImprimirNF,
}: UseTituloActionsParams) {
  const { success, error, info } = useNotificationContext();
  const { showApiError } = useApiError();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const bulkBtn = useBulkBtn();

  const handleCancelarTitulos = useCallback(async (items: CarneParcela[]) => {
    if (items.length === 0) return;

    const confirmMessage = items.length === 1
      ? t('messages.confirmCancelTitle')
      : t('messages.confirmCancelTitles', { count: items.length });
    const confirmed = window.confirm(confirmMessage);
    if (confirmed) {
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const item of items) {
          try {
            await TituloService.update(item.id, { status: 'cancelado' });
            successCount++;
          } catch {
            errorCount++;
          }
        }

        await queryClient.invalidateQueries({ queryKey: ['cliente', effectiveClienteId] });
        await queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', effectiveClienteId] });
        await awaitRefreshResult(onRefreshParcelas());

        if (successCount > 0) {
          const message = successCount === 1
            ? t('messages.successCancelTitle')
            : t('messages.successCancelTitles', { count: successCount });
          success(message);
        }

        if (errorCount > 0) {
          const message = errorCount === 1
            ? t('messages.errorCancelTitle')
            : t('messages.errorCancelTitles', { count: errorCount });
          error(message);
        }
      } catch {
        error(t('messages.errorCancelTitlesGeneral'));
      }
    }
  }, [t, effectiveClienteId, queryClient, onRefreshParcelas, success, error]);

  const handleEstornarTitulo = useCallback(async (titulo: CarneParcela) => {
    if (titulo.status !== 'pago') {
      info(t('financial.canOnlyReversePaid'));
      return;
    }

    const msg = `${t('messages.confirmDelete')}\n\n${t('contracts.title')} ${titulo.numero_titulo || titulo.id}\n${t('summary.value')} ${formatCurrency(titulo.valor_pago || titulo.valor || 0)}\n\n${t('financial.titleWillReturnPending')}`;
    const confirmed = window.confirm(msg);
    if (confirmed) {
      try {
        await TituloService.estornar(titulo.id);
        success(t('messages.successReverseTitle'));
        queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', effectiveClienteId] });
        onRefreshParcelas();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_REVERSE_ERROR);
      }
    }
  }, [t, effectiveClienteId, queryClient, onRefreshParcelas, info, success, showApiError]);

  const handleEnviarWhatsApp = useCallback(async (items: CarneParcela[]) => {
    if (items.length > 0) {
      try {
        let successCount = 0;
        let errorCount = 0;
        let firstErrorMessage = '';

        for (const item of items) {
          if (item.status === 'cancelado') continue;
          try {
            const response = await TituloService.enviarWhatsApp(item.id);
            if (response.success) {
              successCount++;
            } else {
              errorCount++;
              if (!firstErrorMessage && response.message) {
                firstErrorMessage = response.message;
              }
            }
          } catch (err) {
            errorCount++;
            if (!firstErrorMessage) {
              firstErrorMessage = extractApiErrorMessageSync(err, {
                defaultMessage: CONTEXT_ERROR_MESSAGES.TITULO_SEND_WHATSAPP_ERROR,
              });
            }
          }
        }

        if (successCount > 0) {
          const message = successCount === 1
            ? t('messages.successSendMessage')
            : t('messages.successSendMessages', { count: successCount });
          success(message);
        }

        if (errorCount > 0) {
          const message = firstErrorMessage || (errorCount === 1
            ? t('messages.errorSendMessage')
            : t('messages.errorSendMessages', { count: errorCount }));
          error(message);
        }
      } catch {
        error(t('messages.errorSendMessagesGeneral'));
      }
    }
  }, [t, success, error]);

  const handleEnviarEmail = useCallback(async (items: CarneParcela[]) => {
    if (items.length > 0) {
      try {
        let successCount = 0;
        let errorCount = 0;
        let firstErrorMessage = '';

        for (const item of items) {
          if (item.status === 'cancelado') continue;
          try {
            const response = await TituloService.enviarEmail(item.id);
            if (response.success) {
              successCount++;
            } else {
              errorCount++;
              if (!firstErrorMessage && response.message) {
                firstErrorMessage = response.message;
              }
            }
          } catch (err) {
            errorCount++;
            if (!firstErrorMessage) {
              firstErrorMessage = extractApiErrorMessageSync(err, {
                defaultMessage: CONTEXT_ERROR_MESSAGES.TITULO_SEND_EMAIL_ERROR,
              });
            }
          }
        }

        if (successCount > 0) {
          const message = successCount === 1
            ? t('messages.successSendEmail')
            : t('messages.successSendEmails', { count: successCount });
          success(message);
        }

        if (errorCount > 0) {
          const message = firstErrorMessage || (errorCount === 1
            ? t('messages.errorSendEmail')
            : t('messages.errorSendEmails', { count: errorCount }));
          error(message);
        }
      } catch {
        error(t('messages.errorSendEmailsGeneral'));
      }
    }
  }, [t, success, error]);

  const handleDeletarTitulos = useCallback(async (items: CarneParcela[]) => {
    const deletaveis = items.filter(isTituloDeletavel);
    if (deletaveis.length === 0) return;
    const confirmMessage = deletaveis.length === 1
      ? t('financial.confirmDeleteTitle')
      : t('financial.confirmDeleteTitles', { count: deletaveis.length });
    const confirmed = window.confirm(confirmMessage);
    if (confirmed) {
      try {
        let successCount = 0;
        let errorCount = 0;
        for (const item of deletaveis) {
          try {
            await TituloService.delete(item.id);
            successCount++;
          } catch {
            errorCount++;
          }
        }
        await queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', effectiveClienteId] });
        await awaitRefreshResult(onRefreshParcelas());
        if (successCount > 0) {
          success(successCount === 1 ? t('financial.successDeleteTitle') : t('financial.successDeleteTitles', { count: successCount }));
        }
        if (errorCount > 0) {
          error(errorCount === 1 ? t('financial.errorDeleteTitle') : t('financial.errorDeleteTitles', { count: errorCount }));
        }
      } catch {
        error(t('financial.errorDeleteTitlesGeneral'));
      }
    }
  }, [t, queryClient, effectiveClienteId, onRefreshParcelas, success, error]);

  const titulosBulkActions: BulkAction<CarneParcela>[] = useMemo(() => [
    {
      key: 'editar',
      label: bulkBtn.editar.label,
      variant: bulkBtn.editar.variant,
      disabled: (selectedItems) => selectedItems.length !== 1,
      onClick: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          onShowTituloEditModal(item.id);
        }
      },
    },
    {
      key: 'excluir',
      label: bulkBtn.deletar.label,
      variant: bulkBtn.deletar.variant,
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => !isTituloDeletavel(item));
      },
      onClick: handleDeletarTitulos,
    },
    {
      key: 'receber',
      label: bulkBtn.receber.label,
      variant: bulkBtn.receber.variant,
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      },
      onClick: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          onShowReceberModal({
            ...item,
            valor_pago: item.valor_pago ?? null,
          } as TituloItem);
        }
      },
    },
    {
      key: 'cancelar',
      label: bulkBtn.cancelar.label,
      variant: bulkBtn.cancelar.variant,
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      },
      onClick: handleCancelarTitulos,
    },
    {
      key: 'estornar',
      label: bulkBtn.estornar.label,
      variant: bulkBtn.estornar.variant,
      disabled: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status !== 'pago');
      },
      onClick: async (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          await handleEstornarTitulo(selectedItems[0]);
        }
      },
    },
    {
      key: 'imprimir',
      label: bulkBtn.imprimir.label,
      variant: bulkBtn.imprimir.variant,
      dropdown: [
        {
          label: bulkBtn.selecionados.label,
          action: (items?: CarneParcela[]) =>
            handleImprimirTitulosSelecionados(
              (items?.length ? items : selectedItems) as TituloItem[]
            ),
        },
        {
          label: bulkBtn.abertos.label,
          action: handleImprimirTodosEmAberto,
        },
        {
          label: bulkBtn.recibo.label,
          action: (items?: CarneParcela[]) => {
            const source = items?.length ? items : getItemsCompletos;
            handleImprimirRecibosWrapper(source);
          },
          disabled: (selectedItems: CarneParcela[]) => {
            if (selectedItems.length === 0) return true;
            return selectedItems.every(item => item.status !== 'pago' && item.status !== 'pago_atraso');
          },
        },
        ...(hasNFSeEmitida ? [{
          label: bulkBtn.imprimirNF.label,
          action: (items?: CarneParcela[]) => {
            const source = items?.length ? items : getItemsCompletos;
            const itensComNFSe = source.filter(item => item.nfse_status === 'emitida' && item.nfse_numero);
            if (itensComNFSe.length === 0) {
              error(t('messages.selectInvoiceToCancel'));
              return;
            }
            handleImprimirNF(itensComNFSe.map(item => item.id));
          },
        }] : []),
      ],
    },
    {
      key: 'enviar',
      label: bulkBtn.enviar.label,
      variant: bulkBtn.enviar.variant,
      disabled: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'cancelado');
      },
      dropdown: [
        {
          label: bulkBtn.viaWhatsApp.label,
          action: () => handleEnviarWhatsApp(getItemsCompletos),
        },
        {
          label: bulkBtn.viaEmail.label,
          action: () => handleEnviarEmail(getItemsCompletos),
        },
      ],
    },
    {
      key: 'nfse',
      label: bulkBtn.nfse.label,
      variant: bulkBtn.nfse.variant,
      disabled: (selectedItems: CarneParcela[]) => selectedItems.length === 0,
      dropdown: [
        {
          label: bulkBtn.gerarNFSeAvulsa.label,
          action: (selectedItems?: CarneParcela[]) => {
            if (selectedItems && selectedItems.length > 0) {
              onShowGerarNFeModal(selectedItems[0]);
            }
          },
        },
      ],
    },
  ], [
    bulkBtn,
    t,
    hasNFSeEmitida,
    handleDeletarTitulos,
    handleCancelarTitulos,
    handleEstornarTitulo,
    handleEnviarWhatsApp,
    handleEnviarEmail,
    onShowTituloEditModal,
    onShowReceberModal,
    onShowGerarNFeModal,
    handleImprimirNF,
    handleImprimirTitulosSelecionados,
    handleImprimirTodosEmAberto,
    handleImprimirRecibosWrapper,
    error,
    getItemsCompletos,
    selectedItems,
  ]);

  return {
    titulosBulkActions,
    handleCancelarTitulos,
    handleEstornarTitulo,
    handleEnviarWhatsApp,
    handleEnviarEmail,
  };
}
