import React, { useMemo, useState, useCallback } from 'react';
import { useMensagensEmail } from '../../../hooks/useMensagemHistorico';
import { MensagemHistoricoFilters } from '../../../services/mensagemHistoricoService';
import { formatDateTime } from '../../../utils/formatters';
import { Badge } from '../../ui';
import DraggableModal from '../../common/DraggableModal';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import { useTableFilters } from '../../../hooks/useTableFilters';
import { useModalSelect } from '../../../hooks/useModalSelect';
import { useI18n } from '../../../contexts/I18nContext';
import MensagemDetalhesModal from './MensagemDetalhesModal';

interface EmailHistoricoModalProps {
  show: boolean;
  onClose: () => void;
  variant?: 'erp' | 'saas';
}

interface MensagemItem {
  id: number;
  tipo: 'email' | 'whatsapp';
  titulo?: string;
  destinatario: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  usuario?: { id: number; nome: string; email: string };
  created_at: string;
}

const EmailHistoricoModal: React.FC<EmailHistoricoModalProps> = ({
  show,
  onClose,
  variant
}) => {
  const { t } = useI18n();
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [mensagemSelecionada, setMensagemSelecionada] = useState<MensagemItem | null>(null);

  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 20,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const filters: MensagemHistoricoFilters = useMemo(() => ({
    page: tableFilters.page,
    limit: tableFilters.limit,
    destinatario: tableFilters.debouncedSearch || undefined,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  }), [
    tableFilters.page,
    tableFilters.limit,
    tableFilters.debouncedSearch,
    tableFilters.sortColumn,
    tableFilters.sortDirection
  ]);

  const { data, isLoading, refetch } = useMensagensEmail(filters, variant);

  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<MensagemItem>();

  // Configurar colunas memoizadas
  const tableColumns: TableConfig<MensagemItem>['columns'] = useMemo(() => [
    {
      key: 'id',
      label: t('table.id'),
      sortable: true,
      width: '42px',
      render: (item: MensagemItem) => <span>{item.id}</span>
    },
    {
      key: 'tipo',
      label: t('history.type'),
      sortable: true,
      badgeLabels: [t('history.email')],
      render: (_item: MensagemItem) => (
        <Badge variant="primary">
          {t('history.email')}
        </Badge>
      )
    },
    {
      key: 'titulo',
      label: t('history.subject'),
      sortable: true,
      width: '200px',
      render: (item: MensagemItem) => (
        <div className="text-truncate" style={{ maxWidth: '250px' }} title={item.titulo}>
          {item.titulo || <span className="text-muted">-</span>}
        </div>
      )
    },
    {
      key: 'cliente_nome',
      label: t('history.client'),
      sortable: true,
      width: '150px',
      render: (item: MensagemItem) => (
        <span className="text-nowrap">{item.cliente_nome || '-'}</span>
      )
    },
    {
      key: 'destinatario',
      label: t('history.recipient'),
      sortable: true,
      width: '180px',
      render: (item: MensagemItem) => (
        <span className="text-nowrap">{item.destinatario}</span>
      )
    },
    {
      key: 'mensagem',
      label: t('history.message'),
      sortable: false,
      width: '200px',
      render: (item: MensagemItem) => (
        <div className="text-truncate" style={{ maxWidth: '300px' }} title={item.mensagem}>
          {item.mensagem.length > 50 ? `${item.mensagem.substring(0, 50)}...` : item.mensagem}
        </div>
      )
    },
    {
      key: 'status',
      label: t('history.status'),
      sortable: true,
      badgeLabels: [t('history.sent'), t('history.errorStatus')],
      render: (item: MensagemItem) => (
        <Badge
          variant={item.status === 'enviada' ? 'success' : 'danger'}
          className="text-capitalize"
        >
          {item.status === 'enviada' ? t('history.sent') : t('history.errorStatus')}
        </Badge>
      )
    },
    {
      key: 'erro_mensagem',
      label: t('history.error'),
      sortable: false,
      width: '150px',
      render: (item: MensagemItem) => (
        item.erro_mensagem ? (
          <div className="text-truncate" style={{ maxWidth: '200px' }} title={item.erro_mensagem}>
            <small className="text-danger">{item.erro_mensagem}</small>
          </div>
        ) : (
          <span className="text-muted">-</span>
        )
      )
    },
    {
      key: 'entidade_tipo',
      label: t('history.entity'),
      sortable: true,
      width: '100px',
      render: (item: MensagemItem) => {
        const strValue = item.entidade_tipo || '';
        const entidadeId = item.entidade_id;
        return strValue && entidadeId ? (
          <span className="text-capitalize">{`${strValue} #${entidadeId}`}</span>
        ) : (
          <span className="text-muted">-</span>
        );
      }
    },
    {
      key: 'usuario',
      label: t('history.user'),
      sortable: false,
      width: '120px',
      render: (item: MensagemItem) => {
        const userData = item.usuario;
        return userData ? (
          <span title={userData.email}>{userData.nome}</span>
        ) : (
          <span className="text-muted">{t('history.system')}</span>
        );
      }
    },
    {
      key: 'created_at',
      label: t('history.dateTime'),
      sortable: true,
      width: '145px',
      render: (item: MensagemItem) => formatDateTime(item.created_at)
    }
  ], [t]);

  const searchFields = [
    { key: 'id', label: t('table.id') },
    { key: 'tipo', label: t('history.type') },
    { key: 'cliente_nome', label: t('history.client') },
    { key: 'titulo', label: t('history.subject') },
    { key: 'destinatario', label: t('history.recipient') },
    { key: 'mensagem', label: t('history.message') },
    { key: 'status', label: t('history.status') }
  ];

  // Paginação do backend - usar valores do backend quando disponíveis
  const pagination = useMemo(() => {
    if (data?.pagination && typeof data.pagination === 'object') {
      const pag = data.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;

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
      current_page: tableFilters.page,
      last_page: 1,
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [data?.pagination, tableFilters.page, tableFilters.limit]);

  // Bulk actions memoizados
  const bulkActions = useMemo(() => [
    {
      label: t('history.view'),
      variant: 'primary' as const,
      disabled: (selectedItems: MensagemItem[]) => selectedItems.length === 0,
      action: (selectedItems: MensagemItem[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          setMensagemSelecionada(item);
          setShowDetalhesModal(true);
        }
      }
    }
  ], [selectedItem, t]);

  const modalData = useMemo(() => data?.data || [], [data?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={t('history.emailTitle')}
        size="lg"
        modalId="email-historico-modal"
        className="no-padding"
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            <Table
              title={t('history.emailTitle')}
              config={{
                columns: tableColumns,
                data: modalData,
                loading: isLoading,
                searchable: true,
                searchPlaceholder: t('history.searchEmail'),
                searchFields,
                sortable: true,
                sortColumn: tableFilters.sortColumn,
                sortDirection: tableFilters.sortDirection,
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
                  variant: action.variant
                })),
                emptyMessage: t('history.noMessages'),
                pagination: pagination
              }}
              tableId="email-historico-table"
              onSelectionChange={(items) => {
                handleSelectionChange(items);
              }}
              onRefresh={refetch}
              onPageChange={(page) => {
                setTimeout(() => {
                  tableFilters.setPage(page);
                }, 0);
              }}
              onPageSizeChange={(limit) => {
                setTimeout(() => {
                  tableFilters.setLimit(limit);
                }, 0);
              }}
              onSort={(column, direction) => {
                setTimeout(() => {
                  tableFilters.setSort(column, direction);
                }, 0);
              }}
              onSearch={(search, field) => handleSearchChange(search, field)}
              search={tableFilters.search}
            />
          </div>
        </div>
      </DraggableModal>

      <MensagemDetalhesModal
        show={showDetalhesModal}
        onClose={() => setShowDetalhesModal(false)}
        mensagem={mensagemSelecionada}
      />
    </>
  );
};

export default EmailHistoricoModal;