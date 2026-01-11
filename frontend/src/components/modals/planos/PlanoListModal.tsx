import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlanos, useDeletePlano } from '@/hooks/usePlanos';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useListModal } from '@/hooks/useListModal';
import { useTableFilters } from '@/hooks/useTableFilters';
import { Plano } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import ListModal from '@/components/common/ListModal';
import PlanoModal from './PlanoModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface PlanoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectPlano?: (plano: Plano) => void;
  title?: string;
  skipWrapper?: boolean;
}

const PlanoListModal: React.FC<PlanoListModalProps> = ({ 
  show, 
  onClose, 
  onSelectPlano,
  title = "Selecionar Plano",
  skipWrapper = false
}) => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  
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
  } = useModalSelect<Plano>(
    onSelectPlano ? (plano) => {
      onSelectPlano(plano);
      onClose();
    } : undefined
  );

  const getStatusBadgeClass = useCallback((status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success';
      case 'inativo': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }, []);

  const getTipoServicoLabel = useCallback((tipo: string) => {
    const tipos: { [key: string]: string } = {
      infraestrutura: 'Infraestrutura',
      consultoria: 'Consultoria'
    };
    return tipos[tipo] || tipo;
  }, []);

  // Configurar colunas memoizadas
  const columns = useMemo(() => [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '42px',
      render: (item: Plano) => <span>{item.id}</span>
    },
    {
      key: 'nome_plano',
      label: 'Nome do Plano',
      sortable: true,
      width: '180px',
      render: (item: Plano) => <strong>{item.nome_plano}</strong>
    },
    {
      key: 'descricao',
      label: 'Descrição',
      sortable: true,
      width: '200px',
      render: (item: Plano) => item.descricao || '-'
    },
    {
      key: 'tipo_servico',
      label: 'Tipo de Serviço',
      sortable: true,
      width: '130px',
      render: (item: Plano) => (
        <span className="badge bg-info">
          {getTipoServicoLabel(item.tipo_servico)}
        </span>
      )
    },
    {
      key: 'valor_mensal',
      label: 'Valor Mensal',
      sortable: true,
      render: (item: Plano) => (
        <span className="fw-bold text-success">
          R$ {Number(item.valor_mensal || 0).toFixed(2).replace('.', ',')}
        </span>
      )
    },
    {
      key: 'quantidade_usuarios',
      label: 'Usuários',
      sortable: true,
      render: (item: Plano) => (
        <span>{item.quantidade_usuarios || '-'}</span>
      )
    },
    {
      key: 'quantidade_clientes',
      label: 'Clientes',
      sortable: true,
      render: (item: Plano) => (
        <span className="badge bg-primary">
          {item.quantidade_clientes ?? (item.clientes ? item.clientes.length : 0)}
        </span>
      )
    },
    {
      key: 'periodicidade',
      label: 'Periodicidade',
      sortable: true,
      render: (item: Plano) => (
        <span className="text-capitalize">{item.periodicidade || '-'}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (item: Plano) => (
        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (item: Plano & { created_at?: string; created_at_formatada?: string | null }) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ], [getTipoServicoLabel, getStatusBadgeClass]);

  // Configurar modal centralizado
  const modal = useListModal({
    title,
    columns,
    searchPlaceholder: '',
    searchFields: [
      { key: 'id', label: 'ID' },
      { key: 'nome_plano', label: 'Nome do Plano' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'tipo_servico', label: 'Tipo de Serviço' },
      { key: 'valor_mensal', label: 'Valor Mensal' },
      { key: 'quantidade_usuarios', label: 'Quantidade Usuários' },
      { key: 'periodicidade', label: 'Periodicidade' },
      { key: 'status', label: 'Status' }
    ],
    multiSelect: true
  });

  // Hook para buscar planos usando parâmetros do useTableFilters
  const { data: planosData, isLoading, refetch } = usePlanos({
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit
  });

  const deletePlanoMutation = useDeletePlano();

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (planosData?.pagination && typeof planosData.pagination === 'object') {
      const pag = planosData.pagination;
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
  }, [planosData?.pagination, tableFilters.page, tableFilters.limit]);

  const handleSelect = useCallback((selectedItems?: Plano[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : selectedItem;
    if (item) {
      clearSelection();
      if (onSelectPlano) {
        onSelectPlano(item);
        onClose();
      }
    }
  }, [selectedItem, clearSelection, onSelectPlano, onClose]);

  const handleDelete = useCallback(async (planoId: number) => {
    try {
      await deletePlanoMutation.mutateAsync(planoId);
      refetch();
    } catch (error: unknown) {
      // Erro tratado pelo useNotificationContext
    }
  }, [deletePlanoMutation, refetch]);

  const handleAudit = useCallback((plano: Plano) => {
    auditoria.handleAudit('Plano', plano.id);
  }, [auditoria]);

  // Bulk actions memoizados
  const bulkActions = useMemo(() => onSelectPlano ? [
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
      disabled: (selectedItems: Plano[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: Plano[]) => handleSelect(selectedItems)
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
      disabled: (selectedItems: Plano[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: Plano[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setSelectedPlanoId(item.id);
          setShowEditModal(true);
        }
      }
    },
    {
      label: 'Excluir',
      variant: 'danger' as const,
      disabled: (selectedItems: Plano[]) => selectedItems.length === 0 && !selectedItem,
      action: async (selectedItems: Plano[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (!item) return;
        
        const confirmed = await confirm({
          message: 'Tem certeza que deseja excluir este plano?',
          variant: 'danger',
          title: 'Excluir plano',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
        });
        
        if (confirmed) {
          handleDelete(item.id);
        }
      }
    }
  ], [onSelectPlano, selectedItem, clearSelection, onClose, handleSelect, handleDelete, confirm]);

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

  const modalData = useMemo(() => planosData?.data || [], [planosData?.data]);

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
        refreshQueryKeys={['planos']}
        refreshQueryFn={refetch}
        bulkActions={bulkActions}
        onAudit={handleAudit}
        auditEntity="Plano"
        skipWrapper={skipWrapper}
      />

      {/* Modal de Criação/Edição unificado */}
      <PlanoModal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
        planoId={showEditModal ? selectedPlanoId : null}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['planos'] });
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPlanoId(null);
        }}
      />

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-plano-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );
};

export default PlanoListModal;