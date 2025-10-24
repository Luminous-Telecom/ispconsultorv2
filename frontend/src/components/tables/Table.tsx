import React, { useState, useRef, useEffect } from 'react';
import { TableConfig, TableColumn as TableColumnType, TableAction, BulkAction, SortDirection } from './types';
import { useTable } from './useTable';
import TableColumn from './TableColumn';
import TableActions from './TableActions';
import TablePagination from './TablePagination';
import TableFilters from './TableFilters';
import FormField from '../ui/FormField';
import Button from '../ui/Button';

interface TableProps<T = any> {
  config: TableConfig<T>;
  onActionClick?: (action: TableAction<T>, item: T, index: number) => void;
  onBulkActionClick?: (action: BulkAction<T>, selectedItems: T[]) => void;
  onRowClick?: (item: T, index: number) => void;
  onSelectionChange?: (selectedItems: T[]) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSearch?: (term: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRefresh?: () => void;
  className?: string;
}

const Table = <T extends { id: number | string }>({
  config,
  onActionClick,
  onBulkActionClick,
  onRowClick,
  onSelectionChange,
  onSort,
  onFilter,
  onSearch,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  className = '',
}: TableProps<T>) => {
  const {
    columns,
    data,
    loading = false,
    pagination,
    filters = [],
    actions = [],
    bulkActions = [],
    searchable = true,
    searchPlaceholder = 'Buscar...',
    sortable = true,
    selectable = true,
    multiSelect = false,
    emptyMessage = 'Nenhum dado encontrado',
    loadingMessage = 'Carregando...',
    size = 'md',
    variant = 'default',
    striped = false,
    hover = true,
    bordered = false,
    borderless = false,
    responsive = true,
    stickyHeader = false,
    stickyActions = false,
  } = config;

  // Usar o hook useTable
  const {
    state,
    actions: tableActions,
    paginatedData,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isAllSelected,
    isPartiallySelected,
  } = useTable({
    data,
    columns,
    pagination,
    filters,
    searchable,
    sortable,
    selectable,
    multiSelect,
    onSelectionChange,
    onSort,
    onFilter,
    onSearch,
    onPageChange,
    onPageSizeChange,
    onRefresh,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);

  // Sincronizar busca local com o hook
  useEffect(() => {
    if (searchTerm !== state.searchTerm) {
      tableActions.setSearchTerm(searchTerm);
    }
  }, [searchTerm, state.searchTerm, tableActions]);

  // Construir classes da tabela
  const getTableClasses = () => {
    const classes = ['table'];
    
    if (size !== 'md') {
      classes.push(`table-${size}`);
    }
    
    if (variant !== 'default') {
      classes.push(`table-${variant}`);
    }
    
    if (striped) {
      classes.push('table-striped');
    }
    
    if (hover) {
      classes.push('table-hover');
    }
    
    if (bordered) {
      classes.push('table-bordered');
    }
    
    if (borderless) {
      classes.push('table-borderless');
    }
    
    return classes.join(' ');
  };

  // Construir classes do container
  const getContainerClasses = () => {
    const classes = ['table-container'];
    
    if (responsive) {
      classes.push('table-responsive');
    }
    
    if (stickyHeader) {
      classes.push('sticky-header');
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Renderizar cabeçalho da tabela
  const renderTableHeader = () => {
    return (
      <thead className={stickyHeader ? 'sticky-top' : ''}>
        <tr>
          {/* Checkbox de seleção múltipla */}
          {selectable && multiSelect && (
            <th className="selection-column">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={() => {
                    if (isAllSelected) {
                      tableActions.clearSelection();
                    } else {
                      tableActions.selectAll();
                    }
                  }}
                />
              </div>
            </th>
          )}
          
          {/* Colunas */}
          {columns
            .filter(col => !col.hidden)
            .map(column => (
              <TableColumn
                key={column.key}
                column={column}
                sortColumn={state.sortColumn}
                sortDirection={state.sortDirection}
                onSort={tableActions.setSort}
              />
            ))}
          
          {/* Coluna de ações */}
          {actions.length > 0 && (
            <th className="actions-column">
              Ações
            </th>
          )}
        </tr>
      </thead>
    );
  };

  // Renderizar corpo da tabela
  const renderTableBody = () => {
    if (loading) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="text-center py-4">
              <div className="d-flex align-items-center justify-content-center">
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
                {loadingMessage}
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (paginatedData.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="text-center py-4">
              <div className="text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                {emptyMessage}
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {paginatedData.map((item, index) => {
          const isSelected = state.selectedItems.some(selected => selected.id === item.id);
          
          return (
            <tr
              key={item.id}
              className={`table-row ${isSelected ? 'table-row-selected' : ''}`}
              onClick={() => onRowClick?.(item, index)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {/* Checkbox de seleção */}
              {selectable && (
                <td className="selection-column">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => tableActions.toggleSelection(item)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </td>
              )}
              
              {/* Células de dados */}
              {columns
                .filter(col => !col.hidden)
                .map(column => (
                  <td
                    key={column.key}
                    className={column.className}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                      textAlign: column.align,
                    }}
                  >
                    {column.render ? column.render(item, index) : String(item[column.key as keyof T] || '')}
                  </td>
                ))}
              
              {/* Célula de ações */}
              {actions.length > 0 && (
                <td className="actions-column">
                  <TableActions
                    item={item}
                    index={index}
                    actions={actions}
                    onActionClick={onActionClick}
                  />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    );
  };

  // Renderizar barra de ferramentas
  const renderToolbar = () => {
    return (
      <div className="table-toolbar d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          {/* Busca */}
          {searchable && (
            <div className="search-box" style={{ minWidth: '300px' }}>
              <FormField
                type="text"
                name="search"
                value={searchTerm}
                onChange={(val) => setSearchTerm(val)}
                placeholder={searchPlaceholder}
                icon="search"
                size="sm"
              />
            </div>
          )}
          
          {/* Ações em massa */}
          {bulkActions.length > 0 && state.selectedItems.length > 0 && (
            <TableActions
              bulkActions={bulkActions}
              selectedItems={state.selectedItems}
              onBulkActionClick={onBulkActionClick}
            />
          )}
        </div>
        
        <div className="d-flex align-items-center gap-2">
          {/* Botão de refresh */}
          <Button
            variant="outline-secondary"
            size="sm"
            icon="arrow-clockwise"
            onClick={tableActions.refresh}
            disabled={loading}
            tooltip="Atualizar"
          >
            {''}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={getContainerClasses()}>
      {/* Barra de ferramentas */}
      {renderToolbar()}
      
      {/* Filtros */}
      {filters.length > 0 && (
        <TableFilters
          filters={filters}
          values={state.filters}
          onFilterChange={tableActions.setFilter}
          onFiltersChange={tableActions.setFilters}
          onClearFilters={tableActions.clearFilters}
          className="mb-3"
        />
      )}
      
      {/* Tabela */}
      <table ref={tableRef} className={getTableClasses()}>
        {renderTableHeader()}
        {renderTableBody()}
      </table>
      
      {/* Paginação */}
      {pagination && totalPages > 1 && (
        <div className="mt-3">
          <TablePagination
            pagination={pagination}
            onPageChange={tableActions.setPage}
            onPageSizeChange={tableActions.setPageSize}
          />
        </div>
      )}
    </div>
  );
};

export default Table;
