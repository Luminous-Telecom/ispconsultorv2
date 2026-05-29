import React from 'react';
import { ContasPagarTranslateFn } from './contasPagarListTypes';

interface ContasPagarListFiltersProps {
  dataVencimentoInicio: string;
  dataVencimentoFim: string;
  onDataVencimentoInicioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDataVencimentoFimChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: ContasPagarTranslateFn;
}

export const ContasPagarListFilters: React.FC<ContasPagarListFiltersProps> = ({
  dataVencimentoInicio,
  dataVencimentoFim,
  onDataVencimentoInicioChange,
  onDataVencimentoFimChange,
  t,
}) => (
  <div className="d-flex align-items-center gap-2">
    <label htmlFor="dataVencimentoInicio" className="form-label mb-0 small">
      {t('filter.startDate')}
    </label>
    <input
      type="date"
      id="dataVencimentoInicio"
      className="form-control form-control-sm table-pagination-filter"
      value={dataVencimentoInicio}
      onChange={onDataVencimentoInicioChange}
    />
    <label htmlFor="dataVencimentoFim" className="form-label mb-0 small">
      {t('filter.endDate')}
    </label>
    <input
      type="date"
      id="dataVencimentoFim"
      className="form-control form-control-sm table-pagination-filter"
      value={dataVencimentoFim}
      onChange={onDataVencimentoFimChange}
    />
  </div>
);
