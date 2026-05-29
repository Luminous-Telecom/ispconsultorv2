import React from 'react';
import { ContaPagar } from 'types';
import { ContasPagarResumoFinanceiro, ContasPagarTranslateFn } from './contasPagarListTypes';

export const createGetStatusBadge = (t: ContasPagarTranslateFn) => {
  return (status: ContaPagar['status']) => {
    const statusMap = {
      A_PAGAR: { label: t('financial.toPay'), className: 'bg-warning' },
      PAGO: { label: t('financial.paid'), className: 'bg-success' },
      PARCIAL: { label: t('status.pending'), className: 'bg-info' },
      CANCELADO: { label: t('status.rejected'), className: 'bg-secondary' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'bg-secondary' };
    return React.createElement('span', { className: `badge ${statusInfo.className}` }, statusInfo.label);
  };
};

export const createGetTipoPagamentoBadge = (t: ContasPagarTranslateFn) => {
  return (tipo: ContaPagar['tipo_pagamento']) => {
    const tipoMap: Record<string, string> = {
      DINHEIRO: t('form.paymentTypeCash'),
      BOLETO: t('form.paymentTypeBoleto'),
      CARTAO: t('form.paymentTypeCard'),
      DEPOSITO: t('form.paymentTypeDeposit'),
      DEBITO_CONTA: t('form.paymentTypeDebit'),
      TRANSFERENCIA: t('form.paymentTypeTransfer'),
      PIX: t('form.paymentTypePix'),
    };
    return tipoMap[tipo] || tipo;
  };
};

export const calcResumoFinanceiro = (contas: ContaPagar[]): ContasPagarResumoFinanceiro => {
  const valorTotal = contas.reduce((sum, item) => sum + Number(item.valor || 0), 0);

  const valorBaixado = contas.reduce((sum, item) => {
    const valorPago = Number(item.valor_pago || 0);
    if (valorPago > 0) return sum + valorPago;
    return sum;
  }, 0);

  const valorAberto = contas.reduce((sum, item) => {
    if (item.status === 'PAGO' || item.status === 'CANCELADO') return sum;
    const valor = Number(item.valor || 0);
    const valorPago = Number(item.valor_pago || 0);
    const valorAbertoItem = valor - valorPago;
    return sum + (valorAbertoItem > 0 ? valorAbertoItem : 0);
  }, 0);

  const valorTotalPago = contas.reduce((sum, item) => {
    if (item.status === 'PAGO') return sum + Number(item.valor || 0);
    return sum;
  }, 0);

  const valorCancelado = contas.reduce((sum, item) => {
    if (item.status === 'CANCELADO') return sum + Number(item.valor || 0);
    return sum;
  }, 0);

  return { valorTotal, valorBaixado, valorAberto, valorTotalPago, valorCancelado };
};
