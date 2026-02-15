import React from 'react';
import { useI18n } from '@/contexts/I18nContext';

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
  placeholder,
  error,
  required = false,
  idFieldTitle = "Digite o ID",
  searchButtonTitle = "Abrir listagem de registros",
  helpText
}) => {
  const { t } = useI18n();
  const defaultPlaceholder = placeholder || t('layout.searchPlaceholder');
  const selectedEntity = entities.find((e) => e.id === value);

  const fieldId = `${label.toLowerCase().replace(/\s+/g, '_')}_id_field`;

  return (
    <div className="mb-1">
      <label htmlFor={fieldId} className="form-label small">
        {label} {required && <span className="text-danger ms-1">*</span>}
      </label>
      <div className="input-group">
        <input
          id={fieldId}
          title={idFieldTitle}
          autoComplete="off"
          type="text"
          className="form-control text-center id-field"
          placeholder={t('table.id')}
          name={fieldId}
          onChange={(e) => {
            const id = parseInt(e.target.value) || 0;
            onChange(id);
          }}
          value={value ? String(value) : ''}
        />
        <input
          placeholder={defaultPlaceholder}
          readOnly
          autoComplete="off"
          tabIndex={-1}
          type="text"
          className="form-control entity-select-input"
          name={`${label.toLowerCase().replace(/\s+/g, '_')}_nome_field`}
          value={selectedEntity?.nome || ''}
        />
        <button
          type="button"
          onClick={onShowModal}
          title={searchButtonTitle}
          className="search-button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="entity-select-icon">
            <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
          </svg>
        </button>
      </div>
      {error && <div className="invalid-feedback entity-select-error">{error}</div>}
      {helpText && (
        <small className="form-text text-muted">
          {helpText}
        </small>
      )}
    </div>
  );
};

export default EntitySelectField;
