import React from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { BulkAction } from '../types';
import { TableColumn } from 'components/tables/types';
import { SortDirection } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';
import type { IntegracaoIxcProvedorRow } from '../useContratoIxcBulkActions';

interface IxcProvedorIntegracaoTabProps {
  isLoading: boolean;
  bulkActions: BulkAction[];
  limit: number;
  setLimit: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  sortedData: IntegracaoIxcProvedorRow[];
  selectedItems: IntegracaoIxcProvedorRow[];
  setSelectedItems: (items: IntegracaoIxcProvedorRow[]) => void;
  columns: TableColumn<IntegracaoIxcProvedorRow>[];
  onRefresh?: () => void;
  onAudit?: (item: IntegracaoIxcProvedorRow) => void;
  auditEntity?: string;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  totalItems: number;
}

const IxcProvedorIntegracaoTab: React.FC<IxcProvedorIntegracaoTabProps> = ({
  isLoading,
  bulkActions,
  limit,
  setLimit,
  page,
  setPage,
  sortedData,
  selectedItems,
  setSelectedItems,
  columns,
  onRefresh,
  onAudit,
  auditEntity,
  sortColumn,
  sortDirection,
  onSort,
  totalItems,
}) => {
  const { t } = useI18n();

  return (
    <EmbeddedTablePanel
      key="ixc-provedor-tab-table"
      config={{
        columns,
        data: sortedData,
        loading: isLoading,
        selectable: true,
        multiSelect: true,
        searchable: true,
        searchPlaceholder: t('layout.searchPlaceholder'),
        searchFields: [
          { key: 'id', label: t('table.id') },
          { key: 'nome', label: t('form.name') },
          { key: 'api_url', label: 'URL da API' },
        ],
        sortable: true,
        sortColumn,
        sortDirection,
        emptyMessage: 'Nenhuma integração IXC Provedor encontrada',
        className: 'no-padding',
        pagination: {
          current_page: page,
          per_page: limit,
          total: totalItems,
          last_page: Math.max(1, Math.ceil(totalItems / limit)),
        },
        bulkActions: bulkActions.map((action) => {
          const disabledFn = action.disabled as ((items: IntegracaoIxcProvedorRow[]) => boolean) | undefined;
          return {
            key: action.label,
            label: action.label,
            variant: action.variant || 'primary',
            onClick: action.action as ((items: IntegracaoIxcProvedorRow[]) => void) | undefined,
            disabled: disabledFn ? disabledFn(selectedItems) : false,
          };
        }),
      }}
      onSelectionChange={setSelectedItems}
      onPageChange={setPage}
      onPageSizeChange={setLimit}
      onRefresh={onRefresh}
      onSort={onSort}
      onAudit={onAudit}
      auditEntity={auditEntity}
    />
  );
};

export default IxcProvedorIntegracaoTab;
