import { useMemo } from 'react';
import { ContasPagarTranslateFn } from './contasPagarListTypes';

interface FornecedorOption {
  value: string;
  label: string;
}

export function useContasPagarTableFilters(
  t: ContasPagarTranslateFn,
  fornecedoresOptions: FornecedorOption[]
) {
  return useMemo(
    () => [
      {
        key: 'fornecedor_id',
        label: t('table.supplier'),
        type: 'select' as const,
        options: fornecedoresOptions,
        placeholder: t('placeholder.selectProvider'),
      },
      {
        key: 'data_inicio',
        label: t('form.dueDateStart'),
        type: 'date' as const,
        placeholder: t('placeholder.startDate'),
      },
      {
        key: 'data_fim',
        label: t('form.dueDateEnd'),
        type: 'date' as const,
        placeholder: t('placeholder.endDate'),
      },
      {
        key: 'status',
        label: t('table.status'),
        type: 'select' as const,
        options: [
          { value: 'A_PAGAR', label: t('financial.toPay') },
          { value: 'PAGO', label: t('financial.paid') },
          { value: 'PARCIAL', label: t('status.pending') },
          { value: 'CANCELADO', label: t('status.rejected') },
        ],
        placeholder: t('ui.selectOption'),
      },
      {
        key: 'tipo_pagamento',
        label: t('form.paymentType'),
        type: 'select' as const,
        options: [
          { value: 'DINHEIRO', label: t('form.paymentTypeCash') },
          { value: 'BOLETO', label: t('form.paymentTypeBoleto') },
          { value: 'CARTAO', label: t('form.paymentTypeCard') },
          { value: 'DEPOSITO', label: t('form.paymentTypeDeposit') },
          { value: 'DEBITO_CONTA', label: t('form.paymentTypeDebit') },
          { value: 'TRANSFERENCIA', label: t('form.paymentTypeTransfer') },
          { value: 'PIX', label: t('form.paymentTypePix') },
        ],
        placeholder: t('placeholder.selectType'),
      },
    ],
    [t, fornecedoresOptions]
  );
}
