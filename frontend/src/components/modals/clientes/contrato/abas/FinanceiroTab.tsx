import React, { useCallback, useMemo, useEffect } from 'react';
import Table from '../../../../tables/Table';
import { BulkAction } from '../types';
import { Titulo } from '../../../../../types/entities';
import { TableColumn } from '../../../../tables/types';
import { SortDirection } from '../../../../tables/types';

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


  // Memoizar o filtro de cancelados para garantir que o Table detecte mudanças
  const customFilters = useCallback((data: Titulo[]) => {
    // Filtrar cancelados se necessário
    return data.filter((titulo) => {
      // Verificar se o status é 'cancelado' (case-insensitive para garantir)
      const isCancelado = titulo.status?.toLowerCase() === 'cancelado';
      
      if (isCancelado && !showCancelados) {
        return false;
      }
      return true;
    });
  }, [showCancelados]);

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
    <div className="row" style={{ margin: 0, padding: 0 }}>
      <div className="col-12" style={{ padding: 0 }}>
        <Table
            config={{
              columns: columns,
              data: sortedData,
              customFilters: customFilters,
              pagination: {
                current_page: page,
                per_page: limit,
                total: sortedData.length,
                last_page: Math.ceil(sortedData.length / limit)
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
                <strong>R$ {sortedData.reduce((sum: number, item: Titulo) => {
                  return sum + Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0);
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor baixado:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: Titulo) => {
                  if (item.pago && item.status === 'pago') {
                    return sum + Number(item.valor_pago || 0);
                  }
                  return sum;
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor aberto:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: Titulo) => {
                  return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0));
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor cancelado:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: Titulo) => {
                  return sum + (item.status === 'cancelado' ? Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0) : 0);
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
