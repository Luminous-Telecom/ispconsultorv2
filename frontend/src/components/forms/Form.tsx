import React, { ReactNode } from 'react';
import { FormConfig, FieldConfig } from './types';
import { FormProvider, useFormContext } from './FormProvider';
import FormField from '../ui/FormField';
import Button from '../ui/Button';

interface FormProps {
  config: FormConfig;
  initialValues?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  onReset?: () => void;
  onFieldChange?: (name: string, value: any, allData: Record<string, any>) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  resetOnSubmit?: boolean;
  children?: ReactNode;
  showSubmitButton?: boolean;
  showResetButton?: boolean;
  submitButtonText?: string;
  resetButtonText?: string;
  submitButtonVariant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  resetButtonVariant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  className?: string;
  formPrefix?: string;
}

// Componente interno que renderiza o formulário
const FormContent: React.FC<{
  config: FormConfig;
  children?: ReactNode;
  showSubmitButton?: boolean;
  showResetButton?: boolean;
  submitButtonText?: string;
  resetButtonText?: string;
  submitButtonVariant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  resetButtonVariant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  className?: string;
  formPrefix?: string;
}> = ({
  config,
  children,
  showSubmitButton = true,
  showResetButton = false,
  submitButtonText = 'Salvar',
  resetButtonText = 'Limpar',
  submitButtonVariant = 'primary',
  resetButtonVariant = 'secondary',
  className = '',
  formPrefix,
}) => {
  const { state, actions } = useFormContext();

  // Renderizar campos baseado na configuração
  const renderFields = () => {
    if (children) {
      return children;
    }

    return config.fields.map((field) => (
      <FormField
        key={field.name}
        type={field.type}
        label={field.label}
        name={field.name}
        value={state.data[field.name]}
        onChange={(value) => actions.setValue(field.name, value)}
        placeholder={field.placeholder}
        required={field.required}
        disabled={field.disabled || config.disabled}
        readOnly={field.readOnly}
        description={field.description}
        helpText={field.helpText}
        tooltip={field.tooltip}
        size={field.size || config.spacing}
        options={field.options}
        rows={field.rows}
        cols={field.cols}
        min={field.min}
        max={field.max}
        step={field.step}
        minLength={field.minLength}
        maxLength={field.maxLength}
        pattern={field.pattern}
        autoComplete={field.autoComplete}
        autoFocus={field.autoFocus}
        multiple={field.multiple}
        searchable={field.searchable}
        clearable={field.clearable}
        loading={field.loading}
        loadingText={field.loadingText}
        emptyText={field.emptyText}
        inline={field.inline}
        switch={field.switch}
        indeterminate={field.indeterminate}
        icon={field.icon}
        iconPosition={field.iconPosition}
        iconSize={field.iconSize}
        error={state.errors[field.name]}
        isValid={!state.errors[field.name] && state.touched[field.name]}
        isInvalid={!!state.errors[field.name]}
        formPrefix={formPrefix}
      />
    ));
  };

  // Renderizar botões
  const renderButtons = () => {
    if (!showSubmitButton && !showResetButton) {
      return null;
    }

    return (
      <div className="d-flex gap-2">
        {showSubmitButton && (
          <Button
            type="submit"
            variant={submitButtonVariant}
            loading={state.isSubmitting}
            disabled={config.disabled || (!state.isValid && config.validateOnSubmit)}
            icon="check"
          >
            {submitButtonText}
          </Button>
        )}
        
        {showResetButton && (
          <Button
            type="button"
            variant={resetButtonVariant}
            onClick={() => actions.reset()}
            disabled={config.disabled || state.isSubmitting}
            icon="arrow-clockwise"
          >
            {resetButtonText}
          </Button>
        )}
      </div>
    );
  };

  // Determinar classes do container
  const getContainerClasses = () => {
    const classes = ['form-container'];
    
    if (config.layout === 'horizontal') {
      classes.push('form-horizontal');
    } else if (config.layout === 'inline') {
      classes.push('form-inline');
    } else {
      classes.push('form-vertical');
    }

    if (config.columns && config.columns > 1) {
      classes.push(`form-columns-${config.columns}`);
    }

    if (config.spacing) {
      classes.push(`form-spacing-${config.spacing}`);
    }

    if (className) {
      classes.push(className);
    }

    return classes.join(' ');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        actions.submit();
      }}
      onReset={(e) => {
        e.preventDefault();
        actions.reset();
      }}
      className={getContainerClasses()}
    >
      <div className="form-fields">
        {renderFields()}
      </div>
      
      <div className="form-actions">
        {renderButtons()}
      </div>
    </form>
  );
};

// Componente principal do Form
const Form: React.FC<FormProps> = ({
  config,
  initialValues = {},
  onSubmit,
  onReset,
  onFieldChange,
  validateOnChange = true,
  validateOnBlur = true,
  validateOnSubmit = true,
  resetOnSubmit = false,
  children,
  showSubmitButton = true,
  showResetButton = false,
  submitButtonText = 'Salvar',
  resetButtonText = 'Limpar',
  submitButtonVariant = 'primary',
  resetButtonVariant = 'secondary',
  className = '',
  formPrefix,
}) => {
  return (
    <FormProvider
      config={config}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onReset={onReset}
      onFieldChange={onFieldChange}
      validateOnChange={validateOnChange}
      validateOnBlur={validateOnBlur}
      validateOnSubmit={validateOnSubmit}
      resetOnSubmit={resetOnSubmit}
    >
      <FormContent
        config={config}
        children={children}
        showSubmitButton={showSubmitButton}
        showResetButton={showResetButton}
        submitButtonText={submitButtonText}
        resetButtonText={resetButtonText}
        submitButtonVariant={submitButtonVariant}
        resetButtonVariant={resetButtonVariant}
        className={className}
        formPrefix={formPrefix}
      />
    </FormProvider>
  );
};

export default Form;
