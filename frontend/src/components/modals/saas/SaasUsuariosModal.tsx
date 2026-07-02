import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { formatDateTime } from 'utils/formatters';
import { useBulkBtn } from 'components/ui';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import ImprimirModal from 'components/common/ImprimirModal';
import {
  formatSaasUsuarioNivel,
  getSaasUsuarioNivelBadgeColor,
} from 'constants/saasUsuarioAccess';
import { saasUsuariosService, type SaasUsuarioSuper, type SaasUsuarioListResponse } from 'services/saas/saasUsuariosService';
import SaasUsuarioFormModal from './SaasUsuarioFormModal';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const SaasUsuariosModal: React.FC<Props> = ({ show, onClose, skipWrapper = false }) => {
  const queryClient = useQueryClient();
  const { showApiError } = useApiError();
  const bulkBtn = useBulkBtn();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);

  const list = useEntityListModal<SaasUsuarioSuper>({ onClose });

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      'saas-usuarios',
      list.tableFilters.page,
      list.tableFilters.limit,
      list.tableFilters.debouncedSearch,
      list.tableFilters.sortColumn,
      list.tableFilters.sortDirection,
    ],
    queryFn: () =>
      saasUsuariosService.list({
        page: list.tableFilters.page,
        limit: list.tableFilters.limit,
        search: list.tableFilters.debouncedSearch || undefined,
        sortColumn: list.tableFilters.sortColumn,
        sortDirection: list.tableFilters.sortDirection,
      }),
    enabled: show,
    staleTime: 0,
  });

  const listData = data?.data as SaasUsuarioListResponse | undefined;
  const usuarios: SaasUsuarioSuper[] = listData?.data || [];

  const handleAudit = useCallback(
    (usuario: SaasUsuarioSuper) => {
      list.auditoria.handleAudit('SaasUsuarioSuper', usuario.id);
    },
    [list.auditoria]
  );

  const handleDelete = useCallback(
    async (selectedItems?: SaasUsuarioSuper[]) => {
      const item = list.resolveItem(selectedItems);
      if (!item) return;
      if (
        !window.confirm(
          `Remover o usuário "${item.nome}"? Esta ação não pode ser desfeita.`
        )
      ) {
        return;
      }
      try {
        await saasUsuariosService.delete(item.id);
        queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
        refetch();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.SAAS_USUARIO_DELETE_ERROR);
      }
    },
    [list, queryClient, refetch, showApiError]
  );

  const columns = useMemo(
    (): ListModalConfig<SaasUsuarioSuper>['columns'] => [
      { key: 'id', label: 'ID', sortable: true, width: '50px', render: (item) => <span>{item.id}</span> },
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        render: (item) => item.nome,
      },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        render: (item) => <span className="text-nowrap">{item.email}</span>,
      },
      {
        key: 'nivel_acesso',
        label: 'Nível',
        sortable: true,
        width: '90px',
        render: (item) => (
          <span className={`badge bg-${getSaasUsuarioNivelBadgeColor(item.nivel_acesso)}`}>
            {formatSaasUsuarioNivel(item.nivel_acesso)}
          </span>
        ),
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        width: '80px',
        render: (item) => (
          <span className={`badge bg-${item.ativo ? 'success' : 'secondary'}`}>
            {item.ativo ? 'Ativo' : 'Inativo'}
          </span>
        ),
      },
      {
        key: 'ultimo_login',
        label: 'Último Login',
        sortable: true,
        width: '150px',
        render: (item) =>
          item.ultimo_login ? formatDateTime(item.ultimo_login) : <span className="text-muted">—</span>,
      },
    ],
    []
  );

  const bulkActions = useMemo(
    () => [
      {
        label: bulkBtn.novo.label,
        variant: bulkBtn.novo.variant,
        action: () => setShowCreateModal(true),
      },
      {
        label: bulkBtn.editar.label,
        variant: bulkBtn.editar.variant,
        disabled: (items: SaasUsuarioSuper[]) => list.isNothingSelected(items),
        action: (items: SaasUsuarioSuper[]) => {
          const item = list.resolveItem(items);
          if (item) {
            setSelectedUsuarioId(item.id);
            setShowEditModal(true);
          }
        },
      },
      {
        label: bulkBtn.deletar.label,
        variant: bulkBtn.deletar.variant,
        disabled: (items: SaasUsuarioSuper[]) => list.isNothingSelected(items),
        action: handleDelete,
      },
    ],
    [bulkBtn, list, handleDelete]
  );

  const listModal = (
    <ListModal<SaasUsuarioSuper>
      show={show}
      onClose={list.handleModalClose}
      skipWrapper={skipWrapper}
      modalSize="xl"
      config={{
        title: 'Usuários SaaS',
        columns,
        searchPlaceholder: 'Buscar por nome ou email...',
        searchFields: [
          { key: 'nome', label: 'Nome' },
          { key: 'email', label: 'Email' },
        ],
        emptyMessage: 'Nenhum usuário cadastrado',
      }}
      data={usuarios}
      loading={isLoading}
      search={list.tableFilters.search}
      onSearchChange={list.handleSearchChange}
      sortColumn={list.tableFilters.sortColumn}
      sortDirection={list.tableFilters.sortDirection}
      onSortChange={list.tableFilters.setSort}
      pagination={list.buildPagination(listData?.pagination)}
      onPageChange={list.tableFilters.setPage}
      onLimitChange={list.tableFilters.setLimit}
      onRefresh={refetch}
      bulkActions={bulkActions}
      onSelectionChange={list.handleSelectionChange}
      onRowDoubleClick={(item) => {
        setSelectedUsuarioId(item.id);
        setShowEditModal(true);
      }}
      onAudit={handleAudit}
      auditEntity="SaasUsuarioSuper"
      tableId="saas-usuarios-list"
      modalId="saas-usuarios-list-modal"
    />
  );

  const auxiliaryModals = (
    <>
      <SaasUsuarioFormModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
          refetch();
        }}
      />
      <SaasUsuarioFormModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUsuarioId(null);
        }}
        usuarioId={showEditModal ? selectedUsuarioId : null}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
          refetch();
        }}
      />
      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title="Auditoria — Usuário SaaS"
        modalId="auditoria-saas-usuario-modal"
      />
    </>
  );

  return (
    <>
      {listModal}
      {auxiliaryModals}
    </>
  );
};

export default SaasUsuariosModal;
