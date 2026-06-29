import React from 'react';
import DateRangeFilter from 'components/ui/DateRangeFilter';
import { TableFilterCheckbox } from 'components/ui';

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
      <TableFilterCheckbox
        id={`${idPrefix}-show-canceled`}
        name={`${idPrefix}-show-canceled`}
        label={showCanceledLabel}
        checked={!!showCancelados}
        onChange={onShowCanceladosChange}
      />
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
