import React from 'react';

interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}

interface TableFiltersProps {
  fields: FilterField[];
  onFilter: (e: React.FormEvent) => void;
  onReset?: () => void;
  showResetButton?: boolean;
}

const TableFilters: React.FC<TableFiltersProps> = ({
  fields,
  onFilter,
  onReset,
  showResetButton = false
}) => {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <form onSubmit={onFilter}>
          <div className="row">
            {fields.map((field, index) => (
              <div key={field.name} className={`col-md-${field.type === 'text' ? '6' : '4'}`}>
                <div className="mb-3">
                  <label htmlFor={field.name} className="form-label">{field.label}</label>
                  {field.type === 'text' ? (
                    <input 
                      type="text" 
                      className="form-control" 
                      id={field.name} 
                      name={field.name} 
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <select 
                      className="form-select" 
                      id={field.name} 
                      name={field.name}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
            
            {/* Botões de ação */}
            <div className="col-md-2">
              <div className="mb-3">
                <label className="form-label">&nbsp;</label>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-outline-primary">
                    <i className="bi bi-search"></i> Filtrar
                  </button>
                  {showResetButton && onReset && (
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
                      onClick={onReset}
                    >
                      <i className="bi bi-arrow-clockwise"></i> Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TableFilters;
