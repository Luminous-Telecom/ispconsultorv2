import React from 'react';
import Table from '../../../../tables/Table';
import { BulkAction } from '../types';
import { ContratoPlanoAdicional } from '../../../../../services/contratoPlanoAdicionalService';
import { TableColumn } from '../../../../tables/types';

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
}) => {
  return (
    <div className="row" style={{ margin: 0, padding: 0 }}>
      <div className="col-12" style={{ padding: 0 }}>
        <Table
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
        />
      </div>
    </div>
  );
};

export default ServicosAdicionaisTab;

