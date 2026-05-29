import React from 'react';
import { formatCurrency } from 'utils/formatters';
import { ContasPagarResumoFinanceiro, ContasPagarTranslateFn } from './contasPagarListTypes';

interface ContasPagarListResumoProps {
  resumoFinanceiro: ContasPagarResumoFinanceiro;
  isMobile: boolean;
  t: ContasPagarTranslateFn;
}

export const ContasPagarListResumo: React.FC<ContasPagarListResumoProps> = ({
  resumoFinanceiro,
  isMobile,
  t,
}) => (
  <div
    className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo"
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
        <div className="small text-muted">{t('summary.value')}</div>
        <strong>{formatCurrency(resumoFinanceiro.valorTotal)}</strong>
      </div>
      <div className="text-end">
        <div className="small text-muted">{t('summary.paidValue')}</div>
        <strong>{formatCurrency(resumoFinanceiro.valorBaixado)}</strong>
      </div>
      <div className="text-end">
        <div className="small text-muted">{t('summary.openValue')}</div>
        <strong>{formatCurrency(resumoFinanceiro.valorAberto)}</strong>
      </div>
      <div className="text-end">
        <div className="small text-muted">{t('summary.totalPaidValue')}</div>
        <strong>{formatCurrency(resumoFinanceiro.valorTotalPago)}</strong>
      </div>
      <div className="text-end">
        <div className="small text-muted">{t('summary.canceledValue')}</div>
        <strong>{formatCurrency(resumoFinanceiro.valorCancelado)}</strong>
      </div>
    </div>
  </div>
);
