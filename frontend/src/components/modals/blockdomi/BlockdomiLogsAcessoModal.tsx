import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { useBlockdomiLogs } from '@/hooks/useBlockdomiLogs';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import Table from '@/components/tables/Table';
import { TableConfig } from '@/components/tables/types';
import { Button } from '@/components/ui';
import BlockdomiLogsRealModal from './BlockdomiLogsRealModal';
import type { BlockdomiLogAcessoItem } from '@/services/blockdomiLogAcessoService';

interface BlockdomiLogsAcessoModalProps {
  show: boolean;
  onClose: () => void;
  title?: string;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const BlockdomiLogsAcessoModal: React.FC<BlockdomiLogsAcessoModalProps> = ({
  show,
  onClose,
  title,
  skipWrapper = false,
  onHeaderActionsReady
}) => {
  const { t } = useI18n();
  const [showLogsRealModal, setShowLogsRealModal] = useState(false);

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    searchDebounceMs: 300,
    resetPageOnFilterChange: true
  });

  const { data: logsData, isLoading, refetch } = useBlockdomiLogs({
    search: tableFilters.debouncedSearch || undefined,
    page: tableFilters.page,
    limit: tableFilters.limit,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection
  });

  const defaultTitle = title || t('blockdomi.logsAcesso');

  const searchFields = [
    { key: 'ip', label: t('blockdomi.logsIp') },
    { key: 'rota', label: t('blockdomi.logsRota') },
    { key: 'mensagem_erro', label: t('blockdomi.logsMensagemErro') }
  ];

  const tableColumns: TableConfig<BlockdomiLogAcessoItem>['columns'] = useMemo(() => [
    { key: 'id', label: t('table.id'), sortable: true, width: '60px', render: (item) => item.id },
    {
      key: 'ip',
      label: t('blockdomi.logsIp'),
      sortable: true,
      width: '140px',
      render: (item) => item.ip ?? '-'
    },
    {
      key: 'rota',
      label: t('blockdomi.logsRota'),
      sortable: true,
      width: '120px',
      render: (item) => item.rota
    },
    {
      key: 'metodo',
      label: t('blockdomi.logsMetodo'),
      sortable: true,
      width: '70px',
      render: (item) => item.metodo
    },
    {
      key: 'status_http',
      label: t('blockdomi.logsStatus'),
      sortable: true,
      width: '80px',
      render: (item) => item.status_http ?? '-'
    },
    {
      key: 'sucesso',
      label: t('blockdomi.logsSucesso'),
      sortable: true,
      badgeLabels: [t('blockdomi.logsSucessoOk'), t('blockdomi.logsSucessoErro')],
      render: (item) => (
        <span className={`badge bg-${item.sucesso ? 'success' : 'danger'}`}>
          {item.sucesso ? t('blockdomi.logsSucessoOk') : t('blockdomi.logsSucessoErro')}
        </span>
      )
    },
    {
      key: 'mensagem_erro',
      label: t('blockdomi.logsMensagemErro'),
      sortable: false,
      width: '200px',
      render: (item) => (
        <span className="text-break text-muted small">
          {item.mensagem_erro ?? '-'}
        </span>
      )
    },
    {
      key: 'created_at',
      label: t('table.createdAt'),
      sortable: true,
      width: '150px',
      render: (item) => (item.created_at_formatada ?? item.created_at ?? '-')
    }
  ], [t]);

  const pagination = useMemo(() => {
    if (logsData?.pagination && typeof logsData.pagination === 'object') {
      const pag = logsData.pagination;
      const total = pag.total ?? 0;
      const perPage = pag.per_page ?? tableFilters.limit;
      const currentPage = pag.current_page ?? tableFilters.page;
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
        total,
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
  }, [logsData?.pagination, tableFilters.page, tableFilters.limit]);

  const modalData = useMemo(() => logsData?.data ?? [], [logsData?.data]);

  const handleSearchChange = useCallback((search: string, field?: string) => {
    setTimeout(() => {
      tableFilters.setSearch(search);
      if (field) tableFilters.setSearchField(field);
    }, 0);
  }, [tableFilters]);

  const modalContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="d-flex justify-content-end mb-2 px-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowLogsRealModal(true)}
        >
          {t('blockdomi.logsReal')}
        </Button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table<BlockdomiLogAcessoItem>
          syncWithHeader={false}
          title={defaultTitle}
          config={{
            columns: tableColumns,
            data: modalData,
            loading: isLoading,
            searchable: true,
            searchPlaceholder: t('blockdomi.logsSearchPlaceholder'),
            searchFields,
            sortable: true,
            sortColumn: tableFilters.sortColumn,
            sortDirection: tableFilters.sortDirection,
            striped: true,
            hover: true,
            responsive: true,
            emptyMessage: t('blockdomi.logsEmpty'),
            pagination
          }}
          tableId="blockdomi-logs-acesso"
          onRefresh={refetch}
          onPageChange={(page) => {
            setTimeout(() => tableFilters.setPage(page), 0);
          }}
          onPageSizeChange={(limit) => {
            setTimeout(() => tableFilters.setLimit(limit), 0);
          }}
          onSort={(column, direction) => {
            setTimeout(() => tableFilters.setSort(column, direction), 0);
          }}
          onSearch={(search, field) => handleSearchChange(search, field)}
          search={tableFilters.search}
        />
      </div>
    </div>
  );

  useEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(null);
    }
  }, [skipWrapper, onHeaderActionsReady]);

  const logsRealModal = (
    <BlockdomiLogsRealModal
      show={showLogsRealModal}
      onClose={() => setShowLogsRealModal(false)}
    />
  );

  if (skipWrapper) {
    return (
      <>
        {modalContent}
        {logsRealModal}
      </>
    );
  }

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={defaultTitle}
        size="xl"
        modalId="blockdomi-logs-acesso-modal"
        className="no-padding"
      >
        {modalContent}
      </DraggableModal>
      {logsRealModal}
    </>
  );
};

export default BlockdomiLogsAcessoModal;
