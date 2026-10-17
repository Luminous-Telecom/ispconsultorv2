import React from 'react';
import { TranslationKeys } from 'contexts/I18nContext';
import { TableColumn as TableColumnType } from 'components/tables/types';
import { Titulo } from 'types';
import { TermoContrato } from 'services/termoContratoService';
import { ContratoPlanoAdicional } from 'services/contratoPlanoAdicionalService';
import { IntegracaoIxcProvedor } from 'services/integracaoIxcProvedorService';
import { formatDate, formatDateTime } from 'utils/formatters';
import { getTituloStatusEfetivo } from 'utils/tituloStatus';
import { getTituloStatusColor } from './contratoStatusUtils';

type TranslateFn = (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;

function renderTituloStatusBadge(item: Titulo, t: TranslateFn) {
  const status = getTituloStatusEfetivo(item);
  return (
    <span className={`badge bg-${getTituloStatusColor(status)}`}>
      {status === 'pago'
        ? t('status.paid')
        : status === 'pago_atraso'
          ? t('status.paidLate')
          : status === 'pendente'
            ? t('status.pending')
            : status === 'vencido'
              ? t('status.overdue')
              : status === 'parcial'
                ? t('status.partial')
                : status === 'cancelado'
                  ? t('status.cancelled')
                  : status}
    </span>
  );
}

function buildTituloBaseColumns(t: TranslateFn): TableColumnType<Titulo>[] {
  return [
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
      render: (item) => renderTituloStatusBadge(item, t),
    },
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      resizable: true,
      render: (item) => item.id,
    },
    {
      key: 'contrato_id',
      label: t('table.contract'),
      sortable: true,
      searchable: true,
      render: (item) => item.contrato_id || '-',
    },
    {
      key: 'plano',
      label: t('table.plan'),
      sortable: true,
      searchable: true,
      render: (item) => item.plano?.nome_plano || '-',
    },
    {
      key: 'numero_titulo',
      label: t('table.titleNumber'),
      sortable: true,
      searchable: true,
      render: (item) => item.numero_titulo || '-',
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
      label: t('form.value'),
      sortable: true,
      searchable: true,
      render: (item) => `R$ ${Number(item.valor || 0).toFixed(2)}`,
    },
    {
      key: 'valor_pago',
      label: t('table.paidValueDownloaded'),
      sortable: true,
      searchable: true,
      render: (item) =>
        item.status === 'pago'
          ? `R$ ${Number(item.valor_pago || item.valor || 0).toFixed(2)}`
          : 'R$ 0,00',
    },
    {
      key: 'valor_aberto',
      label: t('table.openValueOpen'),
      sortable: true,
      searchable: true,
      render: (item) =>
        item.status === 'pago' || item.status === 'cancelado'
          ? 'R$ 0,00'
          : `R$ ${Number(item.valor || 0).toFixed(2)}`,
    },
  ];
}

function buildTituloNfseColumns(t: TranslateFn): TableColumnType<Titulo>[] {
  return [
    {
      key: 'nfse_numero',
      label: t('table.nf'),
      sortable: true,
      searchable: true,
      render: (item) => item.nfse_numero || '-',
    },
    {
      key: 'nfse_status',
      label: t('table.nfStatus'),
      sortable: true,
      searchable: true,
      badgeLabels: [
        t('status.scheduled'),
        t('status.issued'),
        t('status.cancelled'),
        t('status.rejected'),
        t('status.error'),
      ],
      render: (item) => {
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
  ];
}

function buildTituloTailColumns(t: TranslateFn): TableColumnType<Titulo>[] {
  return [
    {
      key: 'data_pagamento',
      label: t('table.paymentDate'),
      sortable: true,
      searchable: false,
      render: (item) => {
        if (item.data_pagamento_formatada) return item.data_pagamento_formatada;
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
      render: (item) => {
        if (item.created_at_formatada) return item.created_at_formatada;
        return item.created_at ? formatDateTime(item.created_at) : '-';
      },
    },
  ];
}

export function buildContratoTituloColumns(t: TranslateFn): TableColumnType<Titulo>[] {
  return [...buildTituloBaseColumns(t), ...buildTituloNfseColumns(t), ...buildTituloTailColumns(t)];
}

export function buildContratoTituloAvulsoColumns(t: TranslateFn): TableColumnType<Titulo>[] {
  return [...buildTituloBaseColumns(t), ...buildTituloTailColumns(t)];
}

export function buildContratoTermosColumns(t: TranslateFn): TableColumnType<TermoContrato>[] {
  return [
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      badgeLabels: [t('status.active'), t('status.inactive')],
      render: (item) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? t('status.active') : t('status.inactive')}
        </span>
      ),
    },
    { key: 'id', label: t('table.id'), sortable: true, resizable: true },
    {
      key: 'nome_termo',
      label: t('table.termName'),
      sortable: true,
      render: (item) => item.modeloDocumento?.nome || '-',
    },
    {
      key: 'assinado',
      label: t('table.accepted'),
      sortable: true,
      badgeLabels: [t('ui.yes'), t('ui.no')],
      render: (item) => (
        <span className={`badge ${item.assinado === 'SIM' ? 'bg-success' : 'bg-secondary'}`}>
          {item.assinado === 'SIM' ? t('ui.yes') : t('ui.no')}
        </span>
      ),
    },
    {
      key: 'data_aceite',
      label: t('table.acceptedDate'),
      sortable: true,
      render: (item) => formatDateTime(item.data_aceite),
    },
    {
      key: 'aceito_por',
      label: t('table.acceptedBy'),
      sortable: true,
      render: (item) => item.aceito_por || '-',
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      render: (item) => formatDate(item.created_at),
    },
  ];
}

