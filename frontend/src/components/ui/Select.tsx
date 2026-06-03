import React, { forwardRef } from 'react';
import { BaseComponentProps, ValidationProps, TooltipProps, InputSize, ChangeEvent, SelectOption } from './types';
import { useI18n } from 'contexts/I18nContext';
import { getBootstrapTooltipProps } from './tooltipProps';

interface SelectProps extends BaseComponentProps, ValidationProps, TooltipProps {
  size?: InputSize;
  value?: string | number;
  defaultValue?: string | number;
  name?: string;
  onChange?: (event: ChangeEvent<string | string[]>) => void;
  onBlur?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  placeholder?: string;
  multiple?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;
  searchable?: boolean;
  clearable?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  size = 'md',
  className = '',
  disabled = false,
  isValid,
  isInvalid,
  validationMessage,
  validationStatus,
  tooltip,
  tooltipPosition = 'top',
  value,
  defaultValue,
  name,
  onChange,
  onBlur,
  onFocus,
  options = [],
  placeholder,
  multiple = false,
  required = false,
  autoFocus = false,
  tabIndex,
  searchable: _searchable = false,
  clearable: _clearable = false,
  loading = false,
  loadingText,
  emptyText,
  id,
  'data-testid': dataTestId,
}, ref) => {
  const { t } = useI18n();
  
  const defaultPlaceholder = placeholder || t('ui.selectOption');
  const defaultLoadingText = loadingText || t('messages.loading');
  const defaultEmptyText = emptyText || t('ui.noOptionsAvailable');
  // Construir classes CSS
  const getSelectClasses = () => {
    const classes = ['form-select'];
    
    // Size
    if (size !== 'md') {
      classes.push(`form-select-${size}`);
    }
    
    // Validation
    if (isValid || validationStatus === 'valid') {
      classes.push('is-valid');
    } else if (isInvalid || validationStatus === 'invalid') {
      classes.push('is-invalid');
    }
    
    // Custom className
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Renderizar mensagem de validação
  const renderValidationMessage = () => {
    if (!validationMessage) return null;
    
    const messageClasses = ['form-text', 'form-hint'];
    if (isInvalid || validationStatus === 'invalid') {
      messageClasses.push('text-danger');
    } else if (isValid || validationStatus === 'valid') {
      messageClasses.push('text-success');
    }
    
    return (
      <div className={messageClasses.join(' ')}>
        {validationMessage}
      </div>
    );
  };

  // Handler para onChange
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange({
        value: multiple ? Array.from(event.target.selectedOptions).map(option => option.value) : event.target.value,
        name: event.target.name,
        event,
      });
    }
  };

  // Renderizar opções
  const renderOptions = () => {
    if (loading) {
      return (
        <option value="" disabled>
          {defaultLoadingText}
        </option>
      );
    }

    if (options.length === 0) {
      return (
        <option value="" disabled>
          {defaultEmptyText}
        </option>
      );
    }

    // Agrupar opções se necessário
    const groupedOptions = options.reduce((groups, option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = [];
        }
        groups[option.group].push(option);
      } else {
        if (!groups['default']) {
          groups['default'] = [];
        }
        groups['default'].push(option);
      }
      return groups;
    }, {} as Record<string, SelectOption[]>);

    return Object.entries(groupedOptions).map(([groupName, groupOptions]) => {
      if (groupName === 'default') {
        return groupOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ));
      }

      return (
        <optgroup key={groupName} label={groupName}>
          {groupOptions.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </optgroup>
      );
    });
  };

  return (
    <>
      <select
        ref={ref}
        className={getSelectClasses()}
        value={value}
        defaultValue={defaultValue}
        name={name}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        multiple={multiple}
        required={required}
        disabled={disabled || loading}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        id={id}
        data-testid={dataTestId}
        {...getBootstrapTooltipProps(tooltip, tooltipPosition)}
      >
        {!multiple && !value && (
          <option value="" disabled>
            {defaultPlaceholder}
          </option>
        )}
        {renderOptions()}
      </select>
      {renderValidationMessage()}
    </>
  );
});

Select.displayName = 'Select';

export default Select;
