import React, { useEffect, useRef } from 'react';
import { BaseComponentProps, ValidationProps, TooltipProps } from './types';
import { FormValue, ChangeHandler } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import Input from './Input';
import Select from './Select';
import Checkbox from './Checkbox';
import { FileInput } from './FileInput';
import { LabelWithHelp } from './LabelWithHelp';
import { getBootstrapTooltipProps } from './tooltipProps';
import {
  isRequiredValidationMessage,
  shouldNotifyRequiredValidationToast,
  shouldShowInlineValidationMessage,
} from 'utils/requiredValidationToast';
import { resolveFormFieldAutoComplete, useAutofillGuard } from './useAutofillGuard';

type FieldType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week' | 'select' | 'checkbox' | 'textarea' | 'file';

interface FormFieldProps extends BaseComponentProps, ValidationProps, TooltipProps {
  type?: FieldType;
  label?: string;
  name: string;
  value?: FormValue;
  onChange?: ChangeHandler<FormValue>;
  onBlur?: (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  description?: string;
  helpText?: string;
  size?: 'sm' | 'md' | 'lg';
  options?: Array<{ value: string | number; label: string; disabled?: boolean; group?: string }>;
  rows?: number;
  cols?: number;
  min?: number | string;
  max?: number | string;
  step?: number | 'any';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  accept?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  inline?: boolean;
  switch?: boolean;
  indeterminate?: boolean;
  // Props adicionais para compatibilidade
  error?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  iconSize?: 'sm' | 'md' | 'lg';
  isInvalid?: boolean;
  // Prefixo para gerar IDs únicos
  formPrefix?: string;
  /** Extensão colada à direita do controle (ex.: Cartão CNPJ). */
  trailing?: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  type = 'text',
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  description,
  helpText,
  size = 'md',
  options = [],
  rows = 3,
  cols,
  min,
  max,
  step,
  minLength,
  maxLength,
  pattern,
  accept,
  autoComplete,
  autoFocus = false,
  readOnly = false,
  disabled = false,
  multiple = false,
  searchable = false,
  clearable = false,
  loading = false,
  loadingText,
  emptyText,
  inline = false,
  switch: isSwitch = false,
  indeterminate = false,
  className = '',
  isValid,
  isInvalid,
  validationMessage,
  validationStatus,
  tooltip,
  tooltipPosition = 'top',
  id,
  'data-testid': dataTestId,
  // Props adicionais
  error,
  icon,
  iconPosition = 'left',
  iconSize = 'md',
  formPrefix,
  trailing,
}) => {
  const { t } = useI18n();
  const { error: notifyError } = useNotificationContext();
  const lastRequiredToastRef = useRef<string | null>(null);
  const resolvedAutoComplete = resolveFormFieldAutoComplete(autoComplete);
  const blockAutofill = resolvedAutoComplete === 'off';
  const textareaGuard = useAutofillGuard(blockAutofill && type === 'textarea', readOnly);
  
  const defaultLoadingText = loadingText || t('messages.loading');
  const defaultEmptyText = emptyText || t('ui.noOptionsAvailable');
  const requiredToastMessage = isRequiredValidationMessage(error)
    ? error
    : isRequiredValidationMessage(validationMessage)
      ? validationMessage
      : null;
  const inlineError = shouldShowInlineValidationMessage(error) ? error : undefined;
  const inlineValidationMessage = shouldShowInlineValidationMessage(validationMessage)
    ? validationMessage
    : undefined;
  
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
  
  // Gerar ID único usando prefixo do formulário
  const fieldId = id || `${formPrefix ? `${formPrefix}-` : ''}field-${name}`;

  // Handler para onChange
  const handleChange = (changeValue: FormValue | { value: FormValue }, changeName?: string) => {
    // O Input passa um objeto {value, name, event}, precisamos extrair apenas o value
    let actualValue: FormValue = typeof changeValue === 'object' && changeValue !== null && 'value' in changeValue 
      ? changeValue.value 
      : changeValue;
    
    if (onChange && actualValue !== undefined) {
      onChange(actualValue, changeName || name);
    }
  };

  // Converter FormValue para string | number (para Input/Select)
  const convertToInputValue = (val: FormValue): string | number | undefined => {
    if (val === null || val === undefined) return undefined;
    return val as string | number;
  };

  // Converter FormValue para boolean (para Checkbox)
  const convertToBoolean = (val: FormValue): boolean | undefined => {
    if (val === null || val === undefined) return undefined;
    return val as boolean;
  };

  // Converter FormValue para string | number | readonly string[] (para textarea)
  const convertToTextareaValue = (val: FormValue): string | number | readonly string[] | undefined => {
    if (val === null || val === undefined) return undefined;
    return val as string | number | readonly string[];
  };

  // Tooltip: description ou helpText vão no ícone ao lado do label
  const tooltipContent = description || helpText;

  // Renderizar label
  const renderLabel = () => {
    if (!label) return null;
    
    return (
      <LabelWithHelp htmlFor={fieldId} className="form-label" helpText={tooltipContent} required={required}>
        {label}
      </LabelWithHelp>
    );
  };

  // Renderizar campo baseado no tipo
  const renderField = () => {
    const commonProps = {
      id: fieldId,
      name,
      placeholder,
      required,
      disabled,
      size,
      className,
      isValid: isValid !== undefined ? isValid : (validationStatus === 'valid' ? true : undefined),
      isInvalid: isInvalid || !!error,
      validationMessage: inlineValidationMessage || inlineError,
      validationStatus,
      tooltip,
      tooltipPosition,
      'data-testid': dataTestId,
    };

    switch (type) {
      case 'select':
        return (
          <Select
            {...commonProps}
            value={convertToInputValue(value)}
            onChange={handleChange}
            options={options}
            multiple={multiple}
            searchable={searchable}
            clearable={clearable}
            loading={loading}
            loadingText={defaultLoadingText}
            emptyText={defaultEmptyText}
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            {...commonProps}
            checked={convertToBoolean(value)}
            description={description}
            inline={inline}
            switch={isSwitch}
            indeterminate={indeterminate}
            onChange={(e) => handleChange(e.value, name)}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            name={name}
            value={convertToTextareaValue(value)}
            onChange={(e) => handleChange(e.target.value, name)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            readOnly={textareaGuard.readOnly}
            autoComplete={resolvedAutoComplete}
            autoFocus={autoFocus}
            onFocus={(event) => textareaGuard.unlock(event.currentTarget)}
            onMouseDown={(event) => textareaGuard.unlock(event.currentTarget)}
            onKeyDown={(event) => textareaGuard.unlock(event.currentTarget)}
            rows={rows}
            cols={cols}
            minLength={minLength}
            maxLength={maxLength}
            className={`form-control ${size !== 'md' ? `form-control-${size}` : ''} ${className}`}
            data-testid={dataTestId}
            {...textareaGuard.domProps}
            {...getBootstrapTooltipProps(tooltip, tooltipPosition)}
          />
        );

      case 'file':
        return (
          <FileInput
            id={fieldId}
            name={name}
            size={size}
            onFileChange={(file) => {
              if (onChange && file) {
                onChange(file, name);
              }
            }}
            required={required}
            disabled={disabled}
            accept={accept}
            multiple={multiple}
            className={className}
            autoFocus={autoFocus}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            type={type}
            value={convertToInputValue(value)}
            onChange={handleChange}
            onBlur={onBlur}
            min={min}
            max={max}
            step={step}
            minLength={minLength}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={resolvedAutoComplete}
            autoFocus={autoFocus}
            readOnly={readOnly}
            icon={icon}
            iconPosition={iconPosition}
            iconSize={iconSize}
          />
        );
    }
  };

  // Renderizar campo com label
  return (
    <div className={`form-field ${className}`}>
      {renderLabel()}
      <div className="form-field-control">
        {trailing ? (
          <div className="form-field-with-trailing">
            <div className="form-field-with-trailing-input">{renderField()}</div>
            {trailing}
          </div>
        ) : (
          renderField()
        )}
      </div>
    </div>
  );
};

export default FormField;
