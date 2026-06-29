import React from 'react';
import { BaseComponentProps } from './types';

export interface TableFilterCheckboxProps extends BaseComponentProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
}

const TableFilterCheckbox: React.FC<TableFilterCheckboxProps> = ({
  label,
  checked,
  onChange,
  name,
  disabled = false,
  id: propId,
  className = '',
}) => {
  const autoId = React.useId().replace(/:/g, '');
  const fieldId = propId || `table-filter-${name ?? autoId}`;

  return (
    <div className={`form-check mb-0 ${className}`.trim()}>
      <input
        className="form-check-input"
        type="checkbox"
        id={fieldId}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <label className="form-check-label" htmlFor={fieldId}>
        {label}
      </label>
    </div>
  );
};

export default TableFilterCheckbox;
