import React, { useCallback, useMemo, useEffect } from 'react';
import { Titulo } from '@/types/entities';
import Table from '@/components/tables/Table';
import { BulkAction } from '../types';
import { TableColumn } from '@/components/tables/types';
import { SortDirection } from '@/components/tables/types';

interface FinanceiroTabProps {
  isLoading: boolean;
  bulkActions: BulkAction<Titulo>[];
  limit: number;
  setLimit: (value: number) => void;
  page: number;
  setPage: (value: number) => void;
  sortedData: Titulo[];
  selectedItems: Titulo[];
  setSelectedItems: (items: Titulo[]) => void;
  columns: TableColumn<Titulo>[]; 
  isGeneratingPdf: boolean;
  onRefresh?: () => void;
  showCancelados: boolean;
  setShowCancelados: (show: boolean) => void;
}

const FinanceiroTab: React.FC<FinanceiroTabProps> = ({
  isLoading,
  bulkActions,
  limit,
  setLimit,
  page,
  setPage,
  sortedData,
  selectedItems: _selectedItems,
  setSelectedItems,
  columns,
  isGeneratingPdf,
  onRefresh,
  showCancelados,
  setShowCancelados,
}) => {
  // Resetar página quando o filtro mudar
  useEffect(() => {
    setPage(1);
  }, [showCancelados, setPage]);

  // Callback para ordenação (o Table gerencia internamente)
  const handleSort = useCallback((_column: string, _direction: SortDirection) => {
    // Esta função será chamada pelo Table quando o usuário clicar em uma coluna
    // Não precisamos fazer nada aqui, o Table gerencia internamente
  }, []);


  // Função para filtrar cancelados
  const filterCancelados = useCallback((data: Titulo[]) => {
    return data.filter((titulo) => {
      const isCancelado = titulo.status?.toLowerCase() === 'cancelado';
      if (isCancelado && !showCancelados) {
        return false;
      }
      return true;
    });
  }, [showCancelados]);

  // Memoizar o filtro de cancelados para garantir que o Table detecte mudanças
  const customFilters = useCallback((data: Titulo[]) => {
    return filterCancelados(data);
  }, [filterCancelados]);

  // Dados filtrados para usar no resumo financeiro
  const filteredData = useMemo(() => {
    return filterCancelados(sortedData);
  }, [sortedData, filterCancelados]);

  // Memoizar bulkActions para evitar recriação desnecessária
  const memoizedBulkActions = useMemo(() => {
    return bulkActions.map(action => {
      let disabledFunc: ((selectedItems: Titulo[]) => boolean) | undefined;
      if (typeof action.disabled === 'function') {
        disabledFunc = action.disabled;
      } else if (typeof action.disabled === 'boolean') {
        const disabledValue = action.disabled;
        disabledFunc = () => disabledValue;
      }
      
      return {
        key: action.label,
        label: action.label === 'Imprimir' && isGeneratingPdf ? 'Gerando...' : action.label,
        variant: action.variant || 'primary',
        onClick: action.action,
        disabled: disabledFunc,
        dropdown: action.dropdown
      };
    });
  }, [bulkActions, isGeneratingPdf]);

  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            config={{
              columns: columns,
              data: sortedData,
              customFilters: customFilters,
              pagination: {
                current_page: page,
                per_page: limit,
                total: filteredData.length,
                last_page: Math.ceil(filteredData.length / limit)
              },
              loading: isLoading,
              selectable: true,
              multiSelect: true,
              searchable: true,
              searchPlaceholder: 'Buscar por ID, valor, vencimento...',
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              emptyMessage: 'Este contrato ainda não possui títulos cadastrados.',
              className: 'no-padding',
              bulkActions: memoizedBulkActions,
              customControls: (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showCanceladosContrato"
                    checked={showCancelados}
                    onChange={(e) => {
                      setShowCancelados(e.target.checked);
                    }}
                  />
                  <label className="form-check-label" htmlFor="showCanceladosContrato">
                    Mostrar cancelados
                  </label>
                </div>
              )
            }}
            onSelectionChange={setSelectedItems}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onRefresh={onRefresh}
            onSort={handleSort}
          />
        </div>

        {/* Resumo Financeiro */}
        {filteredData.length > 0 && (
          <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded" style={{ flexShrink: 0 }}>
            <div className="d-flex align-items-center">
              <i className="bi bi-info-circle text-muted me-2"></i>
              <span className="small text-muted">Legenda de cores</span>
            </div>
            <div className="d-flex gap-4">
              <div className="text-end">
                <div className="small text-muted">Valor:</div>
                <strong>R$ {filteredData.reduce((sum: number, item: Titulo) => {
                  return sum + Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0);
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor baixado:</div>
                <strong>R$ {filteredData.reduce((sum: number, item: Titulo) => {
                  // Considerar apenas valor_pago se existir e for maior que 0
                  const valorPago = Number(item.valor_pago || 0);
                  if (valorPago > 0) {
                    return sum + valorPago;
                  }
                  return sum;
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor aberto:</div>
                <strong>R$ {filteredData.reduce((sum: number, item: Titulo) => {
                  return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0));
                }, 0).toFixed(2)}</strong>
              </div>
              {showCancelados && (
                <div className="text-end">
                  <div className="small text-muted">Valor cancelado:</div>
                  <strong>R$ {filteredData.reduce((sum: number, item: Titulo) => {
                    return sum + (item.status === 'cancelado' ? Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0) : 0);
                  }, 0).toFixed(2)}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceiroTab;
