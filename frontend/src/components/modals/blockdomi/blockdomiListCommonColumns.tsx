import React from 'react';
import { formatDateTime, formatDate } from 'utils/formatters';
import type { ListModalColumn } from 'types/modal';
import type { BlockdomiOficioListRow, BlockdomiTranslateFn } from './blockdomiListTypes';

/** Hora já formatada no servidor. O fallback só existe se a API não mandou esse texto. */
export function textoHoraBlockdomi(formatada?: string | null, bruta?: string | null): string {
  if (formatada) return formatada;
  return bruta ? formatDateTime(bruta) : '-';
}

export function getBlockdomiAtivoColumn<T extends BlockdomiOficioListRow>(
  t: BlockdomiTranslateFn
): ListModalColumn<T> {
  return {
    key: 'ativo',
    label: t('table.status'),
    sortable: true,
    badgeLabels: [t('status.active'), t('status.inactive')],
    render: (item) => (
      <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
        {item.ativo ? t('status.active') : t('status.inactive')}
      </span>
    ),
  };
}

export function getBlockdomiIdColumn<T extends BlockdomiOficioListRow>(
  t: BlockdomiTranslateFn
): ListModalColumn<T> {
  return {
    key: 'id',
    label: t('table.id'),
    sortable: true,
    render: (item) => <span>{item.id}</span>,
  };
}

export function getBlockdomiCommonColumns<T extends BlockdomiOficioListRow>(
  t: BlockdomiTranslateFn
): ListModalColumn<T>[] {
  return [
    {
      key: 'versao',
      label: t('blockdomi.versao'),
      sortable: true,
      width: '100px',
      render: (item) => item.versao || '-',
    },
    {
      key: 'numero_sei_anatel',
      label: t('blockdomi.numeroSeiAnatel'),
      sortable: true,
      width: '110px',
      render: (item) => item.numero_sei_anatel?.trim() || '-',
    },
    {
      key: 'nome_oficio',
      label: t('blockdomi.nomeOficio'),
      sortable: true,
      width: '220px',
      render: (item) => item.nome_oficio || '-',
    },
    {
      key: 'data_inicio_bloqueio',
      label: t('blockdomi.dataInicioBloqueio'),
      sortable: true,
      width: '130px',
      render: (item) => formatDate(item.data_inicio_bloqueio),
    },
    {
      key: 'data_fim_bloqueio',
      label: t('blockdomi.dataFimBloqueio'),
      sortable: true,
      width: '130px',
      render: (item) => formatDate(item.data_fim_bloqueio),
    },
    {
      key: 'oficio_anatel',
      label: t('blockdomi.oficioAnatel'),
      sortable: true,
      width: '100px',
      sortValue: (item) => (item.link_oficio_anatel?.trim() ? 1 : 0),
      render: (item) => (item.link_oficio_anatel?.trim() ? t('ui.yes') : t('ui.no')),
    },
    {
      key: 'oficio_justica',
      label: t('blockdomi.oficioJustica'),
      sortable: true,
      width: '100px',
      sortValue: (item) => (item.link_oficio_justica?.trim() ? 1 : 0),
      render: (item) => (item.link_oficio_justica?.trim() ? t('ui.yes') : t('ui.no')),
    },
    {
      key: 'planilha_dominios',
      label: t('blockdomi.planilhaDominios'),
      sortable: true,
      width: '100px',
      sortValue: (item) => (item.link_planilha_dominios?.trim() ? 1 : 0),
      render: (item) => (item.link_planilha_dominios?.trim() ? t('ui.yes') : t('ui.no')),
    },
    {
      key: 'descricao',
      label: t('form.description'),
      sortable: true,
      width: '250px',
      render: (item) => item.descricao || '-',
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '130px',
      render: (item) => textoHoraBlockdomi(item.created_at_formatada, item.created_at),
    },
    {
      key: 'updated_at',
      label: t('table.updatedAt'),
      sortable: true,
      width: '130px',
      render: (item) => textoHoraBlockdomi(item.updated_at_formatada, item.updated_at),
    },
  ];
}
