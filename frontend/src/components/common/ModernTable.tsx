import React from 'react';
import TableFilters from './TableFilters';
import ActionButtons from './ActionButtons';

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  width?: string;
}

interface ActionButton {
  label: string;
  action: (selectedItems: any[]) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  icon?: string;
}

interface ModernTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  limit?: number;
  setLimit?: (limit: number) => void;
  setPage?: (page: number) => void;
  emptyMessage?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actionButtons?: ActionButton[];
  selectedItems?: any[];
  onSelectionChange?: (selectedItems: any[]) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

const ModernTable: React.FC<ModernTableProps> = ({
  columns,
  data,
  isLoading = false,
  pagination,
  limit = 15,
  setLimit,
  setPage,
  emptyMessage = "Nenhum item encontrado",
  searchValue = '',
  onSearchChange,
  searchPlaceholder = "Buscar...",
  actionButtons = [],
  selectedItems = [],
  onSelectionChange,
  sortColumn = '',
  sortDirection = 'asc',
  onSort,
  className = ''
}) => {
  const handleSelectItem = (item: any) => {
    if (!onSelectionChange) return;
    
    const isAlreadySelected = selectedItems.some(selected => selected.id === item.id);
    if (isAlreadySelected) {
      return; // Não permitir desseleção
    }
    
    onSelectionChange([item]); // Seleção única
  };

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (sortColumn === columnKey && sortDirection === 'asc') {
      direction = 'desc';
    }
    
    onSort(columnKey, direction);
  };

  const getSelectionColors = () => {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      backgroundColor: isDarkMode ? '#1e40af' : '#0d6efd',
      color: 'white'
    };
  };

  // Preparar botões de ação com estados
  const preparedActionButtons = actionButtons.map(button => ({
    ...button,
    disabled: button.disabled || (selectedItems.length === 0 && button.label.toLowerCase() !== 'novo'),
    action: () => button.action(selectedItems)
  }));

  return (
    <div className={`card ${className}`}>
      {/* Header com botões de ação */}
      {(actionButtons.length > 0) && (
        <div className="card-header py-2 border-bottom">
          <ActionButtons
            buttons={preparedActionButtons}
            selectedCount={selectedItems.length}
            showSelectionCount={false}
            className="mb-2"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="card-header py-2 border-bottom">
        <TableFilters
          searchValue={searchValue}
          onSearchChange={onSearchChange || (() => {})}
          searchPlaceholder={searchPlaceholder}
          showLimitSelector={!!setLimit}
          limit={limit}
          onLimitChange={setLimit}
          showPagination={!!pagination && !!setPage}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

      {/* Tabela */}
      <div className="table-responsive">
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className={`py-1 px-2 ${column.className || ''}`}
                  style={{ 
                    fontSize: '0.875rem', 
                    padding: '1rem 0.75rem',
                    width: column.width || 'auto'
                  }}
                  onClick={() => column.sortable !== false && onSort && handleSort(column.key)}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <span>{column.label}</span>
                    {column.sortable !== false && onSort && (
                      <div className="d-flex flex-column">
                        <i 
                          className="bi bi-caret-up-fill"
                          style={{ 
                            fontSize: '0.6rem', 
                            lineHeight: '0.5',
                            color: sortColumn === column.key && sortDirection === 'asc' ? '#ffffff' : '#adb5bd'
                          }}
                        ></i>
                        <i 
                          className="bi bi-caret-down-fill"
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
                <td colSpan={columns.length} className="text-center py-4">
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
                    onClick={() => !isSelected && handleSelectItem(item)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: isSelected ? getSelectionColors().backgroundColor : 'inherit',
                      color: isSelected ? getSelectionColors().color : 'inherit'
                    }}
                  >
                    {columns.map((column) => (
                      <td 
                        key={column.key} 
                        className={`py-1 px-2 ${column.className || ''}`}
                        style={{ 
                          fontSize: '0.875rem', 
                          padding: '1rem 0.75rem',
                          backgroundColor: isSelected ? getSelectionColors().backgroundColor : 'inherit',
                          color: isSelected ? getSelectionColors().color : 'inherit'
                        }}
                      >
                        {column.render ? column.render(item) : (item as any)[column.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">
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

export default ModernTable;
