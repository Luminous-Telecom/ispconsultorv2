import React, { useState } from 'react';

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface TableProps {
  columns: Column[];
  data: any[];
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
  actions?: (item: any) => React.ReactNode;
  bulkActions?: {
    label: string;
    action: (selectedItems: any[]) => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  }[];
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  onSelectionChange?: (selectedItems: any[]) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

const DataTable: React.FC<TableProps> = ({
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
  sortDirection = 'asc'
}) => {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? data : [];
    setSelectedItems(newSelection);
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    }
  };

  const handleSelectItem = (item: any, checked: boolean) => {
    // Permitir seleção de apenas uma linha
    // Se já está selecionado, não desselecionar
    const isAlreadySelected = selectedItems.some(selected => selected.id === item.id);
    if (isAlreadySelected && !checked) {
      return; // Não permitir desseleção
    }
    
    const newSelection = checked ? [item] : [];
    
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

  const handleBulkAction = (action: (selectedItems: any[]) => void) => {
    action(selectedItems);
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
    <div className="card">
      {/* Header com botões de ação e filtros */}
      <div className="card-header py-2 border-bottom">
        {/* Botões de ação */}
        {bulkActions.length > 0 && (
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex" style={{ gap: '8px' }}>
              {bulkActions.map((bulkAction, index) => {
                // Novo sempre habilitado, outros só quando há seleção
                const isNewButton = bulkAction.label.toLowerCase() === 'novo';
                const isDisabled = !isNewButton && selectedItems.length === 0;
                
                return (
                  <button
                    key={index}
                    className="btn btn-sm btn-primary"
                    onClick={() => !isDisabled && handleBulkAction(bulkAction.action)}
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

        {/* Controles compactos */}
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            {/* Busca */}
            {onSearch && (
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: '200px', height: '32px' }}
              />
            )}
            
            {/* Seletor de linhas por página */}
            <select
              className="form-select form-select-sm"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              style={{ width: '100px', height: '32px', cursor: 'pointer' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="d-flex align-items-center gap-2">
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

            {/* Atualizar */}
            <button className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="table-responsive">
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              {columns.map((column) => (
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
                <td colSpan={columns.length} className="text-center">
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, index) => {
                const isSelected = selectedItems.some(selected => selected.id === item.id);
                return (
                  <tr
                    key={item.id || index} 
                    className={isSelected ? 'table-active' : ''}
                    onClick={() => !isSelected && handleSelectItem(item, true)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: isSelected ? getSelectionColors().backgroundColor : 'inherit',
                      color: isSelected ? getSelectionColors().color : 'inherit'
                    }}
                  >
                    
                    {columns.map((column) => (
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
                        {column.render ? column.render(item) : item[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center">
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