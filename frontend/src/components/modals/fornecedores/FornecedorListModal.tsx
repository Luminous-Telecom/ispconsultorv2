/* eslint-disable no-console */
import React, { useState, useCallback, useMemo } from 'react';
import { useFornecedores, useDeleteFornecedor } from '@/hooks/useFornecedores';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDateTime } from '@/utils/formatters';
import { Fornecedor } from '@/types';
import ListModal from '@/components/common/ListModal';
import FornecedorModal from './FornecedorModal';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface FornecedorListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectFornecedor?: (fornecedor: Fornecedor) => void;
  title?: string;
  skipWrapper?: boolean;
}

const FornecedorListModal: React.FC<FornecedorListModalProps> = ({ 
  show, 
  onClose, 
  onSelectFornecedor,
  title = "Fornecedores",
  skipWrapper: _skipWrapper 
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  
  // Hook de auditoria
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
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Fornecedor>(
    onSelectFornecedor ? (fornecedor) => {
      onSelectFornecedor(fornecedor);
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
      render: (item: Fornecedor) => <span className="text-nowrap">{item.id ?? '-'}</span>
    },
    {
      key: 'tipo_pessoa',
      label: 'Tipo',
      sortable: true,
      width: '90px',
      render: (item: Fornecedor) => (
        <span className={`badge ${item.tipo_pessoa === 'JURIDICA' ? 'bg-info' : 'bg-primary'}`}>
          {item.tipo_pessoa === 'JURIDICA' ? 'Jurídica' : 'Física'}
        </span>
      )
    },
    {
      key: 'nome_razao_social',
      label: 'Nome/Razão Social',
      sortable: true,
      width: '200px',
      render: (item: Fornecedor) => (
        <strong>{item.nome_razao_social}</strong>
      )
    },
    {
      key: 'nome_fantasia',
      label: 'Nome Fantasia',
      width: '180px',
      sortable: true,
      render: (item: Fornecedor) => (
        <span className="text-muted">{item.nome_fantasia || '-'}</span>
      )
    },
    {
      key: 'cpf_cnpj',
      label: 'CPF/CNPJ',
      sortable: true,
      width: '150px',
      render: (item: Fornecedor) => (
        <span className="text-nowrap">{item.cpf_cnpj}</span>
      )
    },
    {
      key: 'cep',
      label: 'CEP',
      sortable: true,
      width: '120px',
      render: (item: Fornecedor) => (
        <span className="text-nowrap">{item.cep || '-'}</span>
      )
    },
    {
      key: 'logradouro',
      label: 'Logradouro',
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.logradouro || '-'}</span>
      )
    },
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      width: '100px',
      render: (item: Fornecedor) => (
        <span>{item.numero || '-'}</span>
      )
    },
    {
      key: 'complemento',
      label: 'Complemento',
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.complemento || '-'}</span>
      )
    },
    {
      key: 'bairro',
      label: 'Bairro',
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.bairro || '-'}</span>
      )
    },
    {
      key: 'cidade',
      label: 'Cidade',
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.cidade || '-'}</span>
      )
    },
    {
      key: 'estado',
      label: 'Estado',
      sortable: true,
      width: '80px',
      render: (item: Fornecedor) => (
        <span>{item.estado || '-'}</span>
      )
    },
    {
      key: 'pais',
      label: 'País',
      sortable: true,
      width: '100px',
      render: (item: Fornecedor) => (
        <span>{item.pais || '-'}</span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: Fornecedor & { created_at?: string; created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], []);

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns,
    searchPlaceholder: 'Buscar...',
    searchFields: [
      { key: 'nome_razao_social', label: 'Nome/Razão Social' },
      { key: 'nome_fantasia', label: 'Nome Fantasia' },
      { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
      { key: 'cep', label: 'CEP' },
      { key: 'logradouro', label: 'Logradouro' },
      { key: 'bairro', label: 'Bairro' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'Estado' },
      { key: 'pais', label: 'País' }
    ],
    multiSelect: true
  });

  // Hook para buscar fornecedores usando parâmetros do useTableFilters
  const { data: fornecedoresData, isLoading, refetch } = useFornecedores({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const deleteFornecedorMutation = useDeleteFornecedor();

  const handleSelect = useCallback((selectedItems?: Fornecedor[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectFornecedor) {
        onSelectFornecedor(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelectFornecedor, onClose]);

  const handleDelete = useCallback(async (fornecedorId: number) => {
    try {
      await deleteFornecedorMutation.mutateAsync(fornecedorId);
      refetch();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  }, [deleteFornecedorMutation, refetch]);

  const handleAudit = useCallback((fornecedor: Fornecedor) => {
    auditoria.handleAudit('Fornecedor', fornecedor.id);
  }, [auditoria]);

  // Paginação do backend
  const pagination = useMemo(() => {
    if (fornecedoresData?.pagination && typeof fornecedoresData.pagination === 'object') {
      const pag = fornecedoresData.pagination;
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
  }, [fornecedoresData?.pagination, tableFilters.page, tableFilters.limit]);

  // Bulk actions memoizados
  const bulkActions = useMemo(() => onSelectFornecedor ? [
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
      disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: Fornecedor[]) => handleSelect(selectedItems)
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
      disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0,
      action: (selectedItems: Fornecedor[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedFornecedorId(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0,
      action: async (selectedItems: Fornecedor[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (!item) return;
        
        const confirmed = await confirm({
          message: 'Tem certeza que deseja excluir este fornecedor?',
          variant: 'danger',
          title: 'Excluir fornecedor',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
        });
        
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectFornecedor, selectedItem, clearSelection, onClose, handleSelect, handleDelete, confirm]);

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

  const modalData = useMemo(() => (fornecedoresData?.data || []).filter(item => item.id != null), [fornecedoresData?.data]);

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
        selectedItems={selectedItem ? [selectedItem] : []}
        onSelectionChange={handleSelectionChange}
        search={tableFilters.search}
        onSearchChange={handleSearchChange}
        onSearchFieldChange={handleSearchFieldChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        limit={tableFilters.limit}
        onLimitChange={handleLimitChange}
        refreshQueryKeys={['fornecedores']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="Fornecedor"
        skipWrapper={_skipWrapper}
      />

      {showCreateModal && (
        <FornecedorModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
            // Não fechar o modal automaticamente - permitir múltiplas edições
          }}
        />
      )}

      {showEditModal && selectedFornecedorId && (
        <FornecedorModal
          show={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedFornecedorId(null);
          }}
          fornecedorId={selectedFornecedorId}
          onSuccess={() => {
            refetch();
            // Não fechar o modal automaticamente - permitir múltiplas edições
          }}
        />
      )}

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-fornecedor-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default FornecedorListModal;
