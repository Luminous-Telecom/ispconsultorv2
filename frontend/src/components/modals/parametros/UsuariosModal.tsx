import React, { useState } from 'react';
import { AxiosError } from 'axios';
import { useUsuarios, useDeleteUsuario } from '@/hooks/useUsuarios';
import { Usuario } from '@/types';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useSorting } from '@/hooks/useSorting';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDateTime } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import UsuarioFormModal from './UsuarioFormModal';

interface UsuariosModalProps {
  show: boolean;
  onClose: () => void;
}

const UsuariosModal: React.FC<UsuariosModalProps> = ({
  show,
  onClose
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
  const [, setSelectedItems] = useState<Usuario[]>([]);
  
  const { success, error } = useNotificationContext();
  
  // Hook unificado para filtros, busca, ordenação e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });
  
  const { data: usuariosData, isLoading, refetch } = useUsuarios({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined
  });

  const usuarios = usuariosData?.data || [];
  const pagination = usuariosData?.pagination ? {
    current_page: usuariosData.pagination.current_page,
    last_page: usuariosData.pagination.last_page,
    per_page: usuariosData.pagination.per_page,
    total: usuariosData.pagination.total,
    from: usuariosData.pagination.from,
    to: usuariosData.pagination.to
  } : undefined;

  const deleteUsuarioMutation = useDeleteUsuario();

  const handleDelete = async (id: number) => {
    try {
      await deleteUsuarioMutation.mutateAsync(id);
      success('Usuário excluído com sucesso!');
      refetch();
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const axiosError = err as AxiosError<{ message?: string; error?: string }>;
        const errorMessage = axiosError.response?.data?.message || 
                            axiosError.response?.data?.error ||
                            'Erro ao excluir usuário';
        error(errorMessage);
      } else {
        error('Erro ao excluir usuário');
      }
    }
  };

  const sortedData = useSorting(usuarios as unknown as Record<string, unknown>[], tableFilters.sortColumn, tableFilters.sortDirection) as unknown as Usuario[];

  const columns: TableConfig<Usuario>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      render: (item: Usuario) => <span>{item.id}</span>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      searchable: true,
      render: (item: Usuario) => <div className="fw-bold">{item.nome}</div>
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      searchable: true,
      render: (item: Usuario) => item.email
    },
    {
      key: 'role',
      label: 'Perfil',
      sortable: true,
      searchable: true,
      render: (item: Usuario) => {
        const roleLabels: Record<string, string> = {
          'admin': 'Administrador',
          'user': 'Usuário'
        };
        return (
          <span className="badge bg-info">
            {roleLabels[item.role] || item.role}
          </span>
        );
      }
    },
    {
      key: 'ativo',
      label: 'Status',
      sortable: true,
      searchable: false,
      render: (item: Usuario) => (
        <span className={`badge ${item.ativo ? 'bg-success' : 'bg-secondary'}`}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      key: 'webhook_secret',
      label: 'Webhook Secret',
      sortable: false,
      searchable: false,
      render: (item: Usuario) => (
        <span className="small text-muted">
          {item.webhook_secret ? 'Configurado' : 'Não configurado'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      searchable: false,
      render: (item: Usuario & { created_at?: string; created_at_formatada?: string | null }) => {
        // Usar created_at_formatada se disponível (vem do backend já formatada)
        if (item.created_at_formatada) {
          return item.created_at_formatada;
        }
        // Fallback para formatDateTime se não tiver formato do backend
        return item.created_at ? formatDateTime(item.created_at) : '-';
      }
    }
  ];

  const bulkActions = [
    {
      label: 'Novo',
      action: () => setShowCreateModal(true)
    },
    {
      label: 'Editar',
      action: (selectedItems: Usuario[]) => {
        if (selectedItems.length > 0) {
          setSelectedUsuarioId(selectedItems[0].id);
          setShowEditModal(true);
        }
      },
      disabled: (selectedItems: Usuario[]) => selectedItems.length === 0
    },
    {
      label: 'Excluir',
      action: (selectedItems: Usuario[]) => {
        if (selectedItems.length > 0 && 
            window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} usuário(s)?`)) {
          selectedItems.forEach(item => handleDelete(item.id));
        }
      },
      disabled: (selectedItems: Usuario[]) => selectedItems.length === 0
    }
  ];

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Usuários"
      size="lg"
      modalId="usuarios-modal"
      className="no-padding"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            config={{
              columns,
              data: sortedData,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: 'Buscar por nome ou email...',
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              selectable: true,
              multiSelect: false,
              bulkActions: bulkActions.map(action => ({
                key: action.label.toLowerCase().replace(/\s+/g, '-'),
                label: action.label,
                onClick: action.action,
                disabled: action.disabled
              })),
              emptyMessage: 'Nenhum usuário encontrado',
              pagination
            }}
            tableId="usuarios-modal"
            onSelectionChange={(items) => {
              setSelectedItems(items);
            }}
            onSort={tableFilters.setSort}
            onSearch={tableFilters.setSearch}
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onRefresh={refetch}
          />
        </div>
      </div>

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
    </DraggableModal>
  );
};

export default UsuariosModal;

