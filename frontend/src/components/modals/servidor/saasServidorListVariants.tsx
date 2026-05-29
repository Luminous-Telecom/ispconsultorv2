import React from 'react';
import {
  saasServidorEmailService,
  saasServidorWhatsappService,
  type SaasServidorEmail,
  type SaasServidorWhatsapp,
} from 'services/saas/saasConfigService';
import type { ListModalColumn } from 'types/modal';
import SaasServidorEmailFormModal from 'components/modals/saas/SaasServidorEmailFormModal';
import SaasServidorWhatsappFormModal from 'components/modals/saas/SaasServidorWhatsappFormModal';

export type SaasServidorChannel = 'email' | 'whatsapp';

const STATUS_COLOR: Record<string, string> = {
  ativo: 'success',
  inativo: 'secondary',
  erro: 'danger',
};

export interface SaasServidorListVariantConfig<T extends { id: number; nome: string; status: string }> {
  queryKey: string;
  tableId: string;
  modalId: string;
  wrapperTitle: string;
  listTitle: string;
  auditEntity: string;
  auditModalId: string;
  emptyMessage: string;
  searchFields: Array<{ key: string; label: string }>;
  getColumns: () => ListModalColumn<T>[];
  list: (params: Record<string, unknown>) => ReturnType<typeof saasServidorEmailService.list>;
  delete: (id: number) => Promise<unknown>;
  FormModal: React.ComponentType<{
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemId?: number | null;
  }>;
}

export const SAAS_SERVIDOR_LIST_BY_CHANNEL = {
  email: {
    queryKey: 'saas-servidores-email',
    tableId: 'saas-servidores-email-list',
    modalId: 'saas-servidores-email-modal',
    wrapperTitle: 'Servidores de Email (SaaS)',
    listTitle: 'Servidores de Email',
    auditEntity: 'SaasServidorEmail',
    auditModalId: 'audit-saas-email',
    emptyMessage: 'Nenhum servidor cadastrado',
    searchFields: [
      { key: 'id', label: 'ID' },
      { key: 'nome', label: 'Nome' },
      { key: 'host_smtp', label: 'Host SMTP' },
      { key: 'status', label: 'Status' },
    ],
    getColumns: (): ListModalColumn<SaasServidorEmail>[] => [
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
    ],
    list: saasServidorEmailService.list,
    delete: saasServidorEmailService.delete,
    FormModal: SaasServidorEmailFormModal,
  },
  whatsapp: {
    queryKey: 'saas-servidores-whatsapp',
    tableId: 'saas-servidores-whatsapp-list',
    modalId: 'saas-servidores-whatsapp-modal',
    wrapperTitle: 'Servidores WhatsApp (SaaS)',
    listTitle: 'Servidores WhatsApp',
    auditEntity: 'SaasServidorWhatsapp',
    auditModalId: 'audit-saas-whatsapp',
    emptyMessage: 'Nenhum servidor cadastrado',
    searchFields: [
      { key: 'id', label: 'ID' },
      { key: 'nome', label: 'Nome' },
      { key: 'numero', label: 'Número' },
      { key: 'status', label: 'Status' },
    ],
    getColumns: (): ListModalColumn<SaasServidorWhatsapp>[] => [
      { key: 'id', label: 'ID', sortable: true, width: '50px', render: (i) => <span>{i.id}</span> },
      { key: 'nome', label: 'Nome', sortable: true, render: (i) => <span>{i.nome}</span> },
      {
        key: 'url_api',
        label: 'URL API',
        sortable: true,
        render: (i) => (
          <span className="text-truncate" style={{ maxWidth: 200, display: 'block' }}>
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
    ],
    list: saasServidorWhatsappService.list,
    delete: saasServidorWhatsappService.delete,
    FormModal: SaasServidorWhatsappFormModal,
  },
} as const;
