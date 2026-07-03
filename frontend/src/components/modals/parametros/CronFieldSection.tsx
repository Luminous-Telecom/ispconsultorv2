import React from 'react';
import type { CronPartMode } from 'utils/cronFieldForm';
import { AtivoInativoField, FormField } from 'components/ui';

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
  return (
    <div className="mb-3">
      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{label}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>
      <div className="row g-2">
        <div className="col-12">
          <AtivoInativoField
            id={`${idPrefix}-modo`}
            name={`${idPrefix}-modo`}
            value={mode === 'todos'}
            onChange={(value) => onModeChange(value ? 'todos' : 'valor')}
            label={labelTipo}
            trueLabel={labelTodos}
            falseLabel={labelValor}
            disabled={disabled}
          />
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
