import React, { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useModelosTermo } from '@/hooks/useModelosTermo';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';

interface Termo {
  id: number;
  nome: string;
  ativo: boolean;
}

interface SelecionarTermoModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (termo: Termo) => void;
}

const SelecionarTermoModal: React.FC<SelecionarTermoModalProps> = ({
  show,
  onClose,
  onSelect
}) => {
  const queryClient = useQueryClient();
  
  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
    initialSortColumn: 'id',
    initialSortDirection: 'desc'
  });

  const { data: termosSistema, isLoading: isLoadingTermos } = useModelosTermo();

  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem: termoSelecionado,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<Termo>(
    onSelect ? (termo) => {
      onSelect(termo);
      onClose();
    } : undefined
  );

  // Configurar colunas
  const tableColumns: TableConfig<Termo>['columns'] = useMemo(() => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '42px',
        render: (termo: Termo) => <span>{termo.id}</span>
      },
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        render: (termo: Termo) => termo.nome
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        render: (termo: Termo) => (
          <span className={`badge ${termo.ativo ? 'bg-success' : 'bg-secondary'}`}>
            {termo.ativo ? 'Ativo' : 'Inativo'}
          </span>
        )
      }
    ], []);

  // Filtrar e ordenar termos
  const filteredTermos = useMemo(() => {
    if (!termosSistema) return [];
    
    let filtered = [...termosSistema];
    
    if (tableFilters.debouncedSearch) {
      const searchLower = tableFilters.debouncedSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.nome?.toLowerCase().includes(searchLower) ||
        t.id?.toString().includes(searchLower)
      );
    }

    // Ordenação no front-end (já que buscamos todos)
    if (tableFilters.sortColumn) {
      filtered.sort((a, b) => {
        const aValue = a[tableFilters.sortColumn as keyof Termo];
        const bValue = b[tableFilters.sortColumn as keyof Termo];

        if (aValue === bValue) return 0;
        
        const direction = tableFilters.sortDirection === 'asc' ? 1 : -1;
        
        if (aValue === null || aValue === undefined) return 1 * direction;
        if (bValue === null || bValue === undefined) return -1 * direction;
        
        return aValue < bValue ? -1 * direction : 1 * direction;
      });
    }
    
    return filtered;
  }, [termosSistema, tableFilters.debouncedSearch, tableFilters.sortColumn, tableFilters.sortDirection]);

  // Paginar termos
  const paginatedTermos = useMemo(() => {
    const startIndex = (tableFilters.page - 1) * tableFilters.limit;
    return filteredTermos.slice(startIndex, startIndex + tableFilters.limit);
  }, [filteredTermos, tableFilters.page, tableFilters.limit]);

  // Criar paginação manual
  const paginationTermos = {
    from: (tableFilters.page - 1) * tableFilters.limit + 1,
    to: Math.min(tableFilters.page * tableFilters.limit, filteredTermos.length),
    total: filteredTermos.length,
    current_page: tableFilters.page,
    last_page: Math.ceil(filteredTermos.length / tableFilters.limit),
    per_page: tableFilters.limit
  };

  const handleInsert = useCallback((selectedItems?: Termo[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : termoSelecionado;
    if (item) {
      onSelect(item);
      clearSelection();
      onClose();
    }
  }, [termoSelecionado, onSelect, clearSelection, onClose]);

  const bulkActions = useMemo(() => [
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
      disabled: (selectedItems: Termo[]) => selectedItems.length === 0 && !termoSelecionado,
      action: (selectedItems: Termo[]) => handleInsert(selectedItems)
    }
  ], [termoSelecionado, clearSelection, onClose, handleInsert]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
  }, [queryClient]);

  return (
    <DraggableModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
      title="Selecionar Termo Cadastrado"
      size="lg"
      modalId="selecionar-termo-modal"
      className="no-padding"
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            title="Selecionar Termo Cadastrado"
            config={{
              columns: tableColumns,
              data: paginatedTermos,
              loading: isLoadingTermos,
              searchable: true,
              searchPlaceholder: 'Buscar termos...',
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
              emptyMessage: 'Nenhum termo encontrado',
              pagination: paginationTermos
            }}
            tableId="selecionar-termo-table"
            onSelectionChange={(items) => {
              handleSelectionChange(items);
            }}
            onRowClick={(item) => {
              onSelect(item);
              onClose();
            }}
            onRefresh={handleRefresh}
            onPageChange={(page) => {
              setTimeout(() => {
                tableFilters.setPage(page);
              }, 0);
            }}
            onPageSizeChange={(limit) => {
              setTimeout(() => {
                tableFilters.setLimit(limit);
              }, 0);
            }}
            onSort={(column, direction) => {
              setTimeout(() => {
                tableFilters.setSort(column, direction);
              }, 0);
            }}
            onSearch={(search, field) => handleSearchChange(search, field)}
            search={tableFilters.search}
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default SelecionarTermoModal;
