import React, { useMemo } from 'react';
import DraggableModal from './DraggableModal';
import { Table } from '../tables';
import { ListModalProps } from '@/types/modal';

function ListModal<T extends { id: number | string }>({
  show,
  onClose,
  config,
  data,
  loading = false,
  selectedItems: _selectedItems = [],
  onSelectionChange,
  search: _search = '',
  onSearchChange,
  pagination,
  onPageChange,
  limit: _limit = 15,
  onLimitChange,
  onRefresh,
  bulkActions = []
}: ListModalProps<T>) {
  const {
    title,
    columns,
    searchPlaceholder = 'Buscar...',
    emptyMessage = 'Nenhum item encontrado',
    multiSelect = false
  } = config;

  // Converter colunas para o formato da Table (memoizado para evitar recriação)
  const tableColumns = useMemo(() => {
    return columns.map(col => ({
      key: col.key,
      label: col.label,
      sortable: col.sortable,
      searchable: col.searchable !== false, // Por padrão, todas as colunas são pesquisáveis, exceto se explicitamente definido como false
      width: col.width,
      render: col.render
    }));
  }, [columns]);

  // Se há paginação do servidor, a busca é feita no servidor via onSearchChange
  // Se não há paginação, permite busca local no Table
  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      className="no-padding"
    >
      <div>
        <Table
          config={{
            columns: tableColumns,
            data,
            loading,
            pagination,
            selectable: true,
            multiSelect,
            searchable: !!onSearchChange,
            searchPlaceholder,
            emptyMessage,
            className: 'no-padding',
            bulkActions: useMemo(() => {
              return bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: (selectedItems: T[]) => {
                  // Se action aceita selectedItems, passar; caso contrário, chamar sem parâmetros
                  if (action.action.length > 0) {
                    (action.action as (selectedItems: T[]) => void)(selectedItems);
                  } else {
                    (action.action as () => void)();
                  }
                },
                disabled: (selectedItems: T[]) => {
                  // Se disabled aceita selectedItems, passar; caso contrário, chamar sem parâmetros
                  if (action.disabled) {
                    if (action.disabled.length > 0) {
                      return (action.disabled as (selectedItems: T[]) => boolean)(selectedItems);
                    } else {
                      return (action.disabled as () => boolean)();
                    }
                  }
                  return false;
                }
              }));
            }, [bulkActions])
          }}
          onSelectionChange={onSelectionChange}
          onSearch={onSearchChange}
          onPageChange={onPageChange}
          onPageSizeChange={onLimitChange}
          onRefresh={onRefresh}
        />
      </div>
    </DraggableModal>
  );
}

export default ListModal;
