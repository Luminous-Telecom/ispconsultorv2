import React from 'react';
import { TranslationKeys } from 'contexts/I18nContext';
import { TableColumn as TableColumnType } from 'components/tables/types';
import { CarneParcela } from 'types';
import { formatCurrency, formatDate, formatDateTime } from 'utils/formatters';
import { getTituloStatusColor } from './clienteStatusUtils';

type TranslateFn = (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;

export function buildClienteTituloColumns(t: TranslateFn): TableColumnType<CarneParcela>[] {
  return [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item) => item.id,
    },
    {
      key: 'contrato_id',
      label: t('table.contract'),
      sortable: true,
      searchable: true,
      render: (item) => {
        const itemAny = item as unknown as { contrato_id?: number; contrato?: { id?: number } };
        const contratoId = itemAny.contrato_id || itemAny.contrato?.id;
        return contratoId || '-';
      },
    },
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      badgeLabels: [
        t('status.paid'),
        t('status.paidLate'),
        t('status.pending'),
        t('status.overdue'),
        t('status.partial'),
        t('status.cancelled'),
      ],
      render: (item) => (
        <span className={`badge bg-${getTituloStatusColor(item.status)}`}>
          {item.status === 'pago'
            ? t('status.paid')
            : item.status === 'pago_atraso'
              ? t('status.paidLate')
              : item.status === 'pendente'
                ? t('status.pending')
                : item.status === 'vencido'
                  ? t('status.overdue')
                  : item.status === 'parcial'
                    ? t('status.partial')
                    : item.status === 'cancelado'
                      ? t('status.cancelled')
                      : item.status}
        </span>
      ),
    },
    {
      key: 'plano_nome',
      label: t('table.plan'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { plano_nome?: string }) =>
        item.plano?.nome_plano || item.plano_nome || '-',
    },
    {
      key: 'data_vencimento',
      label: t('table.dueDate'),
      sortable: true,
      searchable: false,
      render: (item) => formatDate(item.data_vencimento),
    },
    {
      key: 'valor',
      label: t('table.value'),
      sortable: true,
      searchable: true,
      render: (item) => formatCurrency(item.valor || 0),
    },
    {
      key: 'valor_pago',
      label: t('table.paidValue'),
      sortable: true,
      searchable: true,
      render: (item) =>
        item.status === 'pago'
          ? formatCurrency(item.valor_pago || item.valor || 0)
          : formatCurrency(0),
    },
    {
      key: 'valor_aberto',
      label: t('table.openValue'),
      sortable: true,
      searchable: false,
      render: (item) =>
        item.status === 'pago' || item.status === 'cancelado'
          ? formatCurrency(0)
          : formatCurrency(item.valor || 0),
    },
    {
      key: 'nfse_numero',
      label: t('table.invoice'),
      sortable: true,
      searchable: true,
      render: (item: CarneParcela & { nfse_numero?: string | null }) => item.nfse_numero || '-',
    },
    {
      key: 'nfse_status',
      label: t('table.invoiceStatus'),
      sortable: true,
      searchable: true,
      badgeLabels: [
        t('status.scheduled'),
        t('status.issued'),
        t('status.cancelled'),
        t('status.rejected'),
        t('status.error'),
      ],
      render: (
        item: CarneParcela & {
          nfse_status?: 'agendado' | 'emitida' | 'cancelada' | 'rejeitada' | 'erro' | null;
        }
      ) => {
        if (!item.nfse_status) return '-';
        const statusMap: Record<string, { label: string; color: string }> = {
          agendado: { label: t('status.scheduled'), color: 'info' },
          emitida: { label: t('status.issued'), color: 'success' },
          cancelada: { label: t('status.cancelled'), color: 'danger' },
          rejeitada: { label: t('status.rejected'), color: 'warning' },
          erro: { label: t('status.error'), color: 'danger' },
        };
        const status = statusMap[item.nfse_status] || {
          label: item.nfse_status,
          color: 'secondary',
        };
        return <span className={`badge bg-${status.color}`}>{status.label}</span>;
      },
    },
    {
      key: 'data_pagamento',
      label: t('table.paymentDate'),
      sortable: true,
      searchable: false,
      render: (item) => {
        if (item.data_pagamento_formatada) {
          return item.data_pagamento_formatada;
        }
        return item.data_pagamento ? formatDate(item.data_pagamento) : '-';
      },
    },
    {
      key: 'charge_id',
      label: t('table.chargeId'),
      sortable: true,
      searchable: true,
      render: (item) => item.charge_id || '-',
    },
    {
      key: 'nosso_numero',
      label: t('table.ourNumber'),
      sortable: true,
      searchable: true,
      render: (item) => item.nosso_numero || '-',
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      searchable: false,
      render: (item: CarneParcela & { created_at?: string }) =>
        item.created_at ? formatDateTime(item.created_at) : '-',
    },
  ];
}
