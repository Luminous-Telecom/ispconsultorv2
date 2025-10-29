import React, { useState } from 'react';
import Table from '../../../../tables/Table';
import { BulkAction } from '../types';

interface TermosTabProps {
  isLoading: boolean;
  bulkActions: BulkAction[];
  limit: number;
  setLimit: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  sortedData: any[];
  selectedTermosItems: any[];
  setSelectedTermosItems: (items: any[]) => void;
  columns: any[];
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
    <div className="row" style={{ margin: 0, padding: 0 }}>
      <div className="col-12" style={{ padding: 0 }}>
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
              bulkActions: bulkActions.map(action => ({
                key: action.label,
                label: action.label === 'Imprimir' && isGeneratingPdf ? 'Gerando...' : action.label,
                variant: action.variant || 'primary',
                onClick: action.action,
                disabled: action.label === 'Imprimir' ? (isGeneratingPdf || (action.disabled ? action.disabled(selectedTermosItems) : false)) : action.disabled
              }))
            }}
            onSelectionChange={setSelectedTermosItems}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onRefresh={onRefresh}
          />
      </div>
    </div>
  );
};

export default TermosTab;
