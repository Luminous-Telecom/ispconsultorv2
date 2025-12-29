import React, { useState } from 'react';
import { useContasPagar, useDeleteContaPagar, useDuplicarContaPagar } from '@/hooks/useContasPagar';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useAuditoria } from '@/hooks/useAuditoria';
import { formatDateTime, formatDate, formatCurrency } from '@/utils/formatters';
import { ContaPagar } from '@/types';
import ListModal from '@/components/common/ListModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import ContaPagarModal from './ContaPagarModal';

interface ContasPagarListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContaPagar?: (contaPagar: ContaPagar) => void;
  title?: string;
  skipWrapper?: boolean;
}

const ContasPagarListModal: React.FC<ContasPagarListModalProps> = ({ 
  show, 
  onClose, 
  onSelectContaPagar,
  title = "Contas a Pagar",
  skipWrapper: _skipWrapper 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [selectedContaPagarId, setSelectedContaPagarId] = useState<number | null>(null);
  
  // Hook de auditoria
  const auditoria = useAuditoria();
  
  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });
  
  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<ContaPagar>(
    onSelectContaPagar ? (contaPagar) => {
      onSelectContaPagar(contaPagar);
      onClose();
    } : undefined
  );


  // Função para obter badge de status
  const getStatusBadge = (status: ContaPagar['status']) => {
    const statusMap = {
      'A_PAGAR': { label: 'A Pagar', className: 'bg-warning' },
      'PAGO': { label: 'Pago', className: 'bg-success' },
      'PARCIAL': { label: 'Parcial', className: 'bg-info' },
      'CANCELADO': { label: 'Cancelado', className: 'bg-secondary' }
    };
    const statusInfo = statusMap[status] || { label: status, className: 'bg-secondary' };
    return (
      <span className={`badge ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Função para obter badge de tipo de pagamento
  const getTipoPagamentoBadge = (tipo: ContaPagar['tipo_pagamento']) => {
    const tipoMap: Record<string, string> = {
      'DINHEIRO': 'Dinheiro',
      'BOLETO': 'Boleto',
      'CARTAO': 'Cartão',
      'DEPOSITO': 'Depósito',
      'DEBITO_CONTA': 'Débito em Conta',
      'TRANSFERENCIA': 'Transferência',
      'PIX': 'PIX'
    };
    return tipoMap[tipo] || tipo;
  };

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns: [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '80px',
        render: (item: ContaPagar) => <span className="text-nowrap">{item.id ?? '-'}</span>
      },
      {
        key: 'fornecedor',
        label: 'Fornecedor',
        sortable: false,
        render: (item: ContaPagar) => (
          <strong>{item.fornecedor?.nome_razao_social || '-'}</strong>
        )
      },
      {
        key: 'data_vencimento',
        label: 'Vencimento',
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">
            {item.data_vencimento ? formatDate(item.data_vencimento) : '-'}
          </span>
        )
      },
      {
        key: 'valor',
        label: 'Valor',
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{formatCurrency(item.valor || 0)}</span>
        )
      },
      {
        key: 'valor_pago',
        label: 'Valor Pago',
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{formatCurrency(item.valor_pago || 0)}</span>
        )
      },
      {
        key: 'saldo_devedor',
        label: 'Saldo Devedor',
        sortable: false,
        width: '130px',
        render: (item: ContaPagar) => {
          const valor = typeof item.valor === 'number' ? item.valor : parseFloat(String(item.valor || 0));
          const valorPago = typeof item.valor_pago === 'number' ? item.valor_pago : parseFloat(String(item.valor_pago || 0));
          const saldo = valor - valorPago;
          return (
            <span className={`text-nowrap ${saldo > 0 ? 'text-danger' : 'text-success'}`}>
              {formatCurrency(saldo)}
            </span>
          );
        }
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: '120px',
        render: (item: ContaPagar) => getStatusBadge(item.status)
      },
      {
        key: 'tipo_pagamento',
        label: 'Tipo Pagamento',
        sortable: true,
        width: '150px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{getTipoPagamentoBadge(item.tipo_pagamento)}</span>
        )
      },
      {
        key: 'numero_documento',
        label: 'Nº Documento',
        sortable: true,
        width: '150px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">{item.numero_documento || '-'}</span>
        )
      },
      {
        key: 'data_pagamento',
        label: 'Data Pagamento',
        sortable: true,
        width: '130px',
        render: (item: ContaPagar) => (
          <span className="text-nowrap">
            {item.data_pagamento ? formatDate(item.data_pagamento) : '-'}
          </span>
        )
      },
      {
        key: 'created_at',
        label: 'Criado em',
        sortable: true,
        width: '150px',
        render: (item: ContaPagar & { created_at?: string; created_at_formatada?: string | null }) => {
          if (item.created_at_formatada) {
            return item.created_at_formatada;
          }
          return item.created_at ? formatDateTime(item.created_at) : '-';
        }
      }
    ],
    searchPlaceholder: 'Buscar...',
    searchFields: [
      { key: 'numero_documento', label: 'Nº Documento' },
      { key: 'nota_fiscal', label: 'Nota Fiscal' }
    ],
    multiSelect: false
  });

  // Hook para buscar contas a pagar usando parâmetros do useTableFilters
  const { data: contasPagarData, isLoading, refetch } = useContasPagar({
    search: tableFilters.debouncedSearch || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const deleteContaPagarMutation = useDeleteContaPagar();
  const duplicarContaPagarMutation = useDuplicarContaPagar();

  const handleSelect = (selectedItems?: ContaPagar[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectContaPagar) {
        onSelectContaPagar(item);
        onClose();
      }
    }
  };

  const handleDelete = async (contaPagarId: number) => {
    try {
      await deleteContaPagarMutation.mutateAsync(contaPagarId);
      refetch();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const handleDuplicar = async (contaPagarId: number) => {
    try {
      await duplicarContaPagarMutation.mutateAsync(contaPagarId);
      refetch();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const handleAudit = (contaPagar: ContaPagar) => {
    auditoria.handleAudit('ContaPagar', contaPagar.id);
  };

  // Paginação do backend
  const pagination = contasPagarData?.pagination ? {
    current_page: contasPagarData.pagination.current_page,
    last_page: contasPagarData.pagination.last_page,
    per_page: contasPagarData.pagination.per_page,
    total: contasPagarData.pagination.total,
    from: contasPagarData.pagination.from,
    to: contasPagarData.pagination.to
  } : {
    current_page: tableFilters.page,
    last_page: 1,
    per_page: tableFilters.limit,
    total: 0,
    from: 0,
    to: 0
  };

  // Bulk actions
  const bulkActions = onSelectContaPagar ? [
    {
      label: 'Cancelar',
      variant: 'secondary' as const,
      action: () => {
        clearSelection();
        onClose();
      }
    },
    {
      label: 'Inserir',
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: ContaPagar[]) => handleSelect(selectedItems)
    }
  ] : [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: () => setShowCreateModal(true)
    },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedContaPagarId(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Pagar',
      variant: 'primary' as const,
      disabled: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        return !item || item.status === 'PAGO' || item.status === 'CANCELADO';
      },
      action: (selectedItems: ContaPagar[]) => {
        // Esta ação nunca será chamada quando há dropdown
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedContaPagarId(item.id);
          setShowPagamentoModal(true);
        }
      },
      dropdown: [
        {
          label: 'Pagar Manualmente',
          action: (selectedItems?: ContaPagar[]) => {
            const items = selectedItems || (selectedItem ? [selectedItem] : []);
            const item = items.length > 0 ? items[0] : selectedItem;
            if (item) {
              setSelectedContaPagarId(item.id);
              setShowPagamentoModal(true);
            }
          }
        }
      ]
    },
    {
      label: 'Duplicar',
      variant: 'secondary' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleDuplicar(item.id);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: ContaPagar[]) => selectedItems.length === 0,
      action: (selectedItems: ContaPagar[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item && window.confirm('Tem certeza que deseja excluir esta conta a pagar?')) {
          handleDelete(item.id);
        }
      }
    }
  ];

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={(contasPagarData?.data || []).filter(item => item.id != null)}
        loading={isLoading}
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={tableFilters.search}
        onSearchChange={(search) => {
          tableFilters.setSearch(search);
        }}
        pagination={pagination}
        onPageChange={tableFilters.setPage}
        limit={tableFilters.limit}
        onLimitChange={tableFilters.setLimit}
        refreshQueryKeys={['contas-pagar']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="ContaPagar"
        skipWrapper={_skipWrapper}
      />

      {showCreateModal && (
        <ContaPagarModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
            // Não fechar o modal automaticamente - permitir múltiplas edições
          }}
        />
      )}

      {showEditModal && selectedContaPagarId && (
        <ContaPagarModal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContaPagarId(null);
          }}
          contaPagarId={selectedContaPagarId}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {showPagamentoModal && selectedContaPagarId && (
        <ContaPagarModal
          show={showPagamentoModal}
          onClose={() => {
            setShowPagamentoModal(false);
            setSelectedContaPagarId(null);
          }}
          contaPagarId={selectedContaPagarId}
          onSuccess={() => {
            refetch();
            // Não fechar o modal aqui - deixar o usuário fechar manualmente
          }}
          showPagamentoOnOpen={true}
        />
      )}

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-conta-pagar-modal"
      />
    </>
  );
};

export default ContasPagarListModal;
