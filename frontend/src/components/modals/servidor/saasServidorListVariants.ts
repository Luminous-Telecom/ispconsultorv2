import type React from 'react';
import {
  saasServidorEmailService,
  saasServidorWhatsappService,
  type SaasServidorEmail,
  type SaasServidorWhatsapp,
  type SaasConfigListResponse,
} from 'services/saas/saasConfigService';
import type { ApiResponse } from 'types';
import type { ListModalColumn } from 'types/modal';
import SaasServidorEmailFormModal from 'components/modals/saas/SaasServidorEmailFormModal';
import SaasServidorWhatsappFormModal from 'components/modals/saas/SaasServidorWhatsappFormModal';
import { getSaasServidorEmailColumns, getSaasServidorWhatsappColumns } from './saasServidorListColumns';

export type SaasServidorChannel = 'email' | 'whatsapp';

type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
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
  list: (params: ListParams) => Promise<ApiResponse<SaasConfigListResponse<T>>>;
  delete: (id: number) => Promise<unknown>;
  FormModal: React.ComponentType<{
    show: boolean;
    onClose: () => void;
    onSuccess: () => void;
    itemId?: number | null;
  }>;
}

export const SAAS_SERVIDOR_LIST_BY_CHANNEL: {
  email: SaasServidorListVariantConfig<SaasServidorEmail>;
  whatsapp: SaasServidorListVariantConfig<SaasServidorWhatsapp>;
} = {
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
    getColumns: getSaasServidorEmailColumns,
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
    getColumns: getSaasServidorWhatsappColumns,
    list: saasServidorWhatsappService.list,
    delete: saasServidorWhatsappService.delete,
    FormModal: SaasServidorWhatsappFormModal,
  },
};
