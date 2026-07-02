import React from 'react';
import type { SaasServidorEmail, SaasServidorWhatsapp } from 'services/saas/saasConfigService';
import type { ListModalColumn } from 'types/modal';

const STATUS_COLOR: Record<string, string> = {
  ativo: 'success',
  inativo: 'secondary',
  erro: 'danger',
};

export function getSaasServidorEmailColumns(): ListModalColumn<SaasServidorEmail>[] {
  return [
    { key: 'id', label: 'ID', sortable: true, width: '50px', render: (i) => <span>{i.id}</span> },
    { key: 'nome', label: 'Nome', sortable: true, render: (i) => <span>{i.nome}</span> },
    {
      key: 'host_smtp',
      label: 'Host SMTP',
      sortable: true,
      render: (i) => (
        <span>
          {i.host_smtp}:{i.porta}
        </span>
      ),
    },
    { key: 'usuario', label: 'Usuário', sortable: true, render: (i) => <span>{i.usuario}</span> },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '90px',
      render: (i) => (
        <span className={`badge bg-${STATUS_COLOR[i.status] || 'secondary'}`}>{i.status}</span>
      ),
    },
  ];
}

export function getSaasServidorWhatsappColumns(): ListModalColumn<SaasServidorWhatsapp>[] {
  return [
    { key: 'id', label: 'ID', sortable: true, width: '50px', render: (i) => <span>{i.id}</span> },
    { key: 'nome', label: 'Nome', sortable: true, render: (i) => <span>{i.nome}</span> },
    {
      key: 'url_api',
      label: 'URL API',
      sortable: true,
      render: (i) => (
        <span className="text-truncate truncate-max-200-block" >
          {i.url_api}
        </span>
      ),
    },
    {
      key: 'numero',
      label: 'Número',
      sortable: true,
      width: '130px',
      render: (i) => <span>{i.numero || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '90px',
      render: (i) => (
        <span className={`badge bg-${STATUS_COLOR[i.status] || 'secondary'}`}>{i.status}</span>
      ),
    },
  ];
}
