import React, { useState, useCallback, useMemo } from 'react';
import { useBancos, useDeleteBanco } from '@/hooks/useBancos';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Banco } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import BancoModal from './BancoModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';
interface BancoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectBanco?: (banco: Banco) => void;
  title?: string;
  skipWrapper?: boolean;
}

const BancoListModal: React.FC<BancoListModalProps> = ({
  show,
  onClose,
  onSelectBanco,
  title = "Selecionar Banco",
  skipWrapper = false
}) => {
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [selectedBancoId, setSelectedBancoId] = useState<number | null>(null);
  
  const auditoria = useAuditoria();
  const { confirm, modalProps } = useConfirmModal();
  
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
    selectedItem: selectedBanco,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Banco>(
    onSelectBanco ? (banco) => {
      onSelectBanco(banco);
      onClose();
    } : undefined
  );

  // Configurar colunas memoizadas
  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '42px',
      render: (item: Banco) => <span>{item.id}</span>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      width: '180px',
      render: (item: Banco) => item.nome
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      width: '200px',
      render: (item: Banco) => item.descricao || '-'
    },
    {
      key: 'tipo',
      label: 'Tipo',
      sortable: true,
      width: '90px',
      render: (item: Banco) => {
        const tipos: Record<string, string> = {
          'efi': 'EFI',
          'asaas': 'Asaas',
          'bancario': 'Bancário',
          'outros': 'Outros'
        };
        return (
          <span className="badge bg-info">
            {tipos[item.tipo_banco] || 'N/A'}
          </span>
        );
      }
    },
    {
      key: 'sandbox',
      label: 'Sandbox',
      sortable: true,
      width: '80px',
      render: (item: Banco) => (
        <span className={`badge ${item.sandbox ? 'bg-warning' : 'bg-primary'}`}>
          {item.sandbox ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      width: '80px',
      render: (item: Banco) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      width: '130px',
      render: (item: Banco & { created_at?: string; created_at_formatada?: string | null }) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], []);

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns,
    searchPlaceholder: '',
    searchFields: [
      { key: 'id', label: 'ID' },
      { key: 'nome', label: 'Nome' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'tipo_banco', label: 'Tipo de Banco' },
      { key: 'sandbox', label: 'Sandbox' },
      { key: 'ativo', label: 'Status' }
    ],
    multiSelect: false
  });

  // Hook para buscar bancos usando parâmetros do useTableFilters
  const { data: bancosData, isLoading, refetch } = useBancos({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    tipo_banco: undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const deleteBancoMutation = useDeleteBanco();

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (bancosData?.pagination && typeof bancosData.pagination === 'object') {
      const pag = bancosData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
      
      // Calcular last_page se não estiver definido
      let lastPage = pag.last_page;
      if (!lastPage && total > 0) {
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else if (!lastPage) {
        lastPage = 1;
      }
      
      return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total: total,
        from: pag.from ?? ((currentPage - 1) * perPage) + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total)
      };
    }
    return {
      current_page: tableFilters.page,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [bancosData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleSelect = useCallback((selectedItems?: Banco[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
    if (item) {
      clearSelection();
      if (onSelectBanco) {
        onSelectBanco(item);
        onClose();
      }
    }
  }, [selectedBanco, clearSelection, onSelectBanco, onClose]);

  const handleDelete = useCallback(async (bancoId: number) => {
    try {
      await deleteBancoMutation.mutateAsync(bancoId);
      refetch();
    } catch (error) {
      // Erro tratado pelo useNotificationContext
    }
  }, [deleteBancoMutation, refetch]);

  const handleAudit = useCallback((banco: Banco) => {
    auditoria.handleAudit('Banco', banco.id);
  }, [auditoria]);

  // Bulk actions memoizados
  const bulkActions = useMemo(() => onSelectBanco ? [
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
      disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
      action: (selectedItems: Banco[]) => handleSelect(selectedItems)
    }
  ] : [
    {
      label: 'Novo',
      variant: 'primary' as const,
      action: () => {
        setSelectedBancoId(null);
        setShowBancoModal(true);
      }
    },
    {
      label: 'Editar',
      variant: 'primary' as const,
      disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
      action: (selectedItems: Banco[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
        if (item) {
          setSelectedBancoId(item.id);
          setShowBancoModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: Banco[]) => selectedItems.length === 0 && !selectedBanco,
      action: async (selectedItems: Banco[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedBanco;
        if (!item) return;
        
        const confirmed = await confirm({
          message: 'Tem certeza que deseja excluir este banco?',
          variant: 'danger',
          title: 'Excluir banco',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
        });
        
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectBanco, selectedBanco, clearSelection, onClose, handleSelect, handleDelete, confirm]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch, tableFilters.setSearchField]);

  const handleSearchFieldChange = useCallback((field: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearchField]);

  const handlePageChange = useCallback((page: number) => {
    tableFilters.setPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setPage]);

  const handleLimitChange = useCallback((limit: number) => {
    tableFilters.setLimit(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setLimit]);

  const modalData = useMemo(() => bancosData?.data || [], [bancosData?.data]);

  return (
    <>
      <ListModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        config={modal.config}
        data={modalData}
        loading={isLoading}
        selectedItems={selectedBanco ? [selectedBanco] : []}
        onSelectionChange={handleSelectionChange}
        onRowDoubleClick={(banco) => {
          // Double-click seleciona o item e fecha o modal
          if (onSelectBanco) {
            onSelectBanco(banco);
            onClose();
          }
        }}
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        onSearchFieldChange={handleSearchFieldChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        limit={tableFilters.limit}
        onLimitChange={handleLimitChange}
        refreshQueryKeys={['bancos']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="Banco"
        skipWrapper={skipWrapper}
      />

      {/* Modal Unificado (Criação e Edição) */}
      <BancoModal
        show={showBancoModal}
        onClose={() => {
          setShowBancoModal(false);
          setSelectedBancoId(null);
        }}
        bancoId={selectedBancoId}
        onSuccess={(banco) => {
          refetch();
          setSelectedBancoId(banco.id);
        }}
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-banco-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default BancoListModal;