export function buildContratoServicosAdicionaisColumns(
  t: TranslateFn
): TableColumnType<ContratoPlanoAdicional>[] {
  return [
    {
      key: 'status',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('status.active'), t('status.inactive'), t('status.suspended')],
      render: (item) => {
        const statusColors: Record<string, string> = {
          ativo: 'success',
          inativo: 'secondary',
          suspenso: 'danger',
        };
        const color = statusColors[item.status] || 'secondary';
        return (
          <span className={`badge bg-${color}`}>
            {item.status === 'ativo'
              ? t('status.active')
              : item.status === 'inativo'
                ? t('status.inactive')
                : item.status === 'suspenso'
                  ? t('status.suspended')
                  : item.status}
          </span>
        );
      },
    },
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      resizable: true,
      render: (item) => item.id,
    },
    {
      key: 'plano',
      label: t('table.plan'),
      sortable: true,
      searchable: true,
      render: (item) => item.plano?.nome_plano || 'N/A',
    },
    {
      key: 'valor_original',
      label: t('form.originalValue'),
      sortable: true,
      searchable: false,
      render: (item) => {
        const valor = parseFloat(item.plano?.valor_mensal?.toString() || '0') || 0;
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
      },
    },
    {
      key: 'desconto',
      label: t('form.discount'),
      sortable: true,
      searchable: false,
      render: (item) => {
        if (item.desconto_valor && parseFloat(item.desconto_valor.toString()) > 0) {
          const valor = parseFloat(item.desconto_valor.toString()) || 0;
          return `R$ ${valor.toFixed(2).replace('.', ',')}`;
        }
        if (item.desconto_percentual && parseFloat(item.desconto_percentual.toString()) > 0) {
          const percentual = parseFloat(item.desconto_percentual.toString()) || 0;
          return `${percentual.toFixed(2).replace('.', ',')}%`;
        }
        return '-';
      },
    },
    {
      key: 'valor_final',
      label: t('table.finalValue'),
      sortable: true,
      searchable: false,
      render: (item) => {
        const valor = parseFloat(item.valor_final?.toString() || '0') || 0;
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
      },
    },
    {
      key: 'observacoes',
      label: t('form.observations'),
      sortable: true,
      searchable: true,
      render: (item) => item.observacoes || '-',
    },
  ];
}

export function buildContratoIxcColumns(
  t: TranslateFn
): TableColumnType<IntegracaoIxcProvedor>[] {
  return [
    {
      key: 'ativo',
      label: t('table.status'),
      sortable: true,
      searchable: true,
      badgeLabels: [t('status.active'), t('status.inactive')],
      render: (item) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? t('status.active') : t('status.inactive')}
        </span>
      ),
    },
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      searchable: true,
      resizable: true,
      render: (item) => item.id,
    },
    {
      key: 'nome',
      label: t('form.name'),
      sortable: true,
      searchable: true,
      render: (item) => item.nome,
    },
    {
      key: 'api_url',
      label: 'URL da API',
      sortable: true,
      searchable: true,
      render: (item) => item.api_url || '-',
    },
  ];
}
