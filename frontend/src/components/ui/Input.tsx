import React, { forwardRef } from 'react';
import { BaseComponentProps, ValidationProps, IconProps, TooltipProps, InputType, InputSize, ChangeEvent } from './types';

interface InputProps extends BaseComponentProps, ValidationProps, IconProps, TooltipProps {
  type?: InputType;
  size?: InputSize;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  name?: string;
  onChange?: (event: ChangeEvent) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number | 'any';
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  size = 'md',
  className = '',
  disabled = false,
  isValid,
  isInvalid,
  validationMessage,
  validationStatus,
  icon,
  iconPosition = 'left',
  iconSize = 'md',
  tooltip,
  tooltipPosition = 'top',
  value,
  defaultValue: _defaultValue,
  placeholder,
  name,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  onKeyUp,
  min,
  max,
  step,
  minLength,
  maxLength,
  pattern,
  required = false,
  readOnly = false,
  autoComplete,
  autoFocus = false,
  tabIndex,
  inputMode,
  id,
  'data-testid': dataTestId,
}, ref) => {
  // Construir classes CSS
  const getInputClasses = () => {
    const classes = ['form-control'];
    
    // Size
    if (size !== 'md') {
      classes.push(`form-control-${size}`);
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

  // Construir classes do wrapper
  const getWrapperClasses = () => {
    const classes = ['input-wrapper'];
    
    if (icon) {
      classes.push(`input-icon-${iconPosition}`);
    }
    
    return classes.join(' ');
  };

  // Renderizar ícone
  const renderIcon = () => {
    if (!icon) return null;
    
    const iconClasses = ['bi', `bi-${icon}`, 'input-icon'];
    if (iconSize !== 'md') {
      iconClasses.push(`fs-${iconSize}`);
    }
    
    return <i className={iconClasses.join(' ')}></i>;
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
        value: event.target.value,
        name: event.target.name,
        event,
      });
    }
  };

  // Se tem ícone, renderizar com wrapper
  if (icon) {
    return (
      <div className={getWrapperClasses()}>
        {renderIcon()}
        <input
          ref={ref}
          type={type}
          className={getInputClasses()}
          value={value ?? ''}
          placeholder={placeholder}
          name={name}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          min={min}
          max={max}
          step={step}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          inputMode={inputMode}
          id={id}
          data-testid={dataTestId}
          title={tooltip}
          data-bs-toggle={tooltip ? 'tooltip' : undefined}
          data-bs-placement={tooltip ? tooltipPosition : undefined}
          data-bs-title={tooltip}
        />
        {renderValidationMessage()}
      </div>
    );
  }

  // Renderizar input simples
  return (
    <>
      <input
        ref={ref}
        type={type}
        className={getInputClasses()}
        value={value ?? ''}
        placeholder={placeholder}
        name={name}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        min={min}
        max={max}
        step={step}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        inputMode={inputMode}
        id={id}
        data-testid={dataTestId}
        title={tooltip}
        data-bs-toggle={tooltip ? 'tooltip' : undefined}
        data-bs-placement={tooltip ? tooltipPosition : undefined}
        data-bs-title={tooltip}
      />
      {renderValidationMessage()}
    </>
  );
});

Input.displayName = 'Input';

export default Input;
