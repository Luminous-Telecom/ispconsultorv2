import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModalSelect } from 'hooks/useModalSelect';
import { useTableFilters } from 'hooks/useTableFilters';
import DraggableModal from 'components/common/DraggableModal';
import SearchBar from 'components/ui/SearchBar';
import Table from 'components/tables/Table';
import { TableConfig } from 'components/tables/types';
import { auditoriaService, AuditoriaLog, AuditoriaFilters } from 'services/auditoriaService';
import { useAuditoriaDetalheEs } from 'hooks/useAuditoriaDetalheEs';
import AuditoriaDetalhesModal from 'components/modals/auditoria/AuditoriaDetalhesModal';
import { formatAuditoriaListId, formatDateTime } from 'utils/formatters';
import { useI18n } from 'contexts/I18nContext';

interface AuditoriaModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  variant?: 'erp' | 'saas';
}

const AuditoriaModal: React.FC<AuditoriaModalProps> = ({ show, onClose, skipWrapper = false, variant = 'erp' }) => {
  const { t } = useI18n();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);

  // Hook unificado para filtros, busca e paginação
  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true,
  });

  const handleSearchChange = useCallback((value: string) => {
    setTimeout(() => {
      tableFilters.setSearch(value);
      tableFilters.setPage(1);
    }, 0);
  }, [tableFilters]);

  const handleClearFilters = useCallback(() => {
    setTimeout(() => {
      tableFilters.setSearch('');
      setSearchField('usuario_email');
      setAcaoFilter('');
      setEntidadeFilter('');
      tableFilters.setPage(1);
    }, 0);
  }, [tableFilters]);

  const [acaoFilter, setAcaoFilter] = useState<string>('');
  const [entidadeFilter, setEntidadeFilter] = useState<string>('');
  const [searchField, setSearchField] = useState<string>('usuario_email');

  const filters: AuditoriaFilters = useMemo(() => ({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.search || undefined,
    searchField: searchField || undefined,
    acao: acaoFilter || undefined,
    entidade: entidadeFilter || undefined,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  }), [tableFilters.page, tableFilters.limit, tableFilters.search, searchField, acaoFilter, entidadeFilter, tableFilters.sortColumn, tableFilters.sortDirection]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditoria-operacional', variant, filters],
    queryFn: async () => {
      const response = variant === 'saas'
        ? await auditoriaService.listOperacionalSaas(filters)
        : await auditoriaService.listOperacional(filters);
      if (!response.success) {
        throw new Error(response.message || 'Erro ao carregar logs de auditoria');
      }
      return response.data;
    },
    retry: 1
  });

  const {
    exibirDetalhe: auditoriaExibirDetalhe,
    showEsLoading: auditoriaDetalheEsLoading,
    esIndisponivel: auditoriaEsIndisponivel,
    temVinculoEs: auditoriaTemVinculoEs,
  } = useAuditoriaDetalheEs({
    selected: selectedLog,
    showDetails: showDetailsModal,
    saas: variant === 'saas',
    queryKeyPrefix: 'auditoria-detalhe-es-modal',
  });

  // Usar hook customizado para gerenciar seleção
  const {
    selectedItem,
    handleSelectionChange,
    clearSelection
  } = useModalSelect<AuditoriaLog>();

  const formatAcao = useCallback((acao: string) => {
    const acoes: Record<string, string> = {
      create: t('audit.actions.create'),
      update: t('audit.actions.update'),
      delete: t('audit.actions.delete'),
      login: t('audit.actions.login'),
      logout: t('audit.actions.logout'),
      export: t('audit.actions.export'),
      import: t('audit.actions.import'),
      executar: t('audit.actions.executar'),
    };
    return acoes[acao] || acao;
  }, [t]);

  const getAcaoBadgeClass = useCallback((acao: string) => {
    const classes: Record<string, string> = {
      create: 'success',
      update: 'primary',
      delete: 'danger',
      login: 'info',
      logout: 'secondary',
      export: 'warning',
      import: 'warning',
      executar: 'info',
    };
    return classes[acao] || 'secondary';
  }, []);

  const formatTimestamp = useCallback((timestamp: string) => {
    try {
      return formatDateTime(new Date(timestamp));
    } catch {
      return timestamp;
    }
  }, []);

  const tableColumns: TableConfig<AuditoriaLog>['columns'] = useMemo(() => [
      {
        key: 'id',
        label: t('table.id'),
        sortable: true,
        width: '56px',
        sortValue: (log: AuditoriaLog) => log.operacional_id ?? String(log.id),
        render: (log: AuditoriaLog) => {
          const { display, title } = formatAuditoriaListId(log);
          return (
            <span className="small text-muted" title={title}>
              {display}
            </span>
          );
        },
      },
      {
        key: 'timestamp',
        label: t('audit.timestamp'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => (
          <span className="small">{formatTimestamp(log.timestamp)}</span>
        )
      },
      {
        key: 'usuario_nome',
        label: t('table.name'),
        sortable: true,
        width: '150px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.usuario_nome || '-'}</span>
        )
      },
      {
        key: 'ip_address',
        label: t('audit.ip'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => (
          <span className="small text-muted">{log.ip_address || '-'}</span>
        )
      },
      {
        key: 'empresa_nome',
        label: t('audit.tenants'),
        sortable: true,
        width: '140px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.empresa_nome || '-'}</span>
        )
      },
      {
        key: 'acao',
        label: t('table.action'),
        sortable: true,
        badgeLabels: [t('audit.actions.create'), t('audit.actions.update'), t('audit.actions.delete'), t('audit.actions.login'), t('audit.actions.logout'), t('audit.actions.export'), t('audit.actions.import'), t('audit.actions.executar')],
        render: (log: AuditoriaLog) => (
          <span className={`badge bg-${getAcaoBadgeClass(log.acao)}`}>
            {formatAcao(log.acao)}
          </span>
        )
      },
      {
        key: 'entidade',
        label: t('audit.entity'),
        sortable: true,
        width: '120px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.entidade}</span>
        )
      },
      {
        key: 'usuario_email',
        label: t('audit.user'),
        sortable: true,
        width: '180px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.usuario_email || 'N/A'}</span>
        )
      },
      {
        key: 'metodo_http',
        label: t('audit.method'),
        sortable: true,
        width: '80px',
        render: (log: AuditoriaLog) => (
          <code className="text-primary small">{log.metodo_http || '-'}</code>
        )
      },
      {
        key: 'rota',
        label: t('audit.route'),
        sortable: true,
        width: '200px',
        render: (log: AuditoriaLog) => (
          <span className="small">{log.rota || '-'}</span>
        )
      }
    ], [t, formatAcao, getAcaoBadgeClass, formatTimestamp]);

  const handleViewDetails = useCallback((log: AuditoriaLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  }, []);

  const pagination = useMemo(() => {
    if (data?.pagination && typeof data.pagination === 'object') {
      const pag = data.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
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
      per_page: tableFilters.limit,
      total: 0,
      from: 0,
      to: 0
    };
  }, [data?.pagination, tableFilters.limit]);

  // Bulk actions
  const bulkActions = useMemo(() => [
    {
      label: t('audit.viewDetails'),
      variant: 'primary' as const,
      disabled: (selectedItems: AuditoriaLog[]) => selectedItems.length === 0 && !selectedItem,
      action: (selectedItems: AuditoriaLog[]) => {
        const item = selectedItems.length > 0 ? selectedItems[0] : selectedItem;
        if (item) {
          handleViewDetails(item);
        }
      }
    }
  ], [t, selectedItem, handleViewDetails]);

  // Filtros customizados
  const customFilters = (
    <div className="row mb-1">
      <div className="col-md-4">
        <SearchBar
          id="auditoria-search"
          variant="table"
          value={tableFilters.search}
          onChange={(v) => handleSearchChange(v)}
          onSearch={(v) => handleSearchChange(v)}
          placeholder={t('buttons.search')}
          searchField={searchField || 'usuario_email'}
          searchFields={[
            { key: 'id', label: t('table.id') },
            { key: 'usuario_email', label: t('emailServer.userEmail') },
            { key: 'usuario_nome', label: t('audit.user') },
            { key: 'acao', label: t('table.action') },
            { key: 'entidade', label: t('audit.entity') },
            { key: 'ip_address', label: t('audit.ip') },
            { key: 'rota', label: t('audit.route') },
            { key: 'timestamp', label: t('audit.timestamp') }
          ]}
          onSearchFieldChange={(f) => { setSearchField(f); tableFilters.setPage(1); }}
          className="flex-grow-1"
        />
      </div>
      <div className="col-md-3">
        <label className="form-label small">{t('table.action')}</label>
        <select
          className="form-select form-select-sm"
          value={acaoFilter}
          onChange={(e) => {
            setAcaoFilter(e.target.value);
            tableFilters.setPage(1);
          }}
        >
          <option value="">{t('audit.actions.all')}</option>
          <option value="create">{t('audit.actions.create')}</option>
          <option value="update">{t('audit.actions.update')}</option>
          <option value="delete">{t('audit.actions.delete')}</option>
          <option value="login">{t('audit.actions.login')}</option>
          <option value="logout">{t('audit.actions.logout')}</option>
          <option value="executar">{t('audit.actions.executar')}</option>
        </select>
      </div>
      <div className="col-md-3">
        <label className="form-label small">{t('audit.entity')}</label>
        <select
          className="form-select form-select-sm"
          value={entidadeFilter}
          onChange={(e) => {
            setEntidadeFilter(e.target.value);
            tableFilters.setPage(1);
          }}
        >
          <option value="">{t('audit.entities.all')}</option>
          <option value="Cliente">{t('table.client')}</option>
          <option value="Plano">{t('table.plan')}</option>
          <option value="Contrato">{t('table.contract')}</option>
          <option value="Usuario">{t('audit.user')}</option>
          <option value="Titulo">{t('form.title')}</option>
          <option value="Banco">{t('table.bank')}</option>
          <option value="ScheduledRoutine">{t('modal.scheduledRoutine')}</option>
          <option value="Agent">{t('modal.agents')}</option>
          <option value="SshDevice">{t('modal.sshDevices')}</option>
          <option value="SshDeviceBackup">{t('sshDevice.manualBackup')}</option>
        </select>
      </div>
      <div className="col-md-2 d-flex align-items-end">
        <button
          className="btn btn-sm btn-outline-primary w-100"
          onClick={handleClearFilters}
        >
          {t('buttons.clear')}
        </button>
      </div>
    </div>
  );

  const modalData = useMemo(() => data?.data || [], [data?.data]);

  const modalContent = (
    <>
        <div style={{ padding: '16px', paddingBottom: '8px', flexShrink: 0 }}>
          {customFilters}
        </div>
        <Table
            syncWithHeader={false}
            title={t('audit.title')}
            config={{
              columns: tableColumns,
              data: modalData,
              loading: isLoading,
              searchable: false,
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
              emptyMessage: 'Nenhum log encontrado',
              pagination: pagination
            }}
            tableId="auditoria-modal-table"
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
          />
    </>
  );

  const auditoriaDetalhesModal = (
    <AuditoriaDetalhesModal
      show={showDetailsModal}
      onClose={() => {
        setShowDetailsModal(false);
        setSelectedLog(null);
      }}
      detalhe={auditoriaExibirDetalhe}
      modalId={variant === 'saas' ? 'saas-auditoria-detalhes' : 'auditoria-detalhes'}
      showEmpresaColumn={variant === 'saas'}
      showClienteColumn={variant === 'saas'}
      esLoading={auditoriaDetalheEsLoading}
      esIndisponivel={auditoriaEsIndisponivel}
      temVinculoEs={auditoriaTemVinculoEs}
    />
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {auditoriaDetalhesModal}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={() => {
          clearSelection();
          onClose();
        }}
        title={t('audit.title')}
        size="xl"
      >
        {modalContent}
      </DraggableModal>

      {auditoriaDetalhesModal}
    </>
  );
};

export default AuditoriaModal;
