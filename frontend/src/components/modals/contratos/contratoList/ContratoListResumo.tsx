import React from 'react';
import { formatContratoCurrency } from './contratoListUtils';
import { ContratoTranslateFn } from './contratoListTypes';

interface ContratoListResumoProps {
  show: boolean;
  hasData: boolean;
  valorTotalMensal: number;
  valorTotalDescontos: number;
  t: ContratoTranslateFn;
}

export const ContratoListResumo: React.FC<ContratoListResumoProps> = ({
  show,
  hasData,
  valorTotalMensal,
  valorTotalDescontos,
  t,
}) => {
  if (!show || !hasData) return null;

  return (
    <div
      className="p-3 bg-light rounded contrato-totais-resumo financeiro-resumo-adaptive"
    >
      <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
        <div className="text-end">
          <div className="small text-muted">{t('summary.monthlyTotalValue')} (Página)</div>
          <strong>{formatContratoCurrency(valorTotalMensal)}</strong>
        </div>
        <div className="text-end">
          <div className="small text-muted">{t('summary.totalDiscountsValue')} (Página)</div>
          <strong>{formatContratoCurrency(valorTotalDescontos)}</strong>
        </div>
      </div>
    </div>
  );
};
