import React from 'react';
import { ContratoPlanoAdicional } from 'services/contratoPlanoAdicionalService';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { BulkAction } from '../types';
import { TableColumn } from 'components/tables/types';
import { useI18n } from 'contexts/I18nContext';

interface ServicosAdicionaisTabProps {
  isLoading: boolean;
  bulkActions: BulkAction[];
  limit: number;
  setLimit: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  sortedData: ContratoPlanoAdicional[];
  selectedItems: ContratoPlanoAdicional[];
  setSelectedItems: (items: ContratoPlanoAdicional[]) => void;
  columns: TableColumn<ContratoPlanoAdicional>[];
  onRefresh?: () => void;
  onAudit?: (item: ContratoPlanoAdicional) => void;
  auditEntity?: string;
}

const ServicosAdicionaisTab: React.FC<ServicosAdicionaisTabProps> = ({
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
}) => {
  const { t } = useI18n();

  return (
    <EmbeddedTablePanel
            key="servicos-adicionais-tab-table"
            config={{
            columns: columns,
            data: sortedData,
            loading: isLoading,
            selectable: true,
            multiSelect: true,
            searchable: true,
            searchPlaceholder: t('placeholder.searchServices'),
            searchFields: [
              { key: 'status', label: t('table.status') },
              { key: 'id', label: t('table.id') },
              { key: 'plano', label: t('table.plan') },
              { key: 'observacoes', label: t('table.observations') }
            ],
            emptyMessage: t('empty.noAdditionalServices'),
            className: 'no-padding',
            pagination: {
              current_page: page,
              per_page: limit,
              total: sortedData.length,
              last_page: Math.ceil(sortedData.length / limit)
            },
            bulkActions: bulkActions.map(action => {
              const disabledFn = action.disabled as ((selectedItems: ContratoPlanoAdicional[]) => boolean) | undefined;
              return {
                key: action.label,
                label: action.label,
                variant: action.variant || 'primary',
                onClick: action.action as ((selectedItems: ContratoPlanoAdicional[]) => void) | undefined,
                disabled: disabledFn ? disabledFn(selectedItems) : false
              };
            })
          }}
          onSelectionChange={setSelectedItems}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
          onRefresh={onRefresh}
          onAudit={onAudit}
          auditEntity={auditEntity}
    />
  );
};

export default ServicosAdicionaisTab;

