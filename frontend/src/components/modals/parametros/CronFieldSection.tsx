import React from 'react';
import type { CronPartMode } from 'utils/cronFieldForm';
import { FormField } from 'components/ui';

export interface CronFieldSectionProps {
  /** Prefixo único para `id` dos controles (ex.: `saas-rotina-cron-0`). */
  idPrefix: string;
  label: string;
  mode: CronPartMode;
  valor: string;
  onModeChange: (mode: CronPartMode) => void;
  onValorChange: (valor: string) => void;
  disabled?: boolean;
  labelTodos: string;
  labelValor: string;
  labelTipo: string;
  labelValorField: string;
}

const CronFieldSection: React.FC<CronFieldSectionProps> = ({
  idPrefix,
  label,
  mode,
  valor,
  onModeChange,
  onValorChange,
  disabled,
  labelTodos,
  labelValor,
  labelTipo,
  labelValorField,
}) => {
  const idTodos = `${idPrefix}-todos`;
  const idValorCheck = `${idPrefix}-valor`;

  return (
    <div className="mb-3">
      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{label}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>
      <div className="row g-2">
        <div className="col-12">
          <div className="form-field">
            <label className="form-label small">{labelTipo}</label>
            <div className="form-field-control">
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <div className="form-check form-check-inline mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={idTodos}
                    checked={mode === 'todos'}
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.checked) onModeChange('todos');
                    }}
                  />
                  <label className="form-check-label" htmlFor={idTodos}>
                    {labelTodos}
                  </label>
                </div>
                <div className="form-check form-check-inline mb-0">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={idValorCheck}
                    checked={mode === 'valor'}
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.checked) onModeChange('valor');
                    }}
                  />
                  <label className="form-check-label" htmlFor={idValorCheck}>
                    {labelValor}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12">
          <FormField
            id={`${idPrefix}-input`}
            name={`${idPrefix}-input`}
            type="text"
            size="sm"
            label={labelValorField}
            value={mode === 'todos' ? '' : valor}
            onChange={(value) => onValorChange(String(value ?? ''))}
            disabled={disabled || mode === 'todos'}
            placeholder={mode === 'todos' ? '—' : ''}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
};

export default CronFieldSection;
