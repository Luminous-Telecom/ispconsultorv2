import React from 'react';
import { SaasTitulo } from 'services/saas/saasCrudService';
import { ContasReceberTranslateFn } from './contasReceberListTypes';

export const canGerarBoletoSaas = (t: SaasTitulo) =>
  t.status === 'pendente' && t.banco && ['efi', 'asaas'].includes(t.banco.tipo_banco?.toLowerCase() || '');

export const formatContasReceberCurrency = (value: number | string | null | undefined): string => {
  if (!value) return 'R$ 0,00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export const createGetStatusBadge = (t: ContasReceberTranslateFn) => {
  return (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pendente: { label: t('status.pending'), className: 'bg-warning' },
      pago: { label: t('status.paid'), className: 'bg-success' },
      vencido: { label: t('status.overdue'), className: 'bg-danger' },
      cancelado: { label: t('status.cancelled'), className: 'bg-secondary' },
      parcial: { label: t('status.partial'), className: 'bg-info' },
      pago_atraso: { label: t('status.paidLate'), className: 'bg-primary' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-secondary' };
    return React.createElement('span', { className: `badge ${config.className}` }, config.label);
  };
};
