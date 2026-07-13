import React from 'react';
import type { OrdemServico } from 'services/ordemServicoService';
import type { ListModalColumn } from 'types/modal';
import type { TableColumn } from 'components/tables/types';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import { formatIxcData } from 'utils/ixcDateTime';
import {
  getOrdemServicoPrioridadeBadgeConfig,
  ORDEM_SERVICO_PRIORIDADE_BADGE_LABELS,
} from './ordemServicoPrioridadeBadges';
import {
  getOrdemServicoStatusBadgeConfig,
  ORDEM_SERVICO_STATUS_BADGE_LABELS,
} from './ordemServicoStatusBadges';

export type OrdemServicoListColumn = ListModalColumn<OrdemServico> & TableColumn<OrdemServico>;

const truncar = (texto?: string, max = 80): string => {
  if (!texto) return '-';
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
};

export const ORDEM_SERVICO_LIST_SEARCH_FIELDS = [
  { key: 'id', label: 'ID' },
  { key: 'cliente_nome', label: 'Cliente' },
  { key: 'operador_nome', label: 'Operador' },
  { key: 'estrutura_nome', label: 'Estrutura' },
  { key: 'mensagem', label: 'Descrição' },
  { key: 'protocolo', label: 'Protocolo' },
  { key: 'status', label: 'Status' },
] as const;

export function getOrdemServicoListColumns(): OrdemServicoListColumn[] {
  return [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '65px',
      render: (item) => <span>{item.id_local ?? item.id}</span>,
    },
    {
      key: 'protocolo',
      label: 'Protocolo',
      sortable: true,
      width: '120px',
      render: (item) => <span>{item.protocolo || '-'}</span>,
    },
    {
      key: 'id_assunto',
      label: 'Assunto',
      sortable: true,
      width: '130px',
      render: (item) => <span>{item.assunto_nome || '-'}</span>,
    },
    {
      key: 'cliente_nome',
      label: 'Cliente',
      sortable: true,
      width: '150px',
      render: (item) => <span>{item.cliente_nome || '-'}</span>,
    },
    {
      key: 'operador_nome',
      label: 'Operador',
      sortable: true,
      width: '130px',
      render: (item) => <span>{item.operador_nome || '-'}</span>,
    },
    {
      key: 'id_estrutura',
      label: 'Estrutura',
      sortable: true,
      width: '150px',
      render: (item) => <span>{item.estrutura_nome || item.id_estrutura || '-'}</span>,
    },
    {
      key: 'mensagem',
      label: 'Descrição',
      sortable: false,
      width: '200px',
      render: (item) => <span title={item.mensagem || ''}>{truncar(item.mensagem, 60)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '130px',
      badgeLabels: ORDEM_SERVICO_STATUS_BADGE_LABELS,
      render: (item) => renderStatusBadge(getOrdemServicoStatusBadgeConfig(item.status)),
    },
    {
      key: 'id_tecnico',
      label: 'Técnico',
      sortable: true,
      width: '140px',
      render: (item) => <span>{item.tecnico_nome || '-'}</span>,
    },
    {
      key: 'setor',
      label: 'Setor',
      sortable: true,
      width: '120px',
      render: (item) => <span>{item.setor_nome || '-'}</span>,
    },
    {
      key: 'prioridade',
      label: 'Prior.',
      sortable: true,
      width: '85px',
      badgeLabels: ORDEM_SERVICO_PRIORIDADE_BADGE_LABELS,
      render: (item) => renderStatusBadge(getOrdemServicoPrioridadeBadgeConfig(item.prioridade)),
    },
    {
      key: 'data_abertura',
      label: 'Abertura',
      sortable: true,
      width: '150px',
      render: (item) => <span>{formatIxcData(item.data_abertura)}</span>,
    },
    {
      key: 'data_agenda',
      label: 'Agenda',
      sortable: true,
      width: '150px',
      render: (item) => <span>{formatIxcData(item.data_agenda)}</span>,
    },
    {
      key: 'data_final',
      label: 'Final',
      sortable: true,
      width: '150px',
      render: (item) => <span>{formatIxcData(item.data_final)}</span>,
    },
    {
      key: 'data_fechamento',
      label: 'Fechamento',
      sortable: true,
      width: '150px',
      render: (item) => <span>{formatIxcData(item.data_fechamento)}</span>,
    },
  ];
}
