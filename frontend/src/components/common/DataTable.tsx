import React from 'react';

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
  };
  limit: number;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  emptyMessage?: string;
  actions?: (item: any) => React.ReactNode;
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
  actions
}) => {
  return (
    <>
      {/* Controles da Tabela */}
      <div className="card mb-3">
        <div className="card-body p-2">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <label htmlFor="limit" className="form-label me-2 mb-0">Linhas por página:</label>
                <select 
                  className="form-select form-select-sm" 
                  id="limit"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1); // Reset para primeira página
                  }}
                  style={{ width: 'auto' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            <div className="col-md-6 text-end">
              <small className="text-muted">
                Mostrando {pagination?.from || 0} a {pagination?.to || 0} de {pagination?.total || 0} registros
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        <div className="card-body p-2">
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={`py-1 px-2 ${column.className || ''}`}>
                      {column.label}
                    </th>
                  ))}
                  {actions && (
                    <th className="py-1 px-2">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length > 0 ? (
                  data.map((item, index) => (
                    <tr key={item.id || index}>
                      {columns.map((column) => (
                        <td key={column.key} className="py-1 px-2">
                          {column.render ? column.render(item) : item[column.key]}
                        </td>
                      ))}
                      {actions && (
                        <td className="py-1 px-2">
                          {actions(item)}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length + (actions ? 1 : 0)} className="text-center">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default DataTable;
