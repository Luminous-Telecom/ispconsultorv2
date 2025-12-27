import React from 'react';
import { ContratoPlanoAdicional } from '@/services/contratoPlanoAdicionalService';
import Table from '@/components/tables/Table';
import { BulkAction } from '../types';
import { TableColumn } from '@/components/tables/types';

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
  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            key="servicos-adicionais-tab-table"
            config={{
            columns: columns,
            data: sortedData,
            loading: isLoading,
            selectable: true,
            multiSelect: false,
            emptyMessage: 'Este contrato ainda não possui serviços adicionais cadastrados.',
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
        </div>
      </div>
    </div>
  );
};

export default ServicosAdicionaisTab;

