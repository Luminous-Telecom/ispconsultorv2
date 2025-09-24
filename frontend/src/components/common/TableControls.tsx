import React from 'react';

interface TableControlsProps {
  limit: number;
  setLimit: (limit: number) => void;
  setPage: (page: number) => void;
  pagination?: {
    from: number;
    to: number;
    total: number;
  };
}

const TableControls: React.FC<TableControlsProps> = ({ 
  limit, 
  setLimit, 
  setPage, 
  pagination 
}) => {
  return (
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
  );
};

export default TableControls;
