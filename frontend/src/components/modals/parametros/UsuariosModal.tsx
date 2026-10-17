import React, { useCallback, useMemo, useState } from 'react';
import { useUsuarios, useDeleteUsuario } from 'hooks/useUsuarios';
import { useEntityListModal } from 'hooks/useEntityListModal';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { formatDateTime } from 'utils/formatters';
import { getAtivoBadgeConfig } from 'utils/tableStatusBadges';
import { renderStatusBadge } from 'components/ui/StatusBadge';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import { Usuario } from 'types';
import UsuarioFormModal from './UsuarioFormModal';
import ImprimirModal from 'components/common/ImprimirModal';

interface UsuariosModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const UsuariosModal: React.FC<UsuariosModalProps> = ({ show, onClose, skipWrapper = false }) => {
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);

  const list = useEntityListModal<Usuario>({ onClose });

  const { data: usuariosData, isLoading, refetch } = useUsuarios({
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    search: list.tableFilters.debouncedSearch || undefined,
    searchField: list.tableFilters.searchField || 'nome',
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const deleteUsuarioMutation = useDeleteUsuario();

  const handleDelete = useCallback(
    async (usuarioId: number) => {
      try {
        await deleteUsuarioMutation.mutateAsync(usuarioId);
        success('Usuário excluído com sucesso!');
        refetch();
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.USER_DELETE_ERROR);
      }
    },
    [deleteUsuarioMutation, refetch, showApiError, success]
  );

  const handleAudit = useCallback(
    (usuario: Usuario) => {
      list.auditoria.handleAudit('Usuario', usuario.id);
    },
    [list.auditoria]
  );

  const columns = useMemo(
    (): ListModalConfig<Usuario>['columns'] => [
      {
        key: 'ativo',
        label: list.t('table.status'),
        sortable: true,
        render: (item) => renderStatusBadge(getAtivoBadgeConfig(item.ativo, list.t)),
      },
      {
        key: 'id',
        label: list.t('table.id'),
        sortable: true,
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'nome',
        label: list.t('form.name'),
        sortable: true,
        render: (item) => item.nome,
      },
      {
        key: 'email',
        label: list.t('form.email'),
        sortable: true,
        render: (item) => <span className="text-nowrap">{item.email}</span>,
      },
      {
        key: 'role',
        label: 'Perfil',
        sortable: true,
        render: () => renderStatusBadge({ label: 'Administrador', className: 'bg-info' }),
      },
      {
        key: 'webhook_secret',
        label: 'Webhook Secret',
        sortable: true,
        render: (item) => (
          <span className="small text-muted">
            {item.webhook_secret ? 'Configurado' : 'Não configurado'}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: list.t('table.createdAt'),
        sortable: true,
        render: (item) => {
          const row = item as Usuario & { created_at_formatada?: string | null; created_at?: string };
          if (row.created_at_formatada) return row.created_at_formatada;
          return row.created_at ? formatDateTime(row.created_at) : '-';
        },
      },
    ],
    [list]
  );

  const searchFields = useMemo(
    () => [
      { key: 'ativo', label: list.t('table.status') },
      { key: 'id', label: list.t('table.id') },
      { key: 'nome', label: list.t('form.name') },
      { key: 'email', label: list.t('form.email') },
      { key: 'role', label: 'Perfil' },
    ],
    [list]
  );

  const bulkActions = useMemo(
    () =>
      list.buildCrudBulkActions({
        onNew: () => setShowCreateModal(true),
        onEdit: (item) => {
          setSelectedUsuarioId(item.id);
          setShowEditModal(true);
        },
        onDelete: handleDelete,
      }),
    [list, handleDelete]
  );

  const pagination = useMemo(
    () => list.buildPagination(usuariosData?.pagination),
    [list, usuariosData?.pagination]
  );

  const modalData = useMemo(() => usuariosData?.data ?? [], [usuariosData?.data]);

  return (
    <>
      <ListModal<Usuario>
        show={show}
        onClose={list.handleModalClose}
        skipWrapper={skipWrapper}
        config={{
          title: list.t('params.users'),
          columns,
          searchPlaceholder: list.t('layout.searchPlaceholder'),
          searchFields,
          emptyMessage: 'Nenhum usuário encontrado',
        }}
        data={modalData}
        loading={isLoading}
        search={list.tableFilters.search}
        onSearchChange={list.handleSearchChange}
        sortColumn={list.tableFilters.sortColumn}
        sortDirection={list.tableFilters.sortDirection}
        onSortChange={list.tableFilters.setSort}
        pagination={pagination}
        onPageChange={list.tableFilters.setPage}
        onLimitChange={list.tableFilters.setLimit}
        onRefresh={refetch}
        bulkActions={bulkActions}
        onSelectionChange={list.handleSelectionChange}
        onAudit={handleAudit}
        auditEntity="Usuario"
        tableId="usuarios-modal"
        modalId="usuarios-modal"
      />

      <UsuarioFormModal
        show={showCreateModal || showEditModal}
        usuarioId={showEditModal ? selectedUsuarioId : null}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedUsuarioId(null);
        }}
        onSuccess={() => {
          refetch();
        }}
      />

      <ImprimirModal
        show={list.auditoria.showPreview}
        onClose={list.auditoria.handleClosePreview}
        pdfUrl={list.auditoria.pdfUrl}
        isGenerating={list.auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-usuario-modal"
      />
    </>
  );
};

export default UsuariosModal;
