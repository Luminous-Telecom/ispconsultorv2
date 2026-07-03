import React from 'react';
import { LabelWithHelp } from './LabelWithHelp';
import CopyableInput, { CopyableInputProps } from './CopyableInput';

export interface CopyableFormFieldProps extends CopyableInputProps {
  label: string;
  helpText?: string;
  formPrefix?: string;
  /** Ações abaixo do campo (ex.: Gerar token) */
  footerActions?: React.ReactNode;
  footerHint?: React.ReactNode;
}

const CopyableFormField: React.FC<CopyableFormFieldProps> = ({
  label,
  helpText,
  formPrefix,
  name,
  id,
  required,
  error,
  isInvalid,
  footerActions,
  footerHint,
  ...inputProps
}) => {
  const fieldId = id ?? (formPrefix && name ? `${formPrefix}-field-${name}` : name ? `field-${name}` : undefined);

  return (
    <div className="form-field">
      <LabelWithHelp
        htmlFor={fieldId}
        className="form-label"
        helpText={helpText}
        required={required}
      >
        {label}
      </LabelWithHelp>
      <div className="form-field-control">
        <CopyableInput
          {...inputProps}
          id={fieldId}
          name={name}
          required={required}
          error={error}
          isInvalid={isInvalid ?? !!error}
        />
        {footerActions ? (
          <div className="d-flex flex-wrap gap-2 mt-2">{footerActions}</div>
        ) : null}
        {footerHint}
      </div>
    </div>
  );
};

export default CopyableFormField;
