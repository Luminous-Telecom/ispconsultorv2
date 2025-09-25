import React, { useState } from 'react';

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
  className?: string;
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
  searchPlaceholder?: string;
  onSearch?: (search: string) => void;
  onSelectionChange?: (selectedItems: any[]) => void;
}

const DataTable: React.FC<TableProps> = ({
  columns,
  data,
  isLoading,
  pagination,
  limit,
  setLimit,
  setPage,
  emptyMessage = "Nenhum registro encontrado",
  actions,
  bulkActions = [],
  searchPlaceholder = "Buscar...",
  onSearch,
  onSelectionChange
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
    const newSelection = checked 
      ? [...selectedItems, item]
      : selectedItems.filter(selected => selected.id !== item.id);
    
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

  const handleBulkAction = (action: (items: any[]) => void) => {
    action(selectedItems);
    setSelectedItems([]);
  };

  const goToFirstPage = () => setPage(1);
  const goToLastPage = () => setPage(pagination?.last_page || 1);
  const goToPrevPage = () => setPage(Math.max(1, (pagination?.current_page || 1) - 1));
  const goToNextPage = () => setPage(Math.min(pagination?.last_page || 1, (pagination?.current_page || 1) + 1));

  return (
    <div className="card">
      {/* Header com botões de ação */}
      {bulkActions.length > 0 && selectedItems.length > 0 && (
        <div className="card-header py-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small">
              {selectedItems.length} item(s) selecionado(s)
            </span>
            {bulkActions.map((bulkAction, index) => (
              <button
                key={index}
                className={`btn btn-sm btn-${bulkAction.variant || 'primary'}`}
                onClick={() => handleBulkAction(bulkAction.action)}
              >
                {bulkAction.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controles compactos */}
      <div className="card-body p-2">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            {/* Busca */}
            {onSearch && (
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: '200px' }}
              />
            )}
            
            {/* Filtros */}
            <div className="dropdown">
              <button className="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="dropdown">
                <i className="bi bi-funnel"></i>
              </button>
            </div>
            
            {/* Configurações */}
            <button className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-gear"></i>
            </button>
            
            {/* Download */}
            <button className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-download"></i>
            </button>
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

        {/* Tabela */}
        <div className="table-responsive">
          <table className="table table-striped table-sm">
            <thead>
              <tr>
                {/* Checkbox para selecionar todos */}
                {bulkActions.length > 0 && (
                  <th className="py-1 px-2" style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedItems.length === data.length && data.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                
                {columns.map((column) => (
                  <th key={column.key} className={`py-1 px-2 ${column.className || ''}`}>
                    {column.label}
                  </th>
                ))}
                
              </tr>
            </thead>
            <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)} className="text-center">
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((item, index) => (
                    <tr key={item.id || index} className={selectedItems.some(selected => selected.id === item.id) ? 'table-active' : ''}>
                      {/* Checkbox para selecionar item */}
                      {bulkActions.length > 0 && (
                        <td className="py-1 px-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedItems.some(selected => selected.id === item.id)}
                            onChange={(e) => handleSelectItem(item, e.target.checked)}
                          />
                        </td>
                      )}
                      
                      {columns.map((column) => (
                        <td key={column.key} className="py-1 px-2">
                          {column.render ? column.render(item) : item[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)} className="text-center">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
