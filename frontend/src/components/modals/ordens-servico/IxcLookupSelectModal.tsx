import React, { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEntityListModal } from 'hooks/useEntityListModal';
import ListModal from 'components/common/ListModal';
import { ListModalConfig } from 'types/modal';
import type { PaginatedResponse } from 'types';
import type { LookupItem, LookupFilters } from 'services/ixcLookupService';

interface IxcLookupSelectModalProps {
  show: boolean;
  onClose: () => void;
  onSelect: (item: LookupItem) => void;
  title: string;
  nomeLabel: string;
  clienteId?: number;
  useData: (filters: LookupFilters) => UseQueryResult<PaginatedResponse<LookupItem>>;
}

const IxcLookupSelectModal: React.FC<IxcLookupSelectModalProps> = ({
  show,
  onClose,
  onSelect,
  title,
  nomeLabel,
  clienteId,
  useData,
}) => {
  const list = useEntityListModal<LookupItem>({ onClose, onSelect });

  const { data, isLoading, refetch } = useData({
    cliente_id: clienteId || undefined,
    enabled: show,
    search: list.tableFilters.debouncedSearch || undefined,
    page: list.tableFilters.page,
    limit: list.tableFilters.limit,
    sortColumn: list.tableFilters.sortColumn,
    sortDirection: list.tableFilters.sortDirection,
  });

  const columns = useMemo(
    (): ListModalConfig<LookupItem>['columns'] => [
      {
        key: 'id',
        label: 'ID',
        sortable: true,
        width: '90px',
        render: (item) => <span>{item.id}</span>,
      },
      {
        key: 'nome',
        label: nomeLabel,
        sortable: true,
        render: (item) => <span>{item.nome || '-'}</span>,
      },
    ],
    [nomeLabel]
  );

  const searchFields = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'nome', label: nomeLabel },
    ],
    [nomeLabel]
  );

  const bulkActions = useMemo(() => list.buildSelectBulkActions(), [list]);

  const pagination = useMemo(
    () => list.buildPagination(data?.pagination),
    [list, data?.pagination]
  );

  const modalData = useMemo(() => data?.data || [], [data?.data]);

  const tableId = `ixc-lookup-${title.toLowerCase().replace(/\s+/g, '-')}`;

  const handleRowSelect = (item: LookupItem) => {
    onSelect(item);
    onClose();
  };

  return (
    <ListModal<LookupItem>
      show={show}
      onClose={list.handleModalClose}
      config={{
        title,
        columns,
        searchPlaceholder: 'Buscar...',
        searchFields,
        emptyMessage: clienteId
          ? 'Nenhum registro encontrado'
          : 'Selecione um cliente antes de buscar no IXC',
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
      onRowClick={handleRowSelect}
      onRowDoubleClick={handleRowSelect}
      tableId={tableId}
      modalId={tableId}
    />
  );
};

export default IxcLookupSelectModal;
