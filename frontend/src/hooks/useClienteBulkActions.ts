/**
 * Hook para gerenciar ações em lote para títulos e contratos
 * Centraliza toda a lógica de operações em massa
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { TituloService } from '../services/tituloService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { useDeleteContrato, Contrato } from './useContratos';
import { TituloItem } from '../types/cliente';
import { CarneParcela, PaginatedResponse } from '../types';
import { formatCurrency } from '../utils/formatters';
import { BulkAction } from '../components/modals/clientes/cliente/types';

interface UseClienteBulkActionsParams {
  clienteId: number | null;
  createdClienteId: number | null;
  parcelasData: PaginatedResponse<CarneParcela> | undefined;
  contratosData: Contrato[] | undefined;
  isGeneratingPdf: boolean;
  onRefreshParcelas: () => void;
  onRefreshContratos: () => void;
  onShowTituloEditModal: (tituloId: number) => void;
  onShowReceberModal: (parcela: TituloItem) => void;
  onShowContratoCreateModal: () => void;
  onShowContratoEditModal: (contratoId: number) => void;
  onShowImprimirModal: () => void;
  // Handlers de impressão do hook useClienteImpressao
  handleImprimirTitulosSelecionados: (selectedItems: TituloItem[]) => Promise<void>;
  handleImprimirTodosEmAberto: () => Promise<void>;
  handleImprimirContrato: (contratoId: number) => Promise<void>;
  handleImprimirTermoAdesao: (contratoId: number) => Promise<void>;
  handleImprimirContratoPermanencia: (contratoId: number) => Promise<void>;
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
}

export const useClienteBulkActions = ({
  clienteId,
  createdClienteId,
  parcelasData: _parcelasData,
  contratosData: _contratosData,
  isGeneratingPdf,
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
  handleImprimirContratoPermanencia
}: UseClienteBulkActionsParams): UseClienteBulkActionsReturn => {
  const { success, error, info } = useNotificationContext();
  const queryClient = useQueryClient();
  const deleteContratoMutation = useDeleteContrato();

  const [selectedItems, setSelectedItems] = useState<TituloItem[]>([]);
  const [selectedContratosItems, setSelectedContratosItems] = useState<Contrato[]>([]);

  const effectiveClienteId = clienteId || createdClienteId;

  const handleCancelarTitulos = async (items: CarneParcela[]) => {
    if (items.length > 0) {
      const confirmMessage = items.length === 1 
        ? 'Tem certeza que deseja cancelar este título?'
        : `Tem certeza que deseja cancelar ${items.length} títulos?`;
        
      if (window.confirm(confirmMessage)) {
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
          
          // Recarregar dados
          queryClient.invalidateQueries({ queryKey: ['cliente', effectiveClienteId] });
          queryClient.invalidateQueries({ queryKey: ['parcelas', 'cliente', effectiveClienteId] });
          onRefreshParcelas();
        } catch (err) {
          error('Erro ao cancelar títulos');
        }
      }
    }
  };

  const handleEstornarTitulo = async (titulo: CarneParcela) => {
    if (titulo.status === 'pago') {
      const confirmar = window.confirm(
        `Tem certeza que deseja estornar o título ${titulo.numero_titulo || titulo.id}?\n\n` +
        `Valor: ${formatCurrency(titulo.valor_pago || titulo.valor || 0)}\n` +
        `O título voltará para status PENDENTE.`
      );
      
      if (confirmar) {
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
    } else {
      info('Só é possível estornar títulos que estão pagos');
    }
  };

  const handleEnviarWhatsApp = async (items: CarneParcela[]) => {
    if (items.length > 0) {
      try {
        let successCount = 0;
        let errorCount = 0;
        
        for (const item of items) {
          if (item.status === 'cancelado') continue;
          try {
            const response = await TituloService.enviarWhatsApp(item.id);
            if (response.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            errorCount++;
          }
        }
        
        if (successCount > 0) {
          const message = successCount === 1 
            ? 'Mensagem enviada com sucesso!'
            : `${successCount} mensagens enviadas com sucesso!`;
          success(message);
        }
        
        if (errorCount > 0) {
          const message = errorCount === 1 
            ? '1 mensagem não pôde ser enviada'
            : `${errorCount} mensagens não puderam ser enviadas`;
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
        
        for (const item of items) {
          if (item.status === 'cancelado') continue;
          try {
            const response = await TituloService.enviarEmail(item.id);
            if (response.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (err) {
            errorCount++;
          }
        }
        
        if (successCount > 0) {
          const message = successCount === 1 
            ? 'Email enviado com sucesso!'
            : `${successCount} emails enviados com sucesso!`;
          success(message);
        }
        
        if (errorCount > 0) {
          const message = errorCount === 1 
            ? '1 email não pôde ser enviado'
            : `${errorCount} emails não puderam ser enviados`;
          error(message);
        }
      } catch (err) {
        error('Erro ao enviar emails');
      }
    }
  };

  const handleDeletarContratos = async (items: Contrato[]) => {
    if (items.length > 0) {
      const confirmMessage = items.length === 1
        ? 'Tem certeza que deseja deletar este contrato?'
        : `Tem certeza que deseja deletar ${items.length} contratos?`;
      
      if (window.confirm(confirmMessage)) {
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
    }
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
      variant: 'success',
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
      variant: 'danger',
      disabled: (selectedItems) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'pago' || item.status === 'cancelado');
      },
      onClick: handleCancelarTitulos
    },
    {
      key: 'estornar',
      label: 'Estornar',
      variant: 'warning',
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
      label: isGeneratingPdf ? 'Gerando...' : 'Imprimir',
      variant: 'primary',
      disabled: (_selectedItems) => isGeneratingPdf,
      dropdown: [
        {
          label: 'Selecionados',
          action: () => handleImprimirTitulosSelecionados(selectedItems as TituloItem[])
        },
        {
          label: 'Abertos',
          action: handleImprimirTodosEmAberto
        }
      ]
    },
    {
      key: 'enviar',
      label: 'Enviar',
      variant: 'info',
      disabled: (selectedItems: CarneParcela[]) => {
        if (selectedItems.length === 0) return true;
        return selectedItems.every(item => item.status === 'cancelado');
      },
      dropdown: [
        {
          label: 'Via WhatsApp',
          action: () => handleEnviarWhatsApp(selectedItems as CarneParcela[])
        },
        {
          label: 'Via Email',
          action: () => handleEnviarEmail(selectedItems as CarneParcela[])
        }
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
      label: isGeneratingPdf ? 'Gerando...' : 'Imprimir',
      variant: 'primary',
      disabled: (selectedItems) => selectedItems.length === 0 || isGeneratingPdf,
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
    handleDeletarContratos
  };
};

