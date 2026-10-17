import React, { useMemo } from 'react';
import { ContaPagar } from 'types';
import { formatDateTime, formatDate, formatCurrency } from 'utils/formatters';
import { ListModalConfig } from 'types/modal';
import { ContasPagarTranslateFn } from './contasPagarListTypes';

interface UseContasPagarListColumnsParams {
  t: ContasPagarTranslateFn;
  getStatusBadge: (status: ContaPagar['status']) => React.ReactNode;
  getTipoPagamentoBadge: (tipo: ContaPagar['tipo_pagamento']) => string;
}

export function useContasPagarListColumns({
  t,
  getStatusBadge,
  getTipoPagamentoBadge,
}: UseContasPagarListColumnsParams): ListModalConfig<ContaPagar>['columns'] {
  return useMemo(
    (): ListModalConfig<ContaPagar>['columns'] => [
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        badgeLabels: [
          t('financial.toPay'),
          t('financial.paid'),
          t('status.pending'),
          t('status.rejected'),
        ],
        render: (item) => getStatusBadge(item.status),
      },
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        render: (item) => <span className="text-nowrap">{item.id ?? '-'}</span>,
      },
      {
        key: 'fornecedor',
        label: t('table.supplier'),
        sortable: true,
        render: (item) => item.fornecedor?.nome_razao_social || '-',
      },
      {
        key: 'data_vencimento',
        label: t('table.dueDate'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">
            {item.data_vencimento ? formatDate(item.data_vencimento) : '-'}
          </span>
        ),
      },
      {
        key: 'valor',
        label: t('table.value'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">{formatCurrency(item.valor || 0)}</span>
        ),
      },
      {
        key: 'valor_pago',
        label: t('table.paidValue'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">{formatCurrency(item.valor_pago || 0)}</span>
        ),
      },
      {
        key: 'saldo_devedor',
        label: t('table.balanceDue'),
        sortable: true,
        width: '130px',
        render: (item) => {
          const valor =
            typeof item.valor === 'number' ? item.valor : parseFloat(String(item.valor || 0));
          const valorPago =
            typeof item.valor_pago === 'number'
              ? item.valor_pago
              : parseFloat(String(item.valor_pago || 0));
          const saldo = valor - valorPago;
          return (
            <span className={`text-nowrap ${saldo > 0 ? 'text-danger' : 'text-success'}`}>
              {formatCurrency(saldo)}
            </span>
          );
        },
      },
      {
        key: 'tipo_pagamento',
        label: t('table.paymentType'),
        sortable: true,
        width: '150px',
        render: (item) => (
          <span className="text-nowrap">{getTipoPagamentoBadge(item.tipo_pagamento)}</span>
        ),
      },
      {
        key: 'numero_documento',
        label: t('table.documentNumber'),
        sortable: true,
        width: '150px',
        render: (item) => (
          <span className="text-nowrap">{item.numero_documento || '-'}</span>
        ),
      },
      {
        key: 'descricao',
        label: t('table.description'),
        sortable: true,
        width: '200px',
        render: (item) => (
          <span className="text-nowrap" title={item.descricao || ''}>
            {item.descricao
              ? item.descricao.length > 50
                ? `${item.descricao.substring(0, 50)}...`
                : item.descricao
              : '-'}
          </span>
        ),
      },
      {
        key: 'data_pagamento',
        label: t('table.paymentDate'),
        sortable: true,
        width: '130px',
        render: (item) => (
          <span className="text-nowrap">
            {item.data_pagamento ? formatDate(item.data_pagamento) : '-'}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        width: '150px',
        render: (item) => {
          const row = item as ContaPagar & {
            created_at?: string;
            created_at_formatada?: string | null;
          };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [t, getStatusBadge, getTipoPagamentoBadge]
  );
}
