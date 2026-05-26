import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { TituloService } from '../services/tituloService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useDeleteContrato, Contrato } from './useContratos';
import { TituloItem } from '../types/cliente';
import { CarneParcela, PaginatedResponse } from '../types';
import { formatCurrency } from '../utils/formatters';
import { BulkAction } from '../components/modals/clientes/cliente/types';
import { useConfirmModal } from './useConfirmModal';
import { useI18n } from '../contexts/I18nContext';
import { useBulkBtn } from '../components/ui';

interface UseClienteBulkActionsParams {
  clienteId: number | null;
  createdClienteId: number | null;
  parcelasData: PaginatedResponse<CarneParcela> | undefined;
  contratosData: Contrato[] | undefined;
  onRefreshParcelas: () => void | Promise<void>;
  onRefreshContratos: () => void | Promise<void>;
  onShowTituloEditModal: (tituloId: number) => void;
  onShowReceberModal: (parcela: TituloItem) => void;
  onShowContratoCreateModal: () => void;
  onShowContratoEditModal: (contratoId: number) => void;
  onShowImprimirModal: () => void;
  handleImprimirTitulosSelecionados: (selectedItems: TituloItem[]) => Promise<void>;
  handleImprimirTodosEmAberto: () => Promise<void>;
  handleImprimirContrato: (contratoId: number) => Promise<void>;
  handleImprimirTermoAdesao: (contratoId: number) => Promise<void>;
  handleImprimirContratoPermanencia: (contratoId: number) => Promise<void>;
  handleImprimirRecibos: (selectedItems: TituloItem[]) => Promise<void>;
  onShowGerarNFeModal: (titulo?: CarneParcela) => void;
  handleImprimirNF: (ids: number[]) => Promise<void>;
}

interface UseClienteBulkActionsReturn {
  // Estados de seleção
  selectedItems: TituloItem[];
  setSelectedItems: React.Dispatch<React.SetStateAction<TituloItem[]>>;
  selectedContratosItems: Contrato[];
  setSelectedContratosItems: React.Dispatch<React.SetStateAction<Contrato[]>>;
  
  // Ações em lote para títulos (aba Financeiro)
  titulosBulkActions: BulkAction<CarneParcela>[];
  
  // Ações em lote para contratos (aba Contratos)
  contratosBulkActions: BulkAction<Contrato>[];
  
  // Handlers específicos (expostos para uso direto se necessário)
  handleCancelarTitulos: (selectedItems: CarneParcela[]) => Promise<void>;
  handleEstornarTitulo: (titulo: CarneParcela) => Promise<void>;
  handleEnviarWhatsApp: (selectedItems: CarneParcela[]) => Promise<void>;
  handleEnviarEmail: (selectedItems: CarneParcela[]) => Promise<void>;
  handleDeletarContratos: (selectedItems: Contrato[]) => Promise<void>;
  
  // Props do ConfirmModal (deve ser renderizado no componente que usa o hook)
  modalProps: {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    centered?: boolean;
    isLoading: boolean;
  } | null;
}

