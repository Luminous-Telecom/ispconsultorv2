import type React from 'react';
import type { TranslationKeys } from 'contexts/I18nContext';
import { IPv4Service } from 'services/ipv4Service';
import { IPv6Service } from 'services/ipv6Service';
import { IPv4, IPv4Filters, PaginatedResponse } from 'types';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import IPv4Modal from './ipv4/IPv4Modal';
import IPv6Modal from './ipv6/IPv6Modal';
import { getBlockdomiIpColumns } from './blockdomiIpListColumns';
import type { ListModalColumn } from 'types/modal';

export type BlockdomiTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;

export type BlockdomiIpVersion = 4 | 6;
export type BlockdomiIpRow = IPv4;

type ListFilters = IPv4Filters;

export interface BlockdomiIpFormModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
}

const IPv4FormModal: React.FC<BlockdomiIpFormModalProps> = ({ itemId, ...props }) => (
  <IPv4Modal {...props} ipv4Id={itemId ?? null} />
);

const IPv6FormModal: React.FC<BlockdomiIpFormModalProps> = ({ itemId, ...props }) => (
  <IPv6Modal {...props} ipv6Id={itemId ?? null} />
);

export interface BlockdomiIpListVariantConfig {
  version: BlockdomiIpVersion;
  queryKey: string;
  entityLabel: string;
  emptyMessage: string;
  selectTitleKey: keyof TranslationKeys;
  defaultTitle: string;
  tableId: string;
  modalId: string;
  auditModalId: string;
  auditEntity: string;
  deleteErrorKey: string;
  list: (filters: ListFilters) => Promise<PaginatedResponse<BlockdomiIpRow>>;
  bulkDelete: (ids: number[]) => Promise<{ deleted: number; versao: string }>;
  getColumns: (t: BlockdomiTranslateFn) => ListModalColumn<BlockdomiIpRow>[];
  getSearchFields: (t: BlockdomiTranslateFn) => Array<{ key: string; label: string }>;
  FormModal: React.ComponentType<BlockdomiIpFormModalProps>;
}

export const BLOCKDOMI_IP_LIST_BY_VERSION: Record<
  BlockdomiIpVersion,
  BlockdomiIpListVariantConfig
> = {
  4: {
    version: 4,
    queryKey: 'ipv4',
    entityLabel: 'IPv4',
    emptyMessage: 'Nenhum IPv4 encontrado',
    selectTitleKey: 'blockdomi.selectIPv4',
    defaultTitle: 'IPv4',
    tableId: 'ipv4-list-modal',
    modalId: 'ipv4-list-modal',
    auditModalId: 'auditoria-ipv4-modal',
    auditEntity: 'IPv4',
    deleteErrorKey: CONTEXT_ERROR_MESSAGES.BLOCKDOMI_IPV4_DELETE_ERROR,
    list: (filters) => IPv4Service.list(filters),
    bulkDelete: (ids) => IPv4Service.bulkDelete(ids),
    getColumns: (t) =>
      getBlockdomiIpColumns({ ipColumnLabel: 'IPv4', ipColumnWidth: '150px', t }),
    getSearchFields: (t) => [
      { key: 'id', label: t('table.id') },
      { key: 'ip', label: 'IPv4' },
      { key: 'descricao', label: t('form.description') },
      { key: 'nome_oficio', label: t('blockdomi.nomeOficio') },
      { key: 'numero_sei_anatel', label: t('blockdomi.numeroSeiAnatel') },
    ],
    FormModal: IPv4FormModal,
  },
  6: {
    version: 6,
    queryKey: 'ipv6',
    entityLabel: 'IPv6',
    emptyMessage: 'Nenhum IPv6 encontrado',
    selectTitleKey: 'blockdomi.selectIPv6',
    defaultTitle: 'IPv6',
    tableId: 'ipv6-list-modal',
    modalId: 'ipv6-list-modal',
    auditModalId: 'auditoria-ipv6-modal',
    auditEntity: 'IPv6',
    deleteErrorKey: CONTEXT_ERROR_MESSAGES.BLOCKDOMI_IPV6_DELETE_ERROR,
    list: (filters) => IPv6Service.list(filters) as Promise<PaginatedResponse<BlockdomiIpRow>>,
    bulkDelete: (ids) => IPv6Service.bulkDelete(ids),
    getColumns: (t) =>
      getBlockdomiIpColumns({ ipColumnLabel: 'IPv6', ipColumnWidth: '200px', t }),
    getSearchFields: (t) => [
      { key: 'id', label: t('table.id') },
      { key: 'ip', label: 'IPv6' },
      { key: 'descricao', label: t('form.description') },
      { key: 'nome_oficio', label: t('blockdomi.nomeOficio') },
      { key: 'numero_sei_anatel', label: t('blockdomi.numeroSeiAnatel') },
    ],
    FormModal: IPv6FormModal,
  },
};
