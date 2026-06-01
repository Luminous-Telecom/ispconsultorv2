import React from 'react';
import FinanceListFilters from 'components/forms/FinanceListFilters';

interface ContasPagarListFiltersProps {
  dataVencimentoInicio: string;
  dataVencimentoFim: string;
  onDataVencimentoInicioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDataVencimentoFimChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ContasPagarListFilters: React.FC<ContasPagarListFiltersProps> = ({
  dataVencimentoInicio,
  dataVencimentoFim,
  onDataVencimentoInicioChange,
  onDataVencimentoFimChange,
}) => (
  <FinanceListFilters
    idPrefix="contas-pagar"
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
