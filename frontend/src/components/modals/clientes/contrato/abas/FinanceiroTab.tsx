import React from 'react';
import Table from '../../../../tables/Table';
import { BulkAction } from '../types';

interface FinanceiroTabProps {
  titulosData: any[];
  isLoading: boolean;
  bulkActions: BulkAction[];
  search: string;
  setSearch: (value: string) => void;
  showCancelados: boolean;
  setShowCancelados: (value: boolean) => void;
  limit: number;
  setLimit: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  sortedData: any[];
  selectedItems: any[];
  setSelectedItems: (items: any[]) => void;
  onRefresh: () => void;
  columns: any[];
  openDropdown: number | null;
  setOpenDropdown: (value: number | null) => void;
  isGeneratingPdf: boolean;
}

const FinanceiroTab: React.FC<FinanceiroTabProps> = ({
  titulosData,
  isLoading,
  bulkActions,
  search,
  setSearch,
  showCancelados,
  setShowCancelados,
  limit,
  setLimit,
  page,
  setPage,
  sortedData,
  selectedItems,
  setSelectedItems,
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
              pagination: {
                current_page: page,
                per_page: limit,
                total: sortedData.length,
                last_page: Math.ceil(sortedData.length / limit)
              },
              loading: isLoading,
              selectable: true,
              multiSelect: true,
              emptyMessage: 'Este contrato ainda não possui títulos cadastrados.',
              className: 'no-padding',
              bulkActions: bulkActions.map(action => ({
                key: action.label,
                label: action.label === 'Imprimir' && isGeneratingPdf ? 'Gerando...' : action.label,
                variant: action.variant || 'primary',
                onClick: action.action,
                disabled: action.label === 'Imprimir' ? isGeneratingPdf : action.disabled,
                dropdown: action.dropdown
              }))
            }}
            onSelectionChange={setSelectedItems}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
          />

        {/* Resumo Financeiro */}
        {sortedData.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3 p-3 bg-light rounded">
            <div className="d-flex align-items-center">
              <i className="bi bi-info-circle text-muted me-2"></i>
              <span className="small text-muted">Legenda de cores</span>
            </div>
            <div className="d-flex gap-4">
              <div className="text-end">
                <div className="small text-muted">Valor:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                  return sum + Number(item.valor || item.valor_parcela || 0);
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor baixado:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                  if (item.pago && item.status === 'pago') {
                    return sum + Number(item.valor_pago || 0);
                  }
                  return sum;
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor aberto:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                  return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor || item.valor_parcela || 0));
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor cancelado:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: any) => {
                  return sum + (item.status === 'cancelado' ? Number(item.valor || item.valor_parcela || 0) : 0);
                }, 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceiroTab;
