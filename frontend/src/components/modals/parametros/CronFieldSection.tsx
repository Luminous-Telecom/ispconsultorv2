import React from 'react';
import type { CronPartMode } from 'utils/cronFieldForm';

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
  const idValorInput = `${idPrefix}-input`;

  return (
    <div className="mb-3">
      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{label}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>
      <div className="row g-2 align-items-center mb-2">
        <div className="col-12 col-sm-auto">
          <span className="text-muted small">{labelTipo}</span>
        </div>
        <div className="col-12 col-sm">
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
      <div className="row g-2 align-items-center">
        <div className="col-12 col-sm-auto">
          <span className="text-muted small">{labelValorField}</span>
        </div>
        <div className="col-12 col-sm">
          <input
            id={idValorInput}
            type="text"
            className="form-control form-control-sm"
            value={mode === 'todos' ? '' : valor}
            onChange={(e) => onValorChange(e.target.value)}
            disabled={disabled || mode === 'todos'}
            placeholder={mode === 'todos' ? '—' : ''}
            autoComplete="off"
            aria-label={labelValorField}
          />
        </div>
      </div>
    </div>
  );
};

export default CronFieldSection;
