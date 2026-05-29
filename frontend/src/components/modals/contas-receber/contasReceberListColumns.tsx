import React, { useMemo } from 'react';
import { Titulo } from 'types';
import { SaasTitulo } from 'services/saas/saasCrudService';
import { formatDate, formatDateTime } from 'utils/formatters';
import { ListModalConfig } from 'types/modal';
import { ContasReceberTranslateFn, TituloItemUnion } from './contasReceberListTypes';
import { formatContasReceberCurrency } from './contasReceberListUtils';

export function useContasReceberListColumns(
  t: ContasReceberTranslateFn,
  getStatusBadge: (status: string) => React.ReactNode
): ListModalConfig<TituloItemUnion>['columns'] {
  return useMemo(
    (): ListModalConfig<TituloItemUnion>['columns'] => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        searchable: true,
        width: 42,
        resizable: true,
        render: (item: TituloItemUnion) => <span>{item.id}</span>,
      },
      {
        key: 'cliente',
        label: t('table.client'),
        sortable: true,
        searchable: true,
        width: 220,
        resizable: true,
        render: (item: TituloItemUnion) => {
          const c = (item as Titulo).cliente || (item as SaasTitulo).empresa;
          if (c) {
            const r = c as { razao_social?: string; nome_fantasia?: string; nome_empresa?: string };
            return r.razao_social || r.nome_fantasia || r.nome_empresa || '-';
          }
          return '-';
        },
      },
      {
        key: 'contrato_id',
        label: t('table.contract'),
        sortable: true,
        searchable: true,
        width: 75,
        resizable: true,
        render: (item: TituloItemUnion) => item.contrato_id || '-',
      },
      {
        key: 'status',
        label: t('table.status'),
        sortable: true,
        searchable: true,
        badgeLabels: [
          t('status.pending'),
          t('status.paid'),
          t('status.overdue'),
          t('status.cancelled'),
          t('status.partial'),
          t('status.paidLate'),
        ],
        resizable: true,
        render: (item: TituloItemUnion) => getStatusBadge(item.status),
      },
      {
        key: 'plano_nome',
        label: t('table.plan'),
        sortable: true,
        searchable: true,
        width: 150,
        resizable: true,
        render: (item: TituloItemUnion) =>
          (item as Titulo).plano?.nome_plano || (item as SaasTitulo).plano?.nome || '-',
      },
      {
        key: 'numero_titulo',
        label: t('table.titleNumber'),
        sortable: true,
        searchable: true,
        width: 120,
        resizable: true,
        render: (item: TituloItemUnion) => item.numero_titulo || '-',
      },
      {
        key: 'data_vencimento',
        label: t('table.dueDate'),
        sortable: true,
        searchable: false,
        width: 90,
        resizable: true,
        render: (item: TituloItemUnion) => formatDate(item.data_vencimento),
      },
      {
        key: 'valor',
        label: t('table.value'),
        sortable: true,
        searchable: true,
        width: 75,
        resizable: true,
        render: (item: TituloItemUnion) =>
          formatContasReceberCurrency((item as Titulo).valor_final ?? item.valor),
      },
      {
        key: 'valor_pago',
        label: t('table.paidValue'),
        sortable: true,
        searchable: true,
        width: 100,
        resizable: true,
        render: (item: TituloItemUnion) => {
          const titulo = item as Titulo;
          const vp = titulo.valor_pago ?? (item as SaasTitulo).valor;
          return item.status === 'pago'
            ? formatContasReceberCurrency(Number(vp) || Number(item.valor) || 0)
            : formatContasReceberCurrency(0);
        },
      },
      {
        key: 'valor_aberto',
        label: t('table.openValue'),
        sortable: true,
        searchable: true,
        width: 93,
        render: (item: TituloItemUnion) => {
          const titulo = item as Titulo;
          const v = Number((titulo.valor_final ?? titulo.valor ?? item.valor) || 0);
          return item.status === 'pago' || item.status === 'cancelado'
            ? formatContasReceberCurrency(0)
            : formatContasReceberCurrency(v);
        },
      },
      {
        key: 'data_pagamento',
        label: t('table.paymentDate'),
        sortable: true,
        searchable: false,
        render: (item: TituloItemUnion) => {
          const titulo = item as Titulo;
          if (titulo.data_pagamento_formatada) return titulo.data_pagamento_formatada;
          const dp = titulo.data_pagamento ?? (item as SaasTitulo).data_pagamento;
          return dp ? formatDate(dp) : '-';
        },
      },
      {
        key: 'charge_id',
        label: t('table.chargeId'),
        sortable: true,
        searchable: true,
        render: (item: TituloItemUnion) => item.charge_id || '-',
      },
      {
        key: 'nosso_numero',
        label: t('table.ourNumber'),
        sortable: true,
        searchable: true,
        width: 108,
        render: (item: TituloItemUnion) => item.nosso_numero || '-',
      },
      {
        key: 'nfse_numero',
        label: t('table.invoice'),
        sortable: true,
        searchable: true,
        width: 60,
        render: (item: TituloItemUnion) => (item as Titulo).nfse_numero || '-',
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
        render: (item: TituloItemUnion) => {
          const nfse = (item as Titulo).nfse_status;
          if (!nfse) return '-';
          const statusMap: Record<string, { label: string; color: string }> = {
            agendado: { label: t('status.scheduled'), color: 'info' },
            emitida: { label: t('status.issued'), color: 'success' },
            cancelada: { label: t('status.cancelled'), color: 'danger' },
            rejeitada: { label: t('status.rejected'), color: 'warning' },
            erro: { label: t('status.error'), color: 'danger' },
          };
          const status = statusMap[nfse] || { label: nfse, color: 'secondary' };
          return <span className={`badge bg-${status.color}`}>{status.label}</span>;
        },
      },
      {
        key: 'created_at',
        label: t('table.createdAt'),
        sortable: true,
        searchable: false,
        render: (item: TituloItemUnion) => {
          const titulo = item as Titulo;
          if (titulo.created_at_formatada) return titulo.created_at_formatada;
          const ca = titulo.created_at ?? (item as SaasTitulo & { created_at?: string }).created_at;
          return ca ? formatDateTime(ca) : '-';
        },
      },
    ],
    [t, getStatusBadge]
  );
}
