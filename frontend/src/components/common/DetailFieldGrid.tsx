import React from 'react';
import FormField from 'components/ui/FormField';

export interface DetailFieldItem {
  label: string;
  value: React.ReactNode;
  colClassName?: string;
  inputClassName?: string;
}

export interface DetailFieldGridProps {
  fields: DetailFieldItem[];
  className?: string;
}

function resolveInputText(value: React.ReactNode): string | null {
  if (value == null || value === false) return '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'number') return String(value);
  return null;
}

const DetailFieldGrid: React.FC<DetailFieldGridProps> = ({ fields, className = '' }) => (
  <div className={`row g-2 ${className}`.trim()}>
    {fields.map((field) => {
      const inputText = resolveInputText(field.value);
      const fieldName = `detail-${field.label.toLowerCase().replace(/\s+/g, '_')}`;

      return (
        <div key={field.label} className={field.colClassName ?? 'col-12'}>
          {inputText != null ? (
            <FormField
              name={fieldName}
              type="text"
              label={field.label}
              value={inputText}
              onChange={() => undefined}
              readOnly
              size="sm"
              className={field.inputClassName}
            />
          ) : (
            <div className="form-field">
              <label className="form-label small">{field.label}</label>
              <div className="form-field-control">
                <div className="form-control-plaintext small">{field.value ?? '—'}</div>
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

export default DetailFieldGrid;
