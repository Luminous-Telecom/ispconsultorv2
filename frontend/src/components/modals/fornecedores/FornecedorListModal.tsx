import React, { useState, useCallback, useMemo } from 'react';
import { useFornecedores, useDeleteFornecedor } from '@/hooks/useFornecedores';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useI18n } from '@/contexts/I18nContext';
import { formatDateTime } from '@/utils/formatters';
import { Fornecedor } from '@/types';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
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
  title,
  skipWrapper = false 
}) => {
  const { t } = useI18n();
  const defaultTitle = title || t('menu.suppliers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);
  
  // Hook de auditoria
  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();
  
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

  // Configurar colunas memoizadas para Table
  const tableColumns: TableConfig<Fornecedor & { created_at?: string; created_at_formatada?: string | null }>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: Fornecedor) => <span className="text-nowrap">{item.id ?? '-'}</span>
    },
    {
      key: 'tipo_pessoa',
      label: t('table.personTypeShort'),
      sortable: true,
      width: '90px',
      badgeLabels: [t('table.personTypeLegalShort'), t('table.personTypePhysicalShort')],
      render: (item: Fornecedor) => (
        <span className={`badge ${item.tipo_pessoa === 'JURIDICA' ? 'bg-info' : 'bg-primary'}`}>
          {item.tipo_pessoa === 'JURIDICA' ? t('table.personTypeLegalShort') : t('table.personTypePhysicalShort')}
        </span>
      )
    },
    {
      key: 'nome_razao_social',
      label: t('table.nameCompanyNameShort'),
      sortable: true,
      width: '200px',
      render: (item: Fornecedor) => (
        item.nome_razao_social
      )
    },
    {
      key: 'nome_fantasia',
      label: t('table.tradeNameShort'),
      width: '180px',
      sortable: true,
      render: (item: Fornecedor) => (
        <span className="text-muted">{item.nome_fantasia || '-'}</span>
      )
    },
    {
      key: 'cpf_cnpj',
      label: t('table.cpfCnpj'),
      sortable: true,
      width: '150px',
      render: (item: Fornecedor) => (
        <span className="text-nowrap">{item.cpf_cnpj}</span>
      )
    },
    {
      key: 'cep',
      label: t('table.zipCodeShort'),
      sortable: true,
      width: '120px',
      render: (item: Fornecedor) => (
        <span className="text-nowrap">{item.cep || '-'}</span>
      )
    },
    {
      key: 'logradouro',
      label: t('table.streetShort'),
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.logradouro || '-'}</span>
      )
    },
    {
      key: 'numero',
      label: t('table.number'),
      sortable: true,
      width: '100px',
      render: (item: Fornecedor) => (
        <span>{item.numero || '-'}</span>
      )
    },
    {
      key: 'complemento',
      label: t('table.complement'),
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.complemento || '-'}</span>
      )
    },
    {
      key: 'bairro',
      label: t('table.neighborhood'),
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.bairro || '-'}</span>
      )
    },
    {
      key: 'cidade',
      label: t('table.city'),
      sortable: true,
      render: (item: Fornecedor) => (
        <span>{item.cidade || '-'}</span>
      )
    },
    {
      key: 'estado',
      label: t('table.state'),
      sortable: true,
      width: '80px',
      render: (item: Fornecedor) => (
        <span>{item.estado || '-'}</span>
      )
    },
    {
      key: 'pais',
      label: t('table.country'),
      sortable: true,
      width: '100px',
      render: (item: Fornecedor) => (
        <span>{item.pais || '-'}</span>
      )
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      render: (item: Fornecedor & { created_at?: string; created_at_formatada?: string | null }) => {
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [t]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'nome_razao_social', label: t('table.nameCompanyNameShort') },
    { key: 'nome_fantasia', label: t('table.tradeNameShort') },
    { key: 'cpf_cnpj', label: t('table.cpfCnpj') },
    { key: 'cep', label: t('table.zipCodeShort') },
    { key: 'logradouro', label: t('table.streetShort') },
    { key: 'bairro', label: t('table.neighborhood') },
    { key: 'cidade', label: t('table.city') },
    { key: 'estado', label: t('table.state') },
    { key: 'pais', label: t('table.country') }
  ];

  const { data: fornecedoresData, isLoading, refetch } = useFornecedores({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
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
        label: t('buttons.cancel'),
        variant: 'primary' as const,
        action: () => {
          clearSelection();
          onClose();
        }
      },
      {
        label: t('buttons.select'),
        variant: 'primary' as const,
        disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0 && !selectedItem,
        action: (selectedItems: Fornecedor[]) => handleSelect(selectedItems)
      }
    ] : [
      {
        label: t('actions.create'),
        variant: 'primary' as const,
        action: () => setShowCreateModal(true)
      },
      {
        label: t('actions.edit'),
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
        label: t('actions.delete'),
        disabled: (selectedItems: Fornecedor[]) => selectedItems.length === 0,
        action: async (selectedItems: Fornecedor[]) => {
          const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
          if (!item) return;
          
          const confirmed = window.confirm(t('messages.confirmDelete'));
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectFornecedor, selectedItem, clearSelection, onClose, handleSelect, handleDelete, t]);

  const modalData = useMemo(() => (fornecedoresData?.data || []).filter(item => item.id != null), [fornecedoresData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  const modalContent = (
    <>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title={defaultTitle}
            config={{
              columns: tableColumns,
              data: modalData,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: t('layout.searchPlaceholder'),
              searchFields,
              sortable: true,
              sortColumn: tableFilters.sortColumn,
              sortDirection: tableFilters.sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled,
                variant: action.variant
              })),
              emptyMessage: 'Nenhum fornecedor encontrado',
              pagination: pagination
            }}
            tableId="fornecedores-list-modal"
            onSelectionChange={(items) => {
              handleSelectionChange(items);
            }}
            onRowClick={onSelectFornecedor ? (item) => {
              onSelectFornecedor(item);
              onClose();
            } : undefined}
            onRowDoubleClick={(fornecedor) => {
              if (onSelectFornecedor) {
                onSelectFornecedor(fornecedor);
                onClose();
              }
            }}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="Fornecedor"
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onSort={(column, direction) => tableFilters.setSort(column, direction)}
            onSearch={(search, field) => handleSearchChange(search, field)}
            search={tableFilters.search}
          />
        </div>
      </div>
    </>
  );

  // Modais auxiliares (sempre renderizados, independente de skipWrapper)
  const auxiliaryModals = (
    <>
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
        title={t('financial.executionLogs')}
        modalId="auditoria-fornecedor-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {auxiliaryModals}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={defaultTitle}
        size="lg"
        modalId="fornecedores-list-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {auxiliaryModals}
    </>
  );
};

export default FornecedorListModal;
