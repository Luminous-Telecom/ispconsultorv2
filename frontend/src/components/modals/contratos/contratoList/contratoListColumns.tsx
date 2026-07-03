import React, { useMemo } from 'react';
import { formatDate, formatDateTime } from 'utils/formatters';
import { ListModalConfig } from 'types/modal';
import { ContratoRow } from './contratoListTypes';
import { formatContratoCurrency } from './contratoListUtils';

export function useContratoListColumns(): ListModalConfig<ContratoRow>['columns'] {
  return useMemo(
    (): ListModalConfig<ContratoRow>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '42px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'cliente_razao_social',
        label: 'Cliente',
        sortable: true,
        width: '200px',
        render: (item) => (
          <div>{item.cliente?.razao_social || item.cliente_razao_social || '-'}</div>
        ),
      },
      {
        key: 'endereco',
        label: 'Endereço',
        sortable: true,
        width: '180px',
        render: (item) => <span>{item.endereco || '-'}</span>,
      },
      {
        key: 'numero',
        label: 'Número',
        sortable: true,
        width: '70px',
        render: (item) => <span>{item.numero || '-'}</span>,
      },
      {
        key: 'complemento',
        label: 'Complemento',
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.complemento || '-'}</span>,
      },
      {
        key: 'bairro',
        label: 'Bairro',
        sortable: true,
        width: '120px',
        render: (item) => <span>{item.bairro || '-'}</span>,
      },
      {
        key: 'cidade',
        label: 'Cidade',
        sortable: true,
        width: '130px',
        render: (item) => <span>{item.cidade || '-'}</span>,
      },
      {
        key: 'estado',
        label: 'Estado',
        sortable: true,
        width: '63px',
        render: (item) => <span>{item.estado || '-'}</span>,
      },
      {
        key: 'plano_nome',
        label: 'Plano',
        sortable: true,
        width: '140px',
        render: (item) => item.plano?.nome_plano || item.plano_nome || '-',
      },
      {
        key: 'valor_plano_num',
        label: 'Valor Plano',
        sortable: true,
        width: '90px',
        render: (item) =>
          item.plano?.valor_mensal
            ? formatContratoCurrency(Number(item.plano.valor_mensal))
            : '-',
      },
      {
        key: 'desconto_num',
        label: 'Desconto',
        sortable: true,
        width: '80px',
        render: (item) => {
          if (item.desconto_valor && Number(item.desconto_valor) > 0) {
            return formatContratoCurrency(Number(item.desconto_valor));
          }
          if (
            item.desconto_percentual &&
            Number(item.desconto_percentual) > 0 &&
            item.plano?.valor_mensal
          ) {
            const valorPlano = Number(item.plano.valor_mensal);
            const descontoValor = valorPlano * (Number(item.desconto_percentual) / 100);
            return formatContratoCurrency(descontoValor);
          }
          return '-';
        },
      },
      {
        key: 'valor_final_num',
        label: 'Valor Final',
        sortable: true,
        width: '82px',
        render: (item) =>
          item.valor_final ? formatContratoCurrency(Number(item.valor_final)) : '-',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        badgeLabels: ['Ativo', 'Inativo', 'Suspenso', 'Cancelado'],
        render: (item) => {
          const getStatusColor = (status: string) => {
            switch (status?.toLowerCase()) {
              case 'ativo':
                return 'bg-success';
              case 'inativo':
                return 'bg-danger';
              case 'suspenso':
                return 'bg-danger';
              case 'cancelado':
                return 'bg-secondary';
              default:
                return 'bg-warning text-dark';
            }
          };
          return (
            <span className={`badge ${getStatusColor(item.status || '')}`}>
              {item.status
                ? item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()
                : '-'}
            </span>
          );
        },
      },
      {
        key: 'data_inicio',
        label: 'Data Início',
        sortable: true,
        width: '85px',
        render: (item) => formatDate(item.data_inicio),
      },
      {
        key: 'created_at',
        label: 'Data cadastro',
        sortable: true,
        width: '140px',
        render: (item) => {
          const row = item as ContratoRow & {
            created_at_formatada?: string | null;
            created_at?: string;
          };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    []
  );
}

export const CONTRATO_LIST_DEFAULT_SEARCH_FIELD = 'cliente_razao_social';

export const CONTRATO_LIST_SEARCH_FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'cliente_razao_social', label: 'Cliente' },
  { key: 'plano_nome', label: 'Plano' },
  { key: 'status', label: 'Status' },
  { key: 'valor_final_num', label: 'Valor Final' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
];
