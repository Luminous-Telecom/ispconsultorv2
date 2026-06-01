import React from 'react';

export interface DetailFieldItem {
  label: string;
  value: React.ReactNode;
  colClassName?: string;
}

export interface DetailFieldGridProps {
  fields: DetailFieldItem[];
  className?: string;
}

const DetailFieldGrid: React.FC<DetailFieldGridProps> = ({ fields, className = '' }) => (
  <div className={`row g-3 ${className}`.trim()}>
    {fields.map((field) => (
      <div key={field.label} className={field.colClassName ?? 'col-md-6'}>
        <label className="form-label text-muted small mb-1">{field.label}</label>
        <div className="form-control-plaintext">{field.value ?? '—'}</div>
      </div>
    ))}
  </div>
);

export default DetailFieldGrid;
