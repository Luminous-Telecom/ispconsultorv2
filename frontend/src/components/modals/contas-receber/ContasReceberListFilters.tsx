import React from 'react';
import FinanceListFilters from 'components/forms/FinanceListFilters';

interface ContasReceberListFiltersProps {
  dataVencimentoInicio: string;
  dataVencimentoFim: string;
  onDataVencimentoInicioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDataVencimentoFimChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ContasReceberListFilters: React.FC<ContasReceberListFiltersProps> = ({
  dataVencimentoInicio,
  dataVencimentoFim,
  onDataVencimentoInicioChange,
  onDataVencimentoFimChange,
}) => (
  <FinanceListFilters
    idPrefix="contas-receber"
    dataVencimentoInicio={dataVencimentoInicio}
    dataVencimentoFim={dataVencimentoFim}
    onDataVencimentoInicioChange={(value) =>
      onDataVencimentoInicioChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
    }
    onDataVencimentoFimChange={(value) =>
      onDataVencimentoFimChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
    }
  />
);
