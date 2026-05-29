import React from 'react';
import { formatContratoCurrency } from './contratoListUtils';
import { ContratoTranslateFn } from './contratoListTypes';

interface ContratoListResumoProps {
  show: boolean;
  hasData: boolean;
  valorTotalMensal: number;
  valorTotalDescontos: number;
  isMobile: boolean;
  t: ContratoTranslateFn;
}

export const ContratoListResumo: React.FC<ContratoListResumoProps> = ({
  show,
  hasData,
  valorTotalMensal,
  valorTotalDescontos,
  isMobile,
  t,
}) => {
  if (!show || !hasData) return null;

  return (
    <div
      className="p-3 bg-light rounded contrato-totais-resumo"
      style={{
        flexShrink: 0,
        marginTop: isMobile ? '0.25rem' : '0.5rem',
        marginBottom: 0,
        marginLeft: isMobile ? '0.5rem' : '1rem',
        marginRight: isMobile ? '0.5rem' : '1rem',
      }}
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
