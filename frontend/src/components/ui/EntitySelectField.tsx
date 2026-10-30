import React, { useEffect, useRef } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { LabelWithHelp } from './LabelWithHelp';
import { useAutofillGuard } from './useAutofillGuard';
import { IconOnlyButton } from './buttons';
import {
  isRequiredValidationMessage,
  shouldNotifyRequiredValidationToast,
  shouldShowInlineValidationMessage,
} from 'utils/requiredValidationToast';

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
  disabled?: boolean;
  idFieldTitle?: string;
  searchButtonTitle?: string;
  /** Abre a edição do registro preenchido. O botão só aparece quando informado. */
  onEdit?: () => void;
  editButtonTitle?: string;
  helpText?: string;
  idPlaceholder?: string;
  /** Impede trocar o vínculo. A lupa fica desabilitada; a edição do cadastro continua disponível. */
  selectionLocked?: boolean;
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
  const { error: notifyError } = useNotificationContext();
  const lastRequiredToastRef = useRef<string | null>(null);
  const {
    onShowModal,
    label,
    error,
    required = false,
    disabled = false,
    idFieldTitle,
    searchButtonTitle = 'Abrir listagem de registros',
    onEdit,
    editButtonTitle,
    helpText,
    placeholder,
    selectionLocked = false,
  } = props;

  const defaultPlaceholder = placeholder || t('layout.searchPlaceholder');
  const stringIdMode = props.stringIdMode === true;
  const entities = props.entities ?? [];
  const fieldKey = label.toLowerCase().replace(/\s+/g, '_');
  const fieldId = `${fieldKey}_id_field`;
  const idGuard = useAutofillGuard(true, false);
  const idPlaceholder = props.idPlaceholder ?? (stringIdMode ? 'UUID' : t('table.id'));
  const idTitle = idFieldTitle ?? (stringIdMode ? 'UUID' : 'Digite o ID');
  const resolvedEditTitle = editButtonTitle ?? t('buttons.editRecord');
  const hasSelectedValue = stringIdMode
    ? String(props.value ?? '').trim() !== ''
    : Number(props.value) > 0;
  const errorMessage = error != null ? String(error) : undefined;
  const inlineError = shouldShowInlineValidationMessage(errorMessage) ? errorMessage : undefined;
  const requiredToastMessage = isRequiredValidationMessage(errorMessage) ? errorMessage : null;

  useEffect(() => {
    if (!requiredToastMessage) {
      lastRequiredToastRef.current = null;
      return;
    }

    if (lastRequiredToastRef.current === requiredToastMessage) return;

    lastRequiredToastRef.current = requiredToastMessage;
    if (!shouldNotifyRequiredValidationToast()) return;

    notifyError(requiredToastMessage);
  }, [notifyError, requiredToastMessage]);

  const selectedNome = stringIdMode
    ? (entities as StringEntityItem[]).find((e) => String(e.id) === String(props.value))?.nome
    : (entities as EntityItem[]).find((e) => Number(e.id) === Number(props.value))?.nome;

  const handleIdChange = (raw: string) => {
    if (selectionLocked) return;
    if (stringIdMode) {
      (props.onChange as (value: string) => void)(raw.trim());
      return;
    }
    (props.onChange as (value: number) => void)(parseInt(raw, 10) || 0);
  };

  const unlockIdField = (element: HTMLInputElement) => {
    if (selectionLocked) return;
    idGuard.unlock(element);
  };

  return (
    <div className="form-field">
      <LabelWithHelp htmlFor={fieldId} className="form-label small" helpText={helpText} required={required}>
        {label}
      </LabelWithHelp>
      <div className="form-field-control">
        <div className={`input-group${selectionLocked ? ' entity-select-locked' : ''}`}>
          <input
            id={fieldId}
            title={idTitle}
            type="text"
            className="form-control text-center id-field"
            placeholder={idPlaceholder}
            name={fieldId}
            disabled={disabled}
            readOnly={selectionLocked || idGuard.readOnly}
            onFocus={(event) => unlockIdField(event.currentTarget)}
            onMouseDown={(event) => unlockIdField(event.currentTarget)}
            onKeyDown={(event) => unlockIdField(event.currentTarget)}
            onChange={(e) => handleIdChange(e.target.value)}
            value={props.value ? String(props.value) : ''}
            {...idGuard.domProps}
          />
          <input
            placeholder={defaultPlaceholder}
            readOnly
            autoComplete="off"
            tabIndex={-1}
            type="text"
            className="form-control entity-select-input"
            name={`${fieldKey}_nome_field`}
            disabled={disabled}
            value={selectedNome || ''}
          />
          <IconOnlyButton
            onClick={onShowModal}
            title={searchButtonTitle}
            label={searchButtonTitle}
            className="search-button"
            disabled={disabled || selectionLocked}
          >
            {SEARCH_ICON}
          </IconOnlyButton>
          {onEdit && (
            <IconOnlyButton
              onClick={onEdit}
              title={resolvedEditTitle}
              label={resolvedEditTitle}
              className="search-button"
              disabled={disabled || !hasSelectedValue}
            >
              <i className="bi bi-box-arrow-up-right" aria-hidden />
            </IconOnlyButton>
          )}
        </div>
        {inlineError && <div className="invalid-feedback entity-select-error">{inlineError}</div>}
      </div>
    </div>
  );
};

export default EntitySelectField;
