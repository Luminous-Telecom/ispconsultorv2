import { renderStatusBadge } from 'components/ui/StatusBadge';
import { ContaPagar } from 'types';
import {
  getContaPagarStatusBadgeConfig,
  getContaPagarTipoPagamentoLabel,
} from 'utils/tableStatusBadges';
import { ContasPagarResumoFinanceiro, ContasPagarTranslateFn } from './contasPagarListTypes';

export const createGetStatusBadge = (t: ContasPagarTranslateFn) => {
  return (status: ContaPagar['status']) =>
    renderStatusBadge(getContaPagarStatusBadgeConfig(status, t));
};

export const createGetTipoPagamentoBadge = (t: ContasPagarTranslateFn) => {
  return (tipo: ContaPagar['tipo_pagamento']) => getContaPagarTipoPagamentoLabel(tipo, t);
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
