import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { LabelWithHelp } from './LabelWithHelp';

export interface EntityItem {
  id: number;
  nome: string;
}

export interface StringEntityItem {
  id: string;
  nome: string;
}

interface EntitySelectFieldBaseProps {
  onShowModal?: () => void;
  label: string;
  placeholder?: string;
  error?: string | number;
  required?: boolean;
  idFieldTitle?: string;
  searchButtonTitle?: string;
  helpText?: string;
}

export type EntitySelectFieldProps =
  | (EntitySelectFieldBaseProps & {
      stringIdMode?: false;
      value: number;
      onChange: (value: number) => void;
      entities?: EntityItem[];
    })
  | (EntitySelectFieldBaseProps & {
      stringIdMode: true;
      value: string;
      onChange: (value: string) => void;
      entities?: StringEntityItem[];
    });

const EntitySelectField: React.FC<EntitySelectFieldProps> = (props) => {
  const { t } = useI18n();
  const defaultPlaceholder = props.placeholder || t('layout.searchPlaceholder');

  if (props.stringIdMode) {
    const {
      value,
      onChange,
      onShowModal,
      entities = [],
      label,
      error,
      required = false,
      idFieldTitle = 'UUID',
      searchButtonTitle = 'Abrir listagem de registros',
      helpText,
    } = props;
    const selectedEntity = entities.find((e) => String(e.id) === String(value));
    const fieldId = `${label.toLowerCase().replace(/\s+/g, '_')}_id_field`;

    return (
      <div className="mb-1">
        <LabelWithHelp htmlFor={fieldId} className="form-label small" helpText={helpText} required={required}>
          {label}
        </LabelWithHelp>
        <div className="input-group">
          <input
            id={fieldId}
            title={idFieldTitle}
            autoComplete="off"
            type="text"
            className="form-control text-center id-field"
            placeholder="UUID"
            name={fieldId}
            onChange={(e) => onChange(e.target.value.trim())}
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
          <button type="button" onClick={onShowModal} title={searchButtonTitle} className="search-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="entity-select-icon">
              <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z" />
            </svg>
          </button>
        </div>
        {error && <div className="invalid-feedback entity-select-error">{error}</div>}
      </div>
    );
  }

  const {
    value,
    onChange,
    onShowModal,
    entities = [],
    label,
    error,
    required = false,
    idFieldTitle = 'Digite o ID',
    searchButtonTitle = 'Abrir listagem de registros',
    helpText,
  } = props;
  const selectedEntity = entities.find((e) => e.id === value);
  const fieldId = `${label.toLowerCase().replace(/\s+/g, '_')}_id_field`;

  return (
    <div className="mb-1">
      <LabelWithHelp htmlFor={fieldId} className="form-label small" helpText={helpText} required={required}>
        {label}
      </LabelWithHelp>
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
            const id = parseInt(e.target.value, 10) || 0;
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
        <button type="button" onClick={onShowModal} title={searchButtonTitle} className="search-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="entity-select-icon">
            <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z" />
          </svg>
        </button>
      </div>
      {error && <div className="invalid-feedback entity-select-error">{error}</div>}
    </div>
  );
};

export default EntitySelectField;
