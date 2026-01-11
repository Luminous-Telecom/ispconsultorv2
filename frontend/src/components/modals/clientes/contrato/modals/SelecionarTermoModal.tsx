import React, { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useListModal } from '@/hooks/useListModal';
import { useModalSelect } from '@/hooks/useModalSelect';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useModelosTermo } from '@/hooks/useModelosTermo';
import ListModal from '@/components/common/ListModal';

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
  });

  const handleSearchChange = useCallback((search: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(search);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch]);

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

  // Configurar modal centralizado
  const modal = useListModal({
    title: 'Selecionar Termo Cadastrado',
    columns: [
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
        render: (termo: Termo) => <strong>{termo.nome}</strong>
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
    ],
    searchPlaceholder: 'Buscar termos...',
    multiSelect: false
  });

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
    
    return filtered;
  }, [termosSistema, tableFilters.debouncedSearch]);

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

  const handleInsert = (selectedItems?: Termo[]) => {
    const item = selectedItems && selectedItems.length > 0 ? selectedItems[0] : termoSelecionado;
    if (item) {
      onSelect(item);
      clearSelection();
      onClose();
    }
  };

  const bulkActions = [
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
  ];

  return (
    <ListModal
      show={show}
      onClose={() => {
        clearSelection();
        onClose();
      }}
      config={modal.config}
      data={paginatedTermos}
      loading={isLoadingTermos}
      selectedItems={termoSelecionado ? [termoSelecionado] : []}
      onSelectionChange={handleSelectionChange}
      search={tableFilters.search}
      onSearchChange={handleSearchChange}
      pagination={paginationTermos}
      onPageChange={tableFilters.setPage}
      limit={tableFilters.limit}
      onLimitChange={tableFilters.setLimit}
      onRefresh={() => {
        queryClient.invalidateQueries({ queryKey: ['modelos-termo'] });
      }}
      bulkActions={bulkActions}
    />
  );
};

export default SelecionarTermoModal;
