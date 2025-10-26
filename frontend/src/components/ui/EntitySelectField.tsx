import React from 'react';

export interface EntityItem {
  id: number;
  nome: string;
}

interface EntitySelectFieldProps {
  value: number;
  onChange: (value: number) => void;
  onShowModal?: () => void;
  entities?: EntityItem[];
  label: string;
  placeholder?: string;
  error?: string | number;
  required?: boolean;
  idFieldTitle?: string;
  searchButtonTitle?: string;
  helpText?: string;
}

const EntitySelectField: React.FC<EntitySelectFieldProps> = ({
  value,
  onChange,
  onShowModal,
  entities = [],
  label,
  placeholder = "Buscar...",
  error,
  required = false,
  idFieldTitle = "Digite o ID",
  searchButtonTitle = "Abrir listagem de registros",
  helpText
}) => {
  const selectedEntity = entities.find((e) => e.id === value);

  return (
    <div className="mb-3">
      <label className="form-label small">
        {label} {required && <span className="text-danger ms-1">*</span>}
      </label>
      <div className="input-group">
        <input
          title={idFieldTitle}
          autoComplete="off"
          type="text"
          className="form-control text-center id-field"
          placeholder="ID"
          name={`${label.toLowerCase().replace(/\s+/g, '_')}_id_field`}
          onChange={(e) => {
            const id = parseInt(e.target.value) || 0;
            onChange(id);
          }}
          defaultValue={value || ''}
        />
        <input
          placeholder={placeholder}
          readOnly
          autoComplete="off"
          tabIndex={-1}
          type="text"
          className="form-control"
          name={`${label.toLowerCase().replace(/\s+/g, '_')}_nome_field`}
          value={selectedEntity?.nome || ''}
          style={{ borderRight: 'none' }}
        />
        <button
          type="button"
          onClick={onShowModal}
          title={searchButtonTitle}
          className="search-button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(90deg)' }}>
            <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
          </svg>
        </button>
      </div>
      {error && <div className="invalid-feedback" style={{ display: 'block' }}>{error}</div>}
      {helpText && (
        <small className="form-text text-muted">
          {helpText}
        </small>
      )}
    </div>
  );
};

export default EntitySelectField;