export const useClienteBulkActions = ({
  clienteId,
  createdClienteId,
  parcelasData,
  contratosData: _contratosData,
  onRefreshParcelas,
  onRefreshContratos,
  onShowTituloEditModal,
  onShowReceberModal,
  onShowContratoCreateModal,
  onShowContratoEditModal,
  onShowImprimirModal: _onShowImprimirModal,
  handleImprimirTitulosSelecionados,
  handleImprimirTodosEmAberto,
  handleImprimirContrato,
  handleImprimirTermoAdesao,
  handleImprimirContratoPermanencia,
  handleImprimirRecibos,
  onShowGerarNFeModal,
  handleImprimirNF
}: UseClienteBulkActionsParams): UseClienteBulkActionsReturn => {
  const { success, error, info } = useNotificationContext();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const deleteContratoMutation = useDeleteContrato();
  const { modalProps } = useConfirmModal();

  const [selectedItems, setSelectedItems] = useState<TituloItem[]>([]);
  const [selectedContratosItems, setSelectedContratosItems] = useState<Contrato[]>([]);

  const effectiveClienteId = clienteId || createdClienteId;

  const getItemsCompletos = useMemo((): CarneParcela[] => {
    if (!parcelasData?.data || selectedItems.length === 0) return [];
    const selectedIds = selectedItems.map(item => item.id);
    return parcelasData.data.filter((item: CarneParcela) => selectedIds.includes(item.id));
  }, [selectedItems, parcelasData]);

  const hasNFSeEmitida = useMemo(() => {
    return getItemsCompletos.some(item => item.nfse_status === 'emitida' && item.nfse_numero);
  }, [getItemsCompletos]);

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
            } catch (err) {
              errorCount++;
            }
          }
          
          // Aguardar invalidação e refetch completarem antes de mostrar mensagem
          await queryClient.invalidateQueries({ queryKey: ['cliente', effectiveClienteId] });
          await queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', effectiveClienteId] });
          // onRefreshParcelas pode retornar uma Promise ou void
          const refreshResult = onRefreshParcelas();
          if (refreshResult && typeof refreshResult === 'object' && 'then' in refreshResult) {
            await refreshResult;
          }
          
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
        } catch (err) {
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
          const errorObj = err as Error;
          error(errorObj.message || t('messages.errorReverseTitle'));
        }
      }
  }, [t, effectiveClienteId, queryClient, onRefreshParcelas, info, success, error]);

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
              if (err && typeof err === 'object' && 'message' in err) {
                firstErrorMessage = (err as { message: string }).message;
              } else if (err instanceof Error) {
                firstErrorMessage = err.message;
              }
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
      } catch (err) {
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
              if (err && typeof err === 'object' && 'message' in err) {
                firstErrorMessage = (err as { message: string }).message;
              } else if (err instanceof Error) {
                firstErrorMessage = err.message;
              }
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
      } catch (err) {
        error(t('messages.errorSendEmailsGeneral'));
      }
    }
  }, [t, success, error]);

  const handleDeletarContratos = useCallback(
    async (items: Contrato[]) => {
      if (items.length === 0) return;

      const confirmMessage =
        items.length === 1
          ? t('messages.confirmDelete')
          : t('messages.confirmDeleteAdditionalServices', { count: items.length });
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        try {
          for (const item of items) {
            try {
              await deleteContratoMutation.mutateAsync(item.id);
            } catch (err) {
              const axiosError = err as AxiosError<{ message: string; error?: string }>;
              const errorMessage =
                axiosError?.response?.data?.message ||
                axiosError?.response?.data?.error ||
                `${t('contracts.messages.deleteError')} ${item.id}`;
              error(errorMessage);
            }
          }
          onRefreshContratos();
          setSelectedContratosItems([]);
        } catch {
          error(t('contracts.messages.deleteError'));
        }
      }
    },
    [t, deleteContratoMutation, onRefreshContratos, error]
  );

  const handleImprimirRecibosWrapper = useCallback(
    async (items: CarneParcela[]) => {
      const tituloItems: TituloItem[] = items.map(item => ({
        id: item.id,
        numero_titulo: (item.numero_titulo || item.numero_parcela || `Título ${item.id}`).toString(),
        valor_parcela: item.valor || item.valor_parcela || 0,
        data_vencimento: item.data_vencimento,
        status: item.status,
        valor_pago: item.valor_pago || 0,
        data_pagamento: item.data_pagamento || null,
        charge_id: item.charge_id || null,
        cliente: undefined
      }));
      await handleImprimirRecibos(tituloItems);
    },
    [handleImprimirRecibos]
  );

  const isTituloDeletavel = (t: CarneParcela): boolean => {
    if (t.status === 'cancelado') return true;
    if (t.pago) return false;
    const registrado = !!(t.charge_id || t.nosso_numero || t.codigo_barras || t.linha_digitavel || t.url_boleto);
    return !registrado;
  };

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
        const refreshResult = onRefreshParcelas();
        if (refreshResult && typeof refreshResult === 'object' && 'then' in refreshResult) {
          await refreshResult;
        }
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

  // Ações em lote para títulos
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
      }
    },
    {
      key: 'excluir',
      label: bulkBtn.deletar.label,
      variant: bulkBtn.deletar.variant,
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => !isTituloDeletavel(item));
      },
      onClick: handleDeletarTitulos
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
            valor_pago: item.valor_pago ?? null
          } as TituloItem);
        }
      }
    },
    {
      key: 'cancelar',
      label: bulkBtn.cancelar.label,
      variant: bulkBtn.cancelar.variant,
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      },
      onClick: handleCancelarTitulos
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
      }
    },
    {
      key: 'imprimir',
      label: bulkBtn.imprimir.label,
      variant: bulkBtn.imprimir.variant,
      dropdown: [
        {
          label: bulkBtn.selecionados.label,
          action: () => handleImprimirTitulosSelecionados(selectedItems as TituloItem[])
        },
        {
          label: bulkBtn.abertos.label,
          action: handleImprimirTodosEmAberto
        },
        {
          label: bulkBtn.recibo.label,
          action: () => {
            handleImprimirRecibosWrapper(getItemsCompletos);
          },
          disabled: (selectedItems: CarneParcela[]) => {
            if (selectedItems.length === 0) return true;
            return selectedItems.every(item => item.status !== 'pago' && item.status !== 'pago_atraso');
          }
        },
        ...(hasNFSeEmitida ? [{
          label: bulkBtn.imprimirNF.label,
          action: () => {
            const itensComNFSe = getItemsCompletos.filter(item => item.nfse_status === 'emitida' && item.nfse_numero);
            if (itensComNFSe.length === 0) {
              error(t('messages.selectInvoiceToCancel')); // Usando uma mensagem existente ou adicionando nova
              return;
            }
            handleImprimirNF(itensComNFSe.map(item => item.id));
          }
        }] : [])
      ]
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
          action: () => handleEnviarWhatsApp(getItemsCompletos)
        },
        {
          label: bulkBtn.viaEmail.label,
          action: () => handleEnviarEmail(getItemsCompletos)
        }
      ]
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
          }
        },
      ]
    }
  ], [bulkBtn, t, hasNFSeEmitida, handleDeletarTitulos, handleCancelarTitulos, handleEstornarTitulo, handleEnviarWhatsApp, handleEnviarEmail, onShowTituloEditModal, onShowReceberModal, onShowGerarNFeModal, handleImprimirNF, handleImprimirTitulosSelecionados, handleImprimirTodosEmAberto, handleImprimirRecibosWrapper, error, getItemsCompletos, selectedItems]);

  // Ações em lote para contratos
  const contratosBulkActions: BulkAction<Contrato>[] = useMemo(() => [
    {
      key: 'novo',
      label: bulkBtn.novo.label,
      variant: bulkBtn.novo.variant,
      onClick: () => onShowContratoCreateModal()
    },
    {
      key: 'editar',
      label: bulkBtn.editar.label,
      variant: bulkBtn.editar.variant,
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: (selectedItems) => {
        if (selectedItems.length > 0) {
          onShowContratoEditModal(selectedItems[0].id);
        }
      }
    },
    {
      key: 'excluir',
      label: bulkBtn.deletar.label,
      variant: bulkBtn.deletar.variant,
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: handleDeletarContratos,
      confirm: {
        title: t('contracts.confirmDelete'),
        message: t('contracts.confirmDeleteMessage'),
        confirmText: t('actions.delete'),
        cancelText: t('actions.cancel')
      }
    },
    {
      key: 'imprimir',
      label: bulkBtn.imprimir.label,
      variant: bulkBtn.imprimir.variant,
      disabled: (selectedItems) => selectedItems.length === 0,
      dropdown: [
        {
          label: t('contracts.title'),
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirContrato(selectedContratosItems[0].id);
            }
          }
        },
        {
          label: t('contracts.termAdesao'),
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirTermoAdesao(selectedContratosItems[0].id);
            }
          }
        },
        {
          label: t('contracts.permanencia'),
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirContratoPermanencia(selectedContratosItems[0].id);
            }
          }
        }
      ]
    }
  ], [bulkBtn, t, onShowContratoCreateModal, onShowContratoEditModal, handleDeletarContratos, selectedContratosItems, handleImprimirContrato, handleImprimirTermoAdesao, handleImprimirContratoPermanencia]);

  return {
    selectedItems,
    setSelectedItems,
    selectedContratosItems,
    setSelectedContratosItems,
    titulosBulkActions,
    contratosBulkActions,
    handleCancelarTitulos,
    handleEstornarTitulo,
    handleEnviarWhatsApp,
    handleEnviarEmail,
    handleDeletarContratos,
    modalProps
  };
};

