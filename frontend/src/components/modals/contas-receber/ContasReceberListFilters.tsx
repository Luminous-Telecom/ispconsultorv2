import React from 'react';
import { ContasReceberTranslateFn } from './contasReceberListTypes';

interface ContasReceberListFiltersProps {
  showCancelados: boolean;
  dataVencimentoInicio: string;
  dataVencimentoFim: string;
  onShowCanceladosChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDataVencimentoInicioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDataVencimentoFimChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: ContasReceberTranslateFn;
}

export const ContasReceberListFilters: React.FC<ContasReceberListFiltersProps> = ({
  showCancelados,
  dataVencimentoInicio,
  dataVencimentoFim,
  onShowCanceladosChange,
  onDataVencimentoInicioChange,
  onDataVencimentoFimChange,
  t,
}) => (
  <div className="d-flex align-items-center flex-wrap gap-2">
    <div className="form-check form-switch mb-0">
      <input
        className="form-check-input"
        type="checkbox"
        role="switch"
        id="showCanceladosFinanceiro"
        checked={showCancelados}
        onChange={onShowCanceladosChange}
        style={{ cursor: 'pointer' }}
      />
      <label
        className="form-check-label"
        htmlFor="showCanceladosFinanceiro"
        style={{ cursor: 'pointer' }}
      >
        {t('filter.showCanceled')}
      </label>
    </div>
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
