import React, { useState, useEffect } from 'react';

export interface Column<T = any> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface BulkAction<T = any> {
  label: string;
  action?: (selectedItems: T[], event?: React.MouseEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: (selectedItems: T[]) => boolean;
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}

interface TableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  isLoading: boolean;
  pagination?: {
    from: number;
    to: number;
    total: number;
    current_page: number;
    last_page: number;
  };
  limit: number;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  emptyMessage?: string;
  actions?: (item: T) => React.ReactNode;
  bulkActions?: BulkAction<T>[];
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  onSelectionChange?: (selectedItems: T[]) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onRefresh?: () => void;
  showHeader?: boolean;
}

const DataTable = <T extends { id: number | string }>(props: TableProps<T>) => {
  const {
    columns,
    data,
    isLoading,
    pagination,
    limit,
    setLimit,
    setPage,
    emptyMessage = 'Nenhum dado encontrado',
    bulkActions = [],
    onSearch,
    searchPlaceholder = 'Buscar...',
    onSelectionChange,
    onSort,
    sortColumn,
    sortDirection = 'asc',
    onRefresh,
    showHeader = true
  } = props;
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  // Limpar seleção quando os dados mudarem
  React.useEffect(() => {
    if (selectedItems.length > 0 && data.length > 0) {
      // Verificar se o item selecionado ainda existe nos dados
      const stillExists = data.some((item: T) => 
        selectedItems.some(selected => selected.id === item.id)
      );
      
      // Se não existe mais ou mudou, limpar seleção
      if (stillExists) {
        const currentItem = data.find((item: T) => item.id === selectedItems[0].id);
        if (currentItem && JSON.stringify(currentItem) !== JSON.stringify(selectedItems[0])) {
          setSelectedItems([]);
        }
      }
    }
  }, [data]);

  // Fechar dropdown ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Seleção via clique na linha (apenas um item)
  const handleRowClick = (item: T) => {
    const newSelection = [item];
    setSelectedItems(newSelection);
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  // Seleção via checkbox (múltiplos itens)
  const handleCheckboxChange = (item: T, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation(); // Evitar que dispare o click da linha
    
    const isAlreadySelected = selectedItems.some(selected => selected.id === item.id);
    let newSelection: T[];
    
    if (isAlreadySelected) {
      // Desmarcar
      newSelection = selectedItems.filter(selected => selected.id !== item.id);
    } else {
      // Marcar (adicionar à seleção)
      newSelection = [...selectedItems, item];
    }
    
    setSelectedItems(newSelection);
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleBulkAction = (action: (selectedItems: any[], event?: React.MouseEvent) => void, event?: React.MouseEvent) => {
    action(selectedItems, event);
    // Não limpar seleção após ação - manter linha selecionada
  };

  const goToFirstPage = () => setPage(1);
  const goToLastPage = () => setPage(pagination?.last_page || 1);
  const goToPrevPage = () => setPage(Math.max(1, (pagination?.current_page || 1) - 1));
  const goToNextPage = () => setPage(Math.min(pagination?.last_page || 1, (pagination?.current_page || 1) + 1));

  // Função para obter cores baseadas no tema
  const getSelectionColors = () => {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      backgroundColor: isDarkMode ? '#1e40af' : '#0d6efd',
      color: 'white'
    };
  };

  // Função para lidar com ordenação
  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (sortColumn === columnKey && sortDirection === 'asc') {
      direction = 'desc';
    }
    
    onSort(columnKey, direction);
  };

  return (
    <div>
      {/* Header com botões de ação e filtros */}
      {showHeader && (
        <div className="card-header py-2 border-bottom">
          {/* Primeira linha: Botões de ação */}
          <div className="d-flex align-items-center mb-2">
            <div className="d-flex" style={{ gap: '8px' }}>
              {bulkActions.map((bulkAction, index) => {
                // Novo sempre habilitado, outros só quando há seleção
                const isNewButton = bulkAction.label.toLowerCase().includes('nova') || bulkAction.label.toLowerCase().includes('novo');
                const isDisabledBySelection = !isNewButton && selectedItems.length === 0;
                const isDisabledByCondition = bulkAction.disabled ? bulkAction.disabled(selectedItems) : false;
                const isDisabled = isDisabledBySelection || isDisabledByCondition;
                
                // Se tem dropdown, renderizar como dropdown
                if (bulkAction.dropdown) {
                  return (
                    <div key={index} className="dropdown" style={{ flexShrink: 0, position: 'relative' }}>
                      <button
                        className="btn btn-sm btn-primary dropdown-toggle"
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
                      >
                        {bulkAction.label}
                      </button>
                      {openDropdown === index && (
                        <ul 
                          className="dropdown-menu show" 
                          style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1050 }}
                        >
                          {bulkAction.dropdown.map((item: { label: string; action: () => void }, itemIndex: number) => (
                            <li key={itemIndex}>
                              <button
                                className="dropdown-item"
                                onClick={() => {
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
                    key={index}
                    className="btn btn-sm btn-primary"
                    onClick={(event) => {
                      if (!isDisabled && bulkAction.action) {
                        handleBulkAction(bulkAction.action, event);
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

          {/* Segunda linha: Busca centralizada */}
          {onSearch && (
            <div className="d-flex justify-content-center mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                id={`search-${Math.random().toString(36).substr(2, 9)}`}
                name="search"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: '400px', height: '32px' }}
              />
            </div>
          )}

          {/* Terceira linha: Paginação e controles */}
          <div className="d-flex align-items-center justify-content-center gap-2">
            {/* Seletor de linhas por página */}
            <select 
              className="form-select form-select-sm" 
              id="data-table-limit"
              name="dataTableLimit"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
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
                className="btn btn-outline-secondary btn-sm" 
                onClick={goToFirstPage}
                disabled={!pagination || pagination.current_page <= 1}
              >
                <i className="bi bi-chevron-double-left"></i>
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={goToPrevPage}
                disabled={!pagination || pagination.current_page <= 1}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              
              <span className="small text-muted mx-2">
                {pagination?.from || 0} - {pagination?.to || 0} / {pagination?.total || 0}
              </span>
              
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={goToNextPage}
                disabled={!pagination || pagination.current_page >= (pagination?.last_page || 1)}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={goToLastPage}
                disabled={!pagination || pagination.current_page >= (pagination?.last_page || 1)}
              >
                <i className="bi bi-chevron-double-right"></i>
              </button>
            </div>

            {/* Botão de refresh */}
            {onRefresh && (
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={onRefresh}
                title="Recarregar dados"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th className="py-1 px-2" style={{ fontSize: '0.75rem', padding: '0.5rem', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      className="form-check-input"
                      id={`select-all-${Math.random().toString(36).substr(2, 9)}`}
                      name="selectAll"
                      checked={selectedItems.length === data.length && data.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...data]);
                          if (onSelectionChange) onSelectionChange([...data]);
                        } else {
                          setSelectedItems([]);
                          if (onSelectionChange) onSelectionChange([]);
                        }
                      }}
                    />
                  </th>
                  {columns.map((column: Column<T>) => (
                <th 
                  key={column.key} 
                  className={`py-1 px-2 ${column.className || ''} ${column.sortable !== false && onSort ? 'cursor-pointer' : ''}`} 
                  style={{ fontSize: '0.75rem', padding: '0.5rem' }}
                  onClick={() => column.sortable !== false && onSort && handleSort(column.key)}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>{column.label}</span>
                    {column.sortable !== false && onSort && (
                      <div className="d-flex flex-column">
                        <i 
                          className={`bi bi-caret-up-fill`}
                          style={{ 
                            fontSize: '0.6rem', 
                            lineHeight: '0.5',
                            color: sortColumn === column.key && sortDirection === 'asc' ? '#ffffff' : '#adb5bd'
                          }}
                        ></i>
                        <i 
                          className={`bi bi-caret-down-fill`}
                          style={{ 
                            fontSize: '0.6rem', 
                            lineHeight: '0.5',
                            color: sortColumn === column.key && sortDirection === 'desc' ? '#ffffff' : '#adb5bd'
                          }}
                        ></i>
                      </div>
                    )}
                  </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                <td colSpan={columns.length + 1} className="text-center">
                  <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length > 0 ? (
              data.map((item: T, index: number) => {
                const isSelected = selectedItems.some(selected => selected.id === item.id);
                return (
                  <tr
                    key={item.id || index} 
                    className={isSelected ? 'table-active' : ''}
                    onClick={() => handleRowClick(item)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: isSelected ? getSelectionColors().backgroundColor : 'inherit',
                      color: isSelected ? getSelectionColors().color : 'inherit'
                    }}
                  >
                    <td 
                      className="py-1 px-2"
                      style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.5rem',
                        backgroundColor: isSelected ? getSelectionColors().backgroundColor : 'inherit',
                        color: isSelected ? getSelectionColors().color : 'inherit',
                        width: '40px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input 
                        type="checkbox" 
                        className="form-check-input"
                        id={`select-${item.id || index}-${Math.random().toString(36).substr(2, 9)}`}
                        name="selectItem"
                        checked={isSelected}
                        onChange={(e) => handleCheckboxChange(item, e)}
                      />
                    </td>
                    
                      {columns.map((column: Column<T>) => (
                      <td 
                        key={column.key} 
                        className="py-1 px-2"
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.5rem',
                          backgroundColor: isSelected ? getSelectionColors().backgroundColor : 'inherit',
                          color: isSelected ? getSelectionColors().color : 'inherit'
                        }}
                      >
                          {column.render ? column.render(item) : String((item as any)[column.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                );
              })
                ) : (
                  <tr>
                <td colSpan={columns.length + 1} className="text-center">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
  );
};

export default DataTable;