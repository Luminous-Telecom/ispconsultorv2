import React, { forwardRef } from 'react';
import { BaseComponentProps, ValidationProps, TooltipProps, ChangeEvent } from './types';

interface CheckboxProps extends BaseComponentProps, ValidationProps, TooltipProps {
  checked?: boolean;
  defaultChecked?: boolean;
  value?: string | number;
  name?: string;
  onChange?: (event: ChangeEvent<boolean>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  label?: string;
  description?: string;
  required?: boolean;
  indeterminate?: boolean;
  inline?: boolean;
  switch?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  className = '',
  disabled = false,
  isValid,
  isInvalid,
  validationMessage,
  validationStatus,
  tooltip,
  tooltipPosition = 'top',
  checked,
  defaultChecked,
  value,
  name,
  onChange,
  onBlur,
  onFocus,
  label,
  description,
  required = false,
  indeterminate: _indeterminate = false,
  inline = false,
  switch: isSwitch = false,
  id,
  'data-testid': dataTestId,
}, ref) => {
  // Construir classes CSS
  const getCheckboxClasses = () => {
    const classes = ['form-check-input'];
    
    // Validation - apenas adicionar classes se explicitamente definidas
    if (isValid === true || validationStatus === 'valid') {
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

  // Construir classes do wrapper
  const getWrapperClasses = () => {
    const classes = ['form-check'];
    
    if (inline) {
      classes.push('form-check-inline');
    }
    
    if (isSwitch) {
      classes.push('form-switch');
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
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange({
        value: event.target.checked,
        name: event.target.name,
        event,
      });
    }
  };

  // Renderizar label (description vai no tooltip do ícone)
  const renderLabel = () => {
    if (!label) return null;
    const tooltipContent = tooltip || description;
    
    return (
      <label className="form-check-label" htmlFor={id}>
        {label}
        {required && <span className="text-danger ms-1">*</span>}
        {tooltipContent && (
          <i
            className="bi bi-info-circle text-muted ms-1"
            style={{ cursor: 'help', fontSize: '0.85rem' }}
            title={tooltipContent}
          />
        )}
      </label>
    );
  };

  const checkboxElement = (
    <input
      ref={ref}
      type="checkbox"
      className={getCheckboxClasses()}
      checked={Boolean(checked)}
      defaultChecked={defaultChecked}
      value={value}
      name={name}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      required={required}
      disabled={disabled}
      id={id}
      data-testid={dataTestId}
      title={tooltip}
      data-bs-toggle={tooltip ? 'tooltip' : undefined}
      data-bs-placement={tooltip ? tooltipPosition : undefined}
      data-bs-title={tooltip}
    />
  );

  // Se tem label, renderizar com wrapper
  if (label) {
    return (
      <div className={getWrapperClasses()}>
        {checkboxElement}
        {renderLabel()}
        {renderValidationMessage()}
      </div>
    );
  }

  // Renderizar checkbox simples
  return (
    <>
      {checkboxElement}
      {renderValidationMessage()}
    </>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
