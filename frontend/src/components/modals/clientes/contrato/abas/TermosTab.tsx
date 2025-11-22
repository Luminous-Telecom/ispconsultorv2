import React from 'react';
import Table from '../../../../tables/Table';
import { BulkAction } from '../types';
import { TermoContrato } from '../../../../../services/termoContratoService';
import { TableColumn } from '../../../../tables/types';

interface TermosTabProps {
  isLoading: boolean;
  bulkActions: BulkAction[];
  limit: number;
  setLimit: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  sortedData: TermoContrato[];
  selectedTermosItems: TermoContrato[];
  setSelectedTermosItems: (items: TermoContrato[]) => void;
  columns: TableColumn<TermoContrato>[];
  isGeneratingPdf: boolean;
  onRefresh?: () => void;
}

const TermosTab: React.FC<TermosTabProps> = ({
  isLoading,
  bulkActions,
  limit,
  setLimit,
  page,
  setPage,
  sortedData,
  selectedTermosItems,
  setSelectedTermosItems,
  columns,
  isGeneratingPdf,
  onRefresh,
}) => {
  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            config={{
              columns: columns,
              data: sortedData,
              loading: isLoading,
              selectable: true,
              multiSelect: false,
              emptyMessage: 'Este contrato ainda não possui termos cadastrados.',
              className: 'no-padding',
              pagination: {
                current_page: page,
                per_page: limit,
                total: sortedData.length,
                last_page: Math.ceil(sortedData.length / limit)
              },
              bulkActions: bulkActions.map(action => {
                const disabledFn = action.disabled as ((selectedItems: TermoContrato[]) => boolean) | undefined;
                return {
                  key: action.label,
                  label: action.label === 'Imprimir' && isGeneratingPdf ? 'Gerando...' : action.label,
                  variant: action.variant || 'primary',
                  onClick: action.action as ((selectedItems: TermoContrato[]) => void) | undefined,
                  disabled: action.label === 'Imprimir' 
                    ? (isGeneratingPdf || (disabledFn ? disabledFn(selectedTermosItems) : false))
                    : (disabledFn ? disabledFn(selectedTermosItems) : false)
                };
              })
            }}
            onSelectionChange={setSelectedTermosItems}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
};

export default TermosTab;
