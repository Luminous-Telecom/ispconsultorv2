import React from 'react';
import { BaseComponentProps, ValidationProps, TooltipProps } from './types';
import Input from './Input';
import Select from './Select';
import Checkbox from './Checkbox';

type FieldType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week' | 'select' | 'checkbox' | 'textarea' | 'file';

interface FormFieldProps extends BaseComponentProps, ValidationProps, TooltipProps {
  type?: FieldType;
  label?: string;
  name: string;
  value?: any;
  onChange?: (value: any, name: string) => void;
  placeholder?: string;
  required?: boolean;
  description?: string;
  helpText?: string;
  size?: 'sm' | 'md' | 'lg';
  options?: Array<{ value: string | number; label: string; disabled?: boolean; group?: string }>;
  rows?: number;
  cols?: number;
  min?: number;
  max?: number;
  step?: number;
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
}

const FormField: React.FC<FormFieldProps> = ({
  type = 'text',
  label,
  name,
  value,
  onChange,
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
  loadingText = 'Carregando...',
  emptyText = 'Nenhuma opção disponível',
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
}) => {
  // Gerar ID único usando prefixo do formulário
  const fieldId = id || `${formPrefix ? `${formPrefix}-` : ''}field-${name}`;

  // Handler para onChange
  const handleChange = (changeValue: any, changeName?: string) => {
    if (onChange) {
      onChange(changeValue, changeName || name);
    }
  };

  // Renderizar label
  const renderLabel = () => {
    if (!label) return null;
    
    return (
      <label htmlFor={fieldId} className="form-label">
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
    );
  };

  // Renderizar descrição
  const renderDescription = () => {
    if (!description) return null;
    
    return (
      <div className="form-text text-muted">
        {description}
      </div>
    );
  };

  // Renderizar help text
  const renderHelpText = () => {
    if (!helpText) return null;
    
    return (
      <div className="form-text">
        {helpText}
      </div>
    );
  };

  // Renderizar campo baseado no tipo
  const renderField = () => {
    const commonProps = {
      id: fieldId,
      name,
      value,
      onChange: handleChange,
      placeholder,
      required,
      disabled,
      size,
      className,
      isValid: isValid || (!error && !isInvalid),
      isInvalid: isInvalid || !!error,
      validationMessage: validationMessage || error,
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
            options={options}
            multiple={multiple}
            searchable={searchable}
            clearable={clearable}
            loading={loading}
            loadingText={loadingText}
            emptyText={emptyText}
          />
        );

      case 'checkbox':
        console.log('🔄 FormField checkbox:', { name, value, type });
        return (
          <Checkbox
            {...commonProps}
            checked={value}
            label={label}
            description={description}
            inline={inline}
            switch={isSwitch}
            indeterminate={indeterminate}
            onChange={(e) => {
              console.log('🔄 FormField checkbox onChange:', { name, value: e.value, currentValue: value });
              handleChange(e.value, name);
            }}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            name={name}
            value={value}
            onChange={(e) => handleChange(e.target.value, name)}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            rows={rows}
            cols={cols}
            minLength={minLength}
            maxLength={maxLength}
            className={`form-control ${size !== 'md' ? `form-control-${size}` : ''} ${className}`}
            data-testid={dataTestId}
            title={tooltip}
            data-bs-toggle={tooltip ? 'tooltip' : undefined}
            data-bs-placement={tooltip ? tooltipPosition : undefined}
            data-bs-title={tooltip}
          />
        );

      case 'file':
        return (
          <input
            id={fieldId}
            name={name}
            type="file"
            onChange={(e) => handleChange(e.target.files?.[0] || null, name)}
            required={required}
            disabled={disabled}
            accept={accept}
            multiple={multiple}
            className={`form-control ${className}`}
            autoFocus={autoFocus}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            type={type}
            min={min}
            max={max}
            step={step}
            minLength={minLength}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            readOnly={readOnly}
            icon={icon}
            iconPosition={iconPosition}
            iconSize={iconSize}
          />
        );
    }
  };

  // Se for checkbox com label, não renderizar label separado
  if (type === 'checkbox' && label) {
    return (
      <div className={`form-field ${className}`}>
        {renderField()}
        {renderHelpText()}
      </div>
    );
  }

  // Renderizar campo com label
  return (
    <div className={`form-field ${className}`}>
      {renderLabel()}
      {renderDescription()}
      {renderField()}
      {renderHelpText()}
    </div>
  );
};

export default FormField;
