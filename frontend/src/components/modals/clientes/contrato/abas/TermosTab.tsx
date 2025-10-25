import React, { useState } from 'react';
import Table from '../../../../tables/Table';
import { TermoContrato } from '../../../../../services/TermoContratoService';
import { BulkAction } from '../types';

interface TermosTabProps {
  termosData: any[];
  isLoading: boolean;
  bulkActions: BulkAction[];
  searchTermos: string;
  setSearchTermos: (value: string) => void;
  showInativos: boolean;
  setShowInativos: (value: boolean) => void;
  limit: number;
  setLimit: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  sortedData: any[];
  selectedTermosItems: any[];
  setSelectedTermosItems: (items: any[]) => void;
  onRefresh: () => void;
  columns: any[];
  openDropdown: number | null;
  setOpenDropdown: (value: number | null) => void;
  isGeneratingPdf: boolean;
}

const TermosTab: React.FC<TermosTabProps> = ({
  termosData,
  isLoading,
  bulkActions,
  searchTermos,
  setSearchTermos,
  showInativos,
  setShowInativos,
  limit,
  setLimit,
  page,
  setPage,
  sortedData,
  selectedTermosItems,
  setSelectedTermosItems,
  onRefresh,
  columns,
  openDropdown,
  setOpenDropdown,
  isGeneratingPdf
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
          />
      </div>
    </div>
  );
};

export default TermosTab;
