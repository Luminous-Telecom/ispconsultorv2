import React from 'react';
import { BaseComponentProps, ValidationProps, TooltipProps } from './types';
import { FormValue, ChangeHandler } from '@/types/common';
import { useI18n } from '@/contexts/I18nContext';
import Input from './Input';
import Select from './Select';
import Checkbox from './Checkbox';

type FieldType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week' | 'select' | 'checkbox' | 'textarea' | 'file';

interface FormFieldProps extends BaseComponentProps, ValidationProps, TooltipProps {
  type?: FieldType;
  label?: string;
  name: string;
  value?: FormValue;
  onChange?: ChangeHandler<FormValue>;
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
}) => {
  const { t } = useI18n();
  
  const defaultLoadingText = loadingText || t('messages.loading');
  const defaultEmptyText = emptyText || t('ui.noOptionsAvailable');
  
  // Gerar ID único usando prefixo do formulário
  const fieldId = id || `${formPrefix ? `${formPrefix}-` : ''}field-${name}`;

  // Função para determinar autocomplete baseado no name ou type
  const getAutoComplete = () => {
    if (autoComplete) return autoComplete;
    
    // Mapear nomes comuns para valores de autocomplete
    const nameMap: Record<string, string> = {
      email: 'email',
      telefone: 'tel',
      whatsapp: 'tel',
      celular: 'tel',
      cnpj: 'off',
      cpf: 'off',
      cep: 'postal-code',
      endereco: 'street-address',
      rua: 'street-address',
      numero: 'address-line2',
      complemento: 'address-line2',
      bairro: 'address-level2',
      cidade: 'address-level1',
      estado: 'address-level1',
      password: 'current-password',
      senha: 'current-password',
      nome: 'name',
      razao_social: 'organization',
      nome_fantasia: 'organization',
    };

    if (nameMap[name]) return nameMap[name];
    
    if (type === 'email') return 'email';
    if (type === 'tel') return 'tel';
    if (type === 'password') return 'current-password';
    
    return 'off';
  };

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
      <div className="form-text text-muted">
        {helpText}
      </div>
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
            label={label}
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
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (onChange && file) {
                onChange(file, name);
              }
            }}
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
            value={convertToInputValue(value)}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            minLength={minLength}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={getAutoComplete()}
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
