import { useMemo } from 'react';
import { ListModalConfig } from 'types/modal';
import { formatDateTime, formatRpkiValidityDisplay } from 'utils/formatters';
import type { RpkiRoaRow } from './types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  revoked: 'Revogado',
  expired: 'Expirado',
};

export function useRpkiRoaListColumns(clienteIdFilter?: number): ListModalConfig<RpkiRoaRow>['columns'] {
  return useMemo(() => {
    const cols: ListModalConfig<RpkiRoaRow>['columns'] = [
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        badgeLabels: ['active', 'revoked', 'expired'],
        render: (item) => {
          const status = String(item.status ?? 'active');
          const cor = status === 'active' ? 'bg-success' : status === 'revoked' ? 'bg-warning' : 'bg-secondary';
          return <span className={`badge ${cor}`}>{STATUS_LABELS[status] ?? status}</span>;
        },
      },
      { key: 'id', label: 'ID', sortable: true, render: (item) => String(item.id ?? '-') },
      { key: 'ca_nome', label: 'CA', sortable: true, width: '180px', render: (item) => String(item.ca_nome ?? '-') },
    ];
    if (clienteIdFilter == null) {
      cols.push({
        key: 'clienteNome',
        label: 'Cliente',
        sortable: true,
        width: '220px',
        render: (item) => String(item.clienteNome ?? '—'),
      });
    }
    cols.push(
      { key: 'prefix', label: 'Prefixo', sortable: true, width: '170px', render: (item) => String(item.prefix ?? '-') },
      { key: 'asn', label: 'ASN', sortable: true, width: '110px', render: (item) => String(item.asn ?? '-') },
      { key: 'max_length', label: 'Max Length', sortable: true, width: '110px', render: (item) => String(item.max_length ?? '-') },
      {
        key: 'not_before',
        label: 'Válido de',
        sortable: true,
        width: '165px',
        render: (item) => formatRpkiValidityDisplay(item.not_before ?? null),
      },
      {
        key: 'not_after',
        label: 'Válido até',
        sortable: true,
        width: '165px',
        render: (item) => formatRpkiValidityDisplay(item.not_after ?? null),
      },
      {
        key: 'revoked_at',
        label: 'Revogado em',
        sortable: true,
        width: '165px',
        render: (item) => (item.revoked_at ? formatDateTime(item.revoked_at) : '-'),
      },
    );
    return cols;
  }, [clienteIdFilter]);
}

export function useRpkiRoaListSearchFields(clienteIdFilter?: number) {
  return useMemo(() => {
    const fields = [
      { key: 'status', label: 'Status' },
      { key: 'id', label: 'ID' },
      { key: 'ca_nome', label: 'CA' },
    ];
    if (clienteIdFilter == null) {
      fields.push({ key: 'clienteNome', label: 'Cliente' });
    }
    fields.push(
      { key: 'prefix', label: 'Prefixo' },
      { key: 'asn', label: 'ASN' },
    );
    return fields;
  }, [clienteIdFilter]);
}
