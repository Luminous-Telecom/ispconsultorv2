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
  idPlaceholder?: string;
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

const SEARCH_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="entity-select-icon">
    <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z" />
  </svg>
);

const EntitySelectField: React.FC<EntitySelectFieldProps> = (props) => {
  const { t } = useI18n();
  const {
    onShowModal,
    label,
    error,
    required = false,
    idFieldTitle,
    searchButtonTitle = 'Abrir listagem de registros',
    helpText,
    placeholder,
  } = props;

  const defaultPlaceholder = placeholder || t('layout.searchPlaceholder');
  const stringIdMode = props.stringIdMode === true;
  const entities = props.entities ?? [];
  const fieldKey = label.toLowerCase().replace(/\s+/g, '_');
  const fieldId = `${fieldKey}_id_field`;
  const idPlaceholder = props.idPlaceholder ?? (stringIdMode ? 'UUID' : t('table.id'));
  const idTitle = idFieldTitle ?? (stringIdMode ? 'UUID' : 'Digite o ID');

  const selectedNome = stringIdMode
    ? (entities as StringEntityItem[]).find((e) => String(e.id) === String(props.value))?.nome
    : (entities as EntityItem[]).find((e) => e.id === props.value)?.nome;

  const handleIdChange = (raw: string) => {
    if (stringIdMode) {
      (props.onChange as (value: string) => void)(raw.trim());
      return;
    }
    (props.onChange as (value: number) => void)(parseInt(raw, 10) || 0);
  };

  return (
    <div className="form-field">
      <LabelWithHelp htmlFor={fieldId} className="form-label small" helpText={helpText} required={required}>
        {label}
      </LabelWithHelp>
      <div className="form-field-control">
        <div className="input-group">
          <input
            id={fieldId}
            title={idTitle}
            autoComplete="off"
            type="text"
            className="form-control text-center id-field"
            placeholder={idPlaceholder}
            name={fieldId}
            onChange={(e) => handleIdChange(e.target.value)}
            value={props.value ? String(props.value) : ''}
          />
          <input
            placeholder={defaultPlaceholder}
            readOnly
            autoComplete="off"
            tabIndex={-1}
            type="text"
            className="form-control entity-select-input"
            name={`${fieldKey}_nome_field`}
            value={selectedNome || ''}
          />
          <button type="button" onClick={onShowModal} title={searchButtonTitle} className="search-button">
            {SEARCH_ICON}
          </button>
        </div>
        {error && <div className="invalid-feedback entity-select-error">{error}</div>}
      </div>
    </div>
  );
};

export default EntitySelectField;
