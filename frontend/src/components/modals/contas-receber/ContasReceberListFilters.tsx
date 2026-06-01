import React from 'react';
import FinanceListFilters from 'components/forms/FinanceListFilters';
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
  <FinanceListFilters
    idPrefix="contas-receber"
    dataVencimentoInicio={dataVencimentoInicio}
    dataVencimentoFim={dataVencimentoFim}
    showCancelados={showCancelados}
    showCanceledLabel={t('filter.showCanceled')}
    onShowCanceladosChange={(checked) =>
      onShowCanceladosChange({ target: { checked } } as React.ChangeEvent<HTMLInputElement>)
    }
    onDataVencimentoInicioChange={(value) =>
      onDataVencimentoInicioChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
    }
    onDataVencimentoFimChange={(value) =>
      onDataVencimentoFimChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
    }
  />
);
