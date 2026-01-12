import { useState, useMemo } from 'react';
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
  const queryClient = useQueryClient();
  const deleteContratoMutation = useDeleteContrato();
  const { confirm, modalProps } = useConfirmModal();

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

  const handleCancelarTitulos = async (items: CarneParcela[]) => {
    if (items.length === 0) return;
    
    const confirmMessage = items.length === 1 
      ? 'Tem certeza que deseja cancelar este título?'
      : `Tem certeza que deseja cancelar ${items.length} títulos?`;
      
    const confirmed = await confirm({
      message: confirmMessage,
      variant: 'warning',
      title: 'Cancelar títulos',
      confirmText: 'Cancelar',
      cancelText: 'Voltar',
    });
    
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
              ? 'Título cancelado com sucesso!'
              : `${successCount} títulos cancelados com sucesso!`;
            success(message);
          }
          
          if (errorCount > 0) {
            const message = errorCount === 1 
              ? '1 título não pôde ser cancelado'
              : `${errorCount} títulos não puderam ser cancelados`;
            error(message);
          }
        } catch (err) {
          error('Erro ao cancelar títulos');
        }
      }
  };

  const handleEstornarTitulo = async (titulo: CarneParcela) => {
    if (titulo.status !== 'pago') {
      info('Só é possível estornar títulos que estão pagos');
      return;
    }
    
    const confirmed = await confirm({
      message: `Tem certeza que deseja estornar o título ${titulo.numero_titulo || titulo.id}?\n\n` +
        `Valor: ${formatCurrency(titulo.valor_pago || titulo.valor || 0)}\n` +
        `O título voltará para status PENDENTE.`,
      variant: 'warning',
      title: 'Estornar título',
      confirmText: 'Estornar',
      cancelText: 'Cancelar',
    });
    
    if (confirmed) {
        try {
          await TituloService.estornar(titulo.id);
          success('Título estornado com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', effectiveClienteId] });
          onRefreshParcelas();
        } catch (err) {
          const errorObj = err as Error;
          error(errorObj.message || 'Erro ao estornar título.');
        }
      }
  };

  const handleEnviarWhatsApp = async (items: CarneParcela[]) => {
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
            ? 'Mensagem enviada com sucesso!'
            : `${successCount} mensagens enviadas com sucesso!`;
          success(message);
        }
        
        if (errorCount > 0) {
          const message = firstErrorMessage || (errorCount === 1 
            ? '1 mensagem não pôde ser enviada'
            : `${errorCount} mensagens não puderam ser enviadas`);
          error(message);
        }
      } catch (err) {
        error('Erro ao enviar mensagens');
      }
    }
  };

  const handleEnviarEmail = async (items: CarneParcela[]) => {
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
            ? 'Email enviado com sucesso!'
            : `${successCount} emails enviados com sucesso!`;
          success(message);
        }
        
        if (errorCount > 0) {
          const message = firstErrorMessage || (errorCount === 1 
            ? '1 email não pôde ser enviado'
            : `${errorCount} emails não puderam ser enviados`);
          error(message);
        }
      } catch (err) {
        error('Erro ao enviar emails');
      }
    }
  };

  const handleDeletarContratos = async (items: Contrato[]) => {
    if (items.length === 0) return;
    
    const confirmMessage = items.length === 1
      ? 'Tem certeza que deseja deletar este contrato?'
      : `Tem certeza que deseja deletar ${items.length} contratos?`;
    
    const confirmed = await confirm({
      message: confirmMessage,
      variant: 'danger',
      title: 'Deletar contratos',
      confirmText: 'Deletar',
      cancelText: 'Cancelar',
    });
    
    if (confirmed) {
        try {
          for (const item of items) {
            try {
              await deleteContratoMutation.mutateAsync(item.id);
            } catch (err) {
              const axiosError = err as AxiosError<{ message: string; error?: string }>;
              const errorMessage = axiosError?.response?.data?.message || 
                                 axiosError?.response?.data?.error || 
                                 `Erro ao deletar contrato ${item.id}`;
              error(errorMessage);
            }
          }
          onRefreshContratos();
          setSelectedContratosItems([]);
        } catch (err) {
          error('Erro ao deletar contratos');
        }
      }
  };

  const handleImprimirRecibosWrapper = async (items: CarneParcela[]) => {
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
  };


  // Ações em lote para títulos
  const titulosBulkActions: BulkAction<CarneParcela>[] = [
    {
      key: 'editar',
      label: 'Editar',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length !== 1,
      onClick: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length > 0) {
          const item = selectedItems[0];
          onShowTituloEditModal(item.id);
        }
      }
    },
    {
      key: 'receber',
      label: 'Receber',
      variant: 'primary',
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
      label: 'Cancelar',
      variant: 'primary',
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      },
      onClick: handleCancelarTitulos
    },
    {
      key: 'estornar',
      label: 'Estornar',
      variant: 'primary',
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
      label: 'Imprimir',
      variant: 'primary',
      dropdown: [
        {
          label: 'Selecionados',
          action: () => handleImprimirTitulosSelecionados(selectedItems as TituloItem[])
        },
        {
          label: 'Abertos',
          action: handleImprimirTodosEmAberto
        },
        {
          label: 'Recibo',
          action: () => {
            handleImprimirRecibosWrapper(getItemsCompletos);
          },
          disabled: (selectedItems: CarneParcela[]) => {
            if (selectedItems.length === 0) return true;
            return selectedItems.every(item => item.status !== 'pago' && item.status !== 'pago_atraso');
          }
        },
        ...(hasNFSeEmitida ? [{
          label: 'Imprimir NF',
          action: () => {
            const itensComNFSe = getItemsCompletos.filter(item => item.nfse_status === 'emitida' && item.nfse_numero);
            if (itensComNFSe.length === 0) {
              error('Nenhum título selecionado possui NFS-e emitida');
              return;
            }
            handleImprimirNF(itensComNFSe.map(item => item.id));
          }
        }] : [])
      ]
    },
    {
      key: 'enviar',
      label: 'Enviar',
      variant: 'primary',
      disabled: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'cancelado');
      },
      dropdown: [
        {
          label: 'Via WhatsApp',
          action: () => handleEnviarWhatsApp(getItemsCompletos)
        },
        {
          label: 'Via Email',
          action: () => handleEnviarEmail(getItemsCompletos)
        }
      ]
    },
    {
      key: 'nfse',
      label: 'NFS-e',
      variant: 'primary',
      disabled: (selectedItems: CarneParcela[]) => selectedItems.length === 0,
      dropdown: [
        {
          label: 'Gerar NFS-e Avulsa',
          action: (selectedItems?: CarneParcela[]) => {
            if (selectedItems && selectedItems.length > 0) {
              onShowGerarNFeModal(selectedItems[0]);
            }
          }
        },
      ]
    }
  ];

  // Ações em lote para contratos
  const contratosBulkActions: BulkAction<Contrato>[] = [
    {
      key: 'novo',
      label: 'Novo',
      variant: 'primary',
      onClick: () => onShowContratoCreateModal()
    },
    {
      key: 'editar',
      label: 'Editar',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: (selectedItems) => {
        if (selectedItems.length > 0) {
          onShowContratoEditModal(selectedItems[0].id);
        }
      }
    },
    {
      key: 'excluir',
      label: 'Excluir',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length === 0,
      onClick: handleDeletarContratos,
      confirm: {
        title: 'Confirmar Exclusão',
        message: 'Tem certeza que deseja deletar os contratos selecionados?',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar'
      }
    },
    {
      key: 'imprimir',
      label: 'Imprimir',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length === 0,
      dropdown: [
        {
          label: 'Contrato',
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirContrato(selectedContratosItems[0].id);
            }
          }
        },
        {
          label: 'Termo de Adesão',
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirTermoAdesao(selectedContratosItems[0].id);
            }
          }
        },
        {
          label: 'Contrato Permanência',
          action: async () => {
            if (selectedContratosItems.length > 0) {
              await handleImprimirContratoPermanencia(selectedContratosItems[0].id);
            }
          }
        }
      ]
    }
  ];

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

