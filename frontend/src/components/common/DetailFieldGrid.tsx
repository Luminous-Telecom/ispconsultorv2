import React from 'react';

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

      return (
        <div key={field.label} className={field.colClassName ?? 'col-md-6'}>
          <label className="form-label text-muted small mb-1">{field.label}</label>
          {inputText != null ? (
            <input
              type="text"
              className={`form-control form-control-sm bg-secondary bg-opacity-10 small ${field.inputClassName ?? ''}`.trim()}
              value={inputText}
              readOnly
              aria-readonly
            />
          ) : (
            <div className="form-control-plaintext">{field.value ?? '—'}</div>
          )}
        </div>
      );
    })}
  </div>
);

export default DetailFieldGrid;
