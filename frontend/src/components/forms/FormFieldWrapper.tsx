import React from 'react';
import { FieldConfig, FieldValue } from './types';
import { useFormField } from './FormProvider';
import FormField from '../ui/FormField';

interface FormFieldWrapperProps {
  field: FieldConfig;
  className?: string;
}

const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  field,
  className = '',
}) => {
  const {
    value,
    error,
    touched,
    isValid,
    isInvalid,
    onChange,
    onBlur,
  } = useFormField(field.name);

  return (
    <div className={`form-field-wrapper ${className}`}>
      <FormField
        type={field.type}
        label={field.label}
        name={field.name}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        required={field.required}
        disabled={field.disabled}
        readOnly={field.readOnly}
        description={field.description}
        helpText={field.helpText}
        tooltip={field.tooltip}
        size={field.size}
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
        error={error}
        isValid={isValid && touched}
        isInvalid={isInvalid}
      />
    </div>
  );
};

export default FormFieldWrapper;
