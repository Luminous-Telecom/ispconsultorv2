import React from 'react';
import DateRangeFilter from 'components/ui/DateRangeFilter';

export interface FinanceListFiltersProps {
  dataVencimentoInicio: string;
  dataVencimentoFim: string;
  onDataVencimentoInicioChange: (value: string) => void;
  onDataVencimentoFimChange: (value: string) => void;
  showCancelados?: boolean;
  onShowCanceladosChange?: (checked: boolean) => void;
  showCanceledLabel?: string;
  idPrefix?: string;
}

const FinanceListFilters: React.FC<FinanceListFiltersProps> = ({
  dataVencimentoInicio,
  dataVencimentoFim,
  onDataVencimentoInicioChange,
  onDataVencimentoFimChange,
  showCancelados,
  onShowCanceladosChange,
  showCanceledLabel,
  idPrefix = 'finance-list',
}) => (
  <div className="d-flex align-items-center flex-wrap gap-2">
    {onShowCanceladosChange != null && showCanceledLabel != null && (
      <div className="form-check form-switch mb-0">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id={`${idPrefix}-show-canceled`}
          checked={!!showCancelados}
          onChange={(e) => onShowCanceladosChange(e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label
          className="form-check-label"
          htmlFor={`${idPrefix}-show-canceled`}
          style={{ cursor: 'pointer' }}
        >
          {showCanceledLabel}
        </label>
      </div>
    )}
    <DateRangeFilter
      variant="table"
      idPrefix={`${idPrefix}-vencimento`}
      startDate={dataVencimentoInicio}
      endDate={dataVencimentoFim}
      onStartDateChange={onDataVencimentoInicioChange}
      onEndDateChange={onDataVencimentoFimChange}
    />
  </div>
);

export default FinanceListFilters;
