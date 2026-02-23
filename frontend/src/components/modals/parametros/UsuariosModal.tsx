import React, { useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { AxiosError } from 'axios';
import { useUsuarios, useDeleteUsuario } from '@/hooks/useUsuarios';
import { Usuario } from '@/types';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useTableFilters } from '@/hooks/useTableFilters';
import { formatDateTime } from '@/utils/formatters';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import UsuarioFormModal from './UsuarioFormModal';
import { useAuditoria } from '@/hooks/useAuditoria';
import ImprimirModal from '@/components/common/ImprimirModal';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import ConfirmModal from '@/components/modals/ConfirmModal';

interface UsuariosModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const UsuariosModal: React.FC<UsuariosModalProps> = ({
  show,
  onClose,
  skipWrapper = false
}) => {
  const { t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
  const [, setSelectedItems] = useState<Usuario[]>([]);
  
  const { success, error: _error } = useNotificationContext();
  const auditoria = useAuditoria();
  const { modalProps } = useConfirmModal();
  
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

  const handleSearch = useCallback((term: string, field?: string) => {
    // Usar setTimeout para evitar atualização durante render cycle
    setTimeout(() => {
      tableFilters.setSearch(term);
      if (field) setSearchField(field);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilters.setSearch]);

  const [searchField, setSearchField] = useState<string>('nome');
  
  const { data: usuariosData, isLoading, refetch } = useUsuarios({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
    searchField: searchField || undefined,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const usuarios = usuariosData?.data || [];
  const pagination = useMemo(() => {
    if (usuariosData?.pagination && typeof usuariosData.pagination === 'object') {
      const pag = usuariosData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? 15;
      const currentPage = pag.current_page ?? 1;
      
      // Calcular last_page se não estiver definido
      let lastPage = pag.last_page;
      if (!lastPage && total > 0) {
        lastPage = Math.max(1, Math.ceil(total / perPage));
      } else if (!lastPage) {
        lastPage = 1;
      }
      
      return {
        current_page: currentPage,
        last_page: lastPage,
        per_page: perPage,
        total: total,
        from: pag.from ?? ((currentPage - 1) * perPage) + 1,
        to: pag.to ?? Math.min(currentPage * perPage, total)
      };
    }
    return {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0,
      from: 0,
      to: 0
    };
  }, [usuariosData?.pagination]);

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
                            'Erro ao deletar usuário';
        _error(errorMessage);
      } else {
        _error('Erro ao deletar usuário');
      }
    }
  };

  const handleAudit = (usuario: Usuario) => {
    auditoria.handleAudit('Usuario', usuario.id);
  };

  // Dados já vêm ordenados do backend - não usar ordenação local
  const sortedData = usuarios;

  const columns: TableConfig<Usuario>['columns'] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      searchable: true,
      width: 42,
      resizable: true,
      render: (item: Usuario) => <span>{item.id}</span>
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      searchable: true,
      width: 180,
      resizable: true,
      render: (item: Usuario) => <div>{item.nome}</div>
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      searchable: true,
      width: 200,
      resizable: true,
      render: (item: Usuario) => item.email
    },
    {
      key: 'role',
      label: 'Perfil',
      sortable: true,
      searchable: true,
      badgeLabels: ['Administrador', 'Usuário'],
      resizable: true,
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
      badgeLabels: ['Ativo', 'Inativo'],
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
      label: 'Deletar',
      action: async (selectedItems: Usuario[]) => {
        if (selectedItems.length === 0) return;
        
        const confirmed = window.confirm(`Tem certeza que deseja deletar ${selectedItems.length} usuário(s)?`);
        if (confirmed) {
          for (const item of selectedItems) {
            await handleDelete(item.id);
          }
        }
      },
      disabled: (selectedItems: Usuario[]) => selectedItems.length === 0
    }
  ];

  const modalContent = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            title={t('params.users')}
            config={{
              columns,
              data: sortedData,
              loading: isLoading,
              searchable: true,
              searchPlaceholder: '',
              searchFields: [
                { key: 'id', label: 'ID' },
                { key: 'nome', label: 'Nome' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Perfil' },
                { key: 'ativo', label: 'Status' }
              ],
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
                disabled: action.disabled,
                variant: 'primary'
              })),
              emptyMessage: 'Nenhum usuário encontrado',
              pagination
            }}
            tableId="usuarios-modal"
            onSelectionChange={(items) => {
              setSelectedItems(items);
            }}
            onSort={tableFilters.setSort}
            onSearch={handleSearch}
            onSearchFieldChange={setSearchField}
            onPageChange={tableFilters.setPage}
            onPageSizeChange={tableFilters.setLimit}
            onRefresh={refetch}
            onAudit={handleAudit}
            auditEntity="Usuario"
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

      {/* Modal de Visualização de PDF de Auditoria */}
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title="Relatórios de logs"
        modalId="auditoria-usuario-modal"
      />

      {/* ConfirmModal */}
      {modalProps && <ConfirmModal {...modalProps} />}
    </>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('params.users')}
      size="lg"
      modalId="usuarios-modal"
      className="no-padding"
    >
      {modalContent}
    </DraggableModal>
  );
};

export default UsuariosModal;
