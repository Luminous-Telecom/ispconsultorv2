import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TableConfig, TableAction, BulkAction, SortDirection } from './types';
import { FilterValue } from '../../types/common';
import { useTable } from './useTable';
import TableColumn from './TableColumn';
import TableActions from './TableActions';
import FormField from '../ui/FormField';
import Button from '../ui/Button';

interface TableProps<T = Record<string, unknown>> {
  config: TableConfig<T>;
  onActionClick?: (action: TableAction<T>, item: T, index: number) => void;
  onBulkActionClick?: (action: BulkAction<T>, selectedItems: T[]) => void;
  onRowClick?: (item: T, index: number) => void;
  onSelectionChange?: (selectedItems: T[]) => void;
  onSort?: (column: string, direction: SortDirection) => void;
  onFilter?: (filters: Record<string, FilterValue>) => void;
  onSearch?: (term: string) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRefresh?: () => void;
  className?: string;
  tableId?: string;
}

function Table<T extends { id: number | string }>({
  config,
  onActionClick: _onActionClick,
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
  tableId
}: TableProps<T>) {
  // Gerar ID único para a tabela
  const uniqueTableId = tableId || `table-${Math.random().toString(36).substr(2, 9)}`;
  
  const {
    columns,
    data,
    loading = false,
    pagination: configPagination,
    filters = [],
    actions: _actions = [],
    bulkActions = [],
    searchable = true,
    searchPlaceholder = 'Buscar...',
    sortable = true,
    selectable = true,
    multiSelect = false,
    emptyMessage = 'Nenhum dado encontrado',
    loadingMessage: _loadingMessage = 'Carregando...',
    size: _size = 'md',
    variant: _variant = 'default',
    striped: _striped = false,
    hover: _hover = false,
    bordered: _bordered = false,
    borderless: _borderless = false,
    responsive: _responsive = true,
    stickyHeader: _stickyHeader = false,
    stickyActions: _stickyActions = false,
    customControls,
    customFilters,
  } = config;

  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const _tableRef = useRef<HTMLTableElement>(null);

  // Memoizar dados filtrados para evitar loops infinitos
  const filteredData = useMemo(() => {
    if (!customFilters) return data;
    return customFilters(data);
  }, [data, customFilters]);
  const {
    state,
    actions: tableActions,
    paginatedData,
    totalPages,
    hasNextPage,
    hasPreviousPage: _hasPreviousPage,
    isAllSelected: _isAllSelected,
    isPartiallySelected: _isPartiallySelected,
  } = useTable({
    data: filteredData,
    columns,
    pagination: configPagination,
    filters,
    searchable,
    sortable,
    selectable,
    multiSelect,
    onSelectionChange: (selectedItems) => {
      // Atualizar estado local e chamar callback externo
      onSelectionChange?.(selectedItems);
    },
    onSort,
    onFilter,
    onSearch,
    onPageChange,
    onPageSizeChange,
    onRefresh,
  });

  // Sincronizar busca local com o hook
  useEffect(() => {
    if (searchTerm !== state.searchTerm) {
      tableActions.setSearchTerm(searchTerm);
    }
  }, [searchTerm, state.searchTerm, tableActions]);

  // Conectar busca com callback externo
  useEffect(() => {
    if (onSearch && searchTerm !== state.searchTerm) {
      onSearch(searchTerm);
    }
  }, [searchTerm, onSearch, state.searchTerm]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Construir classes da tabela
  const _getTableClasses = () => {
    const classes = ['table'];
    
    if (_size !== 'md') {
      classes.push(`table-${_size}`);
    }
    
    if (_variant !== 'default') {
      classes.push(`table-${_variant}`);
    }
    
    if (_striped) {
      classes.push('table-striped');
    }
    
    if (_hover) {
      classes.push('table-hover');
    }
    
    if (_bordered) {
      classes.push('table-bordered');
    }
    
    if (_borderless) {
      classes.push('table-borderless');
    }
    
    return classes.join(' ');
  };

  // Construir classes do container
  const _getContainerClasses = () => {
    const classes = ['table-container'];
    
    if (_responsive) {
      classes.push('table-responsive');
    }
    
    if (_stickyHeader) {
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
      <thead>
        <tr>
          {/* Checkbox de seleção - renderiza sempre que selectable for true */}
          {selectable && (
            <th className="py-1 px-2" style={{ fontSize: '0.75rem', padding: '0.5rem', width: '40px', textTransform: 'none' }}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`select-all-${Math.random().toString(36).substr(2, 9)}`}
                name="selectAll"
                checked={_isAllSelected}
                onChange={() => {
                  if (_isAllSelected) {
                    tableActions.clearSelection();
                  } else {
                    tableActions.selectAll();
                  }
                }}
              />
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
            <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center">
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Carregando...</span>
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
            <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center">
              {emptyMessage}
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
              className={isSelected ? 'table-active' : ''}
              onClick={() => {
                // Selecionar/deselecionar item ao clicar na linha
                if (selectable) {
                  tableActions.toggleSelection(item);
                }
                // Chamar callback de clique na linha se existir
                onRowClick?.(item, index);
              }}
              style={{ 
                cursor: 'pointer',
                backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                color: isSelected ? 'white' : 'inherit'
              }}
            >
              {/* Checkbox de seleção */}
              {selectable && (
                <td 
                  className="py-1 px-2"
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.5rem',
                    backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                    color: isSelected ? 'white' : 'inherit',
                    width: '40px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => tableActions.toggleSelection(item)}
                    id={`${uniqueTableId}-checkbox-${item.id}`}
                    name={`${uniqueTableId}-checkbox-${item.id}`}
                  />
                </td>
              )}
              
              {/* Células de dados */}
              {columns
                .filter(col => !col.hidden)
                .map(column => (
                  <td
                    key={column.key}
                    className="py-1 px-2"
                    style={{
                      fontSize: '0.75rem', 
                      padding: '0.5rem',
                      backgroundColor: isSelected ? '#0d6efd' : 'inherit',
                      color: isSelected ? 'white' : 'inherit',
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                      textAlign: column.align,
                    }}
                  >
                    {column.render ? column.render(item, index) : String(item[column.key as keyof T] || '')}
                  </td>
                ))}
              
            </tr>
          );
        })}
      </tbody>
    );
  };

  // Renderizar barra de ferramentas
  const _renderToolbar = () => {
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
                onChange={(val) => setSearchTerm(val as string)}
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
    <div className={className} style={{ width: '100%', margin: 0, padding: 0, boxSizing: 'border-box' }}>
      {/* Header com botões de ação e filtros */}
      {(bulkActions.length > 0 || searchable || configPagination || (!configPagination && data.length > 0)) && (
        <div className="border-bottom" style={{ margin: 0, padding: 0, background: 'transparent' }}>
          {/* Primeira linha: Botões de ação */}
          {bulkActions.length > 0 && (
            <div className="d-flex align-items-center mb-2" style={{ padding: '0.5rem 1rem' }}>
              <div className="d-flex" style={{ gap: '8px' }}>
                {bulkActions.map((bulkAction, index) => {
              // Novo sempre habilitado, outros só quando há seleção
              const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
              const isImprimirButton = bulkAction.label.toLowerCase().includes('imprimir');
              const isDisabledBySelection = !isNewButton && !isImprimirButton && state.selectedItems.length === 0;
              const isDisabledByCondition = bulkAction.disabled && typeof bulkAction.disabled === 'function' ? bulkAction.disabled(state.selectedItems) : false;
              const isDisabled = isDisabledBySelection || isDisabledByCondition;
              
              // Se tem dropdown, renderizar dropdown
              if (bulkAction.dropdown) {
                return (
                  <div key={index} className="dropdown" style={{ flexShrink: 0, position: 'relative' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenDropdown(openDropdown === index ? null : index);
                      }}
                      disabled={isDisabled}
                      style={{ flexShrink: 0 }}
                    >
                      {bulkAction.label} <i className="bi bi-chevron-down ms-1"></i>
                    </button>
                    {openDropdown === index && (
                      <ul 
                        className="dropdown-menu show" 
                        style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1050 }}
                      >
                        {bulkAction.dropdown.map((item, itemIndex) => (
                          <li key={itemIndex}>
                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                item.action();
                                setOpenDropdown(null);
                              }}
                            >
                              {item.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              }
              
              // Botão normal
              return (
                <button
                  type="button"
                  key={index}
                  className="btn btn-sm btn-primary"
                  onClick={(_event) => {
                    if (!isDisabled && bulkAction.onClick) {
                      bulkAction.onClick(state.selectedItems);
                    }
                  }}
                  disabled={isDisabled}
                  style={{ flexShrink: 0 }}
                >
                  {bulkAction.label}
                </button>
              );
            })}
          </div>
        </div>
          )}

        {/* Segunda linha: Busca + Paginação + Reload */}
        <div className="d-flex align-items-center justify-content-between" style={{ padding: '0 1rem 0.5rem 1rem' }}>
          {/* Busca e controles customizados à esquerda */}
          <div className="d-flex align-items-center gap-3">
            {searchable && (
              <div className="d-flex align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  id={`search-${Math.random().toString(36).substr(2, 9)}`}
                  name="search"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '400px', height: '32px' }}
                />
              </div>
            )}
            {customControls}
          </div>

          {/* Paginação centralizada */}
          {(configPagination || (!configPagination && data.length > 0)) && (
            <div className="d-flex align-items-center gap-2">
              {/* Seletor de linhas por página */}
              <select 
                className="form-select form-select-sm" 
                id={`${uniqueTableId}-limit`}
                name="dataTableLimit"
                value={configPagination?.per_page || state.pageSize}
                onChange={(e) => {
                  const newPageSize = parseInt(e.target.value);
                  if (configPagination) {
                    // Quando há paginação do servidor, resetar página para 1 ao mudar limite
                    onPageChange?.(1);
                    onPageSizeChange?.(newPageSize);
                  } else {
                    tableActions.setPageSize(newPageSize);
                  }
                }}
                style={{ width: '80px', height: '32px', cursor: 'pointer' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              {/* Paginação compacta */}
              <div className="d-flex align-items-center gap-1">
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (configPagination) {
                      onPageChange?.(1);
                    } else {
                      tableActions.setPage(1);
                    }
                  }}
                  disabled={configPagination ? configPagination.current_page <= 1 : state.currentPage <= 1}
                >
                  <i className="bi bi-chevron-double-left"></i>
                </button>
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (configPagination) {
                      onPageChange?.(configPagination.current_page - 1);
                    } else {
                      tableActions.setPage(state.currentPage - 1);
                    }
                  }}
                  disabled={configPagination ? configPagination.current_page <= 1 : state.currentPage <= 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                
                <span className="small text-muted mx-2">
                  {configPagination ? (
                    `${configPagination.from || 0} - ${configPagination.to || 0} / ${configPagination.total || 0}`
                  ) : (
                    `${((state.currentPage - 1) * state.pageSize) + 1}-${Math.min(state.currentPage * state.pageSize, data.length)} de ${data.length}`
                  )}
                </span>
                
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (configPagination) {
                      onPageChange?.(configPagination.current_page + 1);
                    } else {
                      tableActions.setPage(state.currentPage + 1);
                    }
                  }}
                  disabled={configPagination ? configPagination.current_page >= configPagination.last_page : !hasNextPage}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
                <button 
                  type="button"
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => {
                    if (configPagination) {
                      onPageChange?.(configPagination.last_page);
                    } else {
                      tableActions.setPage(totalPages);
                    }
                  }}
                  disabled={configPagination ? configPagination.current_page >= configPagination.last_page : !hasNextPage}
                >
                  <i className="bi bi-chevron-double-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* Botão de reload à direita */}
          <div className="d-flex align-items-center">
            <button 
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onRefresh}
              title="Recarregar dados"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Tabela */}
      <div className="table-responsive" style={{ margin: 0, padding: 0, overflowX: 'auto', width: '100%', boxSizing: 'border-box', maxWidth: '100%' }}>
        <table className="table table-striped table-sm" style={{ width: '100%', tableLayout: 'auto', margin: 0 }}>
          {renderTableHeader()}
          {renderTableBody()}
        </table>
      </div>
    </div>
  );
};

// Componente já usa useMemo e useCallback internamente para otimização
export default Table;
