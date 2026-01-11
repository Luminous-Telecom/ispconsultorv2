import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Titulo } from '@/types/entities';
import Table from '@/components/tables/Table';
import { BulkAction } from '../types';
import { TableColumn } from '@/components/tables/types';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface FinanceiroAvulsoTabProps {
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
  onRefresh?: () => void;
  showCancelados: boolean;
  setShowCancelados: (show: boolean) => void;
  onAudit?: (item: Titulo) => void;
  auditEntity?: string;
}

const FinanceiroAvulsoTab: React.FC<FinanceiroAvulsoTabProps> = ({
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
  onRefresh,
  showCancelados,
  setShowCancelados,
  onAudit,
  auditEntity,
}) => {
  const isMobile = useIsMobile();
  
  // Resetar página quando o filtro mudar
  useEffect(() => {
    setPage(1);
  }, [showCancelados, setPage]);

  // Limpar seleção de itens cancelados quando o filtro de ocultar cancelados for desativado
  const prevShowCanceladosRef = useRef(showCancelados);
  useEffect(() => {
    if (prevShowCanceladosRef.current && !showCancelados && _selectedItems.length > 0) {
      const itensNaoCancelados = _selectedItems.filter(item => item.status?.toLowerCase() !== 'cancelado');
      if (itensNaoCancelados.length !== _selectedItems.length) {
        setSelectedItems(itensNaoCancelados);
      }
    }
    prevShowCanceladosRef.current = showCancelados;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelados]);

  // Limpar seleção quando os dados mudarem e houver itens inválidos
  useEffect(() => {
    if (!sortedData || _selectedItems.length === 0) return;
    
    const currentIds = new Set(sortedData.map((t: Titulo) => String(t.id)));
    const validItems = _selectedItems.filter((item: Titulo) => {
      if (currentIds.has(String(item.id))) return true;
      // Manter cancelados selecionados mesmo quando filtrados
      return item.status?.toLowerCase() === 'cancelado' && !showCancelados;
    });
    
    if (validItems.length !== _selectedItems.length) {
      setSelectedItems(validItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedData, showCancelados]);

  // Filtro customizado que inclui itens selecionados mesmo quando filtrados
  const customFilters = useCallback((data: Titulo[]) => {
    const selectedIds = new Set(_selectedItems.map(item => String(item.id)));
    const dataIds = new Set(data.map(item => String(item.id)));
    
    // Adicionar itens selecionados que não estão nos dados
    const selectedNotInData = _selectedItems.filter(item => !dataIds.has(String(item.id)));
    const dataWithSelected = [...data, ...selectedNotInData];
    
    // Filtrar cancelados, mas sempre incluir itens selecionados
    return dataWithSelected.filter((titulo) => {
      if (selectedIds.has(String(titulo.id))) return true;
      const isCancelado = titulo.status?.toLowerCase() === 'cancelado';
      return !(isCancelado && !showCancelados);
    });
  }, [showCancelados, _selectedItems]);

  // Dados filtrados para usar no resumo financeiro
  const filteredData = useMemo(() => {
    const selectedIds = new Set(_selectedItems.map(item => String(item.id)));
    return sortedData.filter((titulo) => {
      if (selectedIds.has(String(titulo.id))) return true;
      const isCancelado = titulo.status?.toLowerCase() === 'cancelado';
      return !(isCancelado && !showCancelados);
    });
  }, [sortedData, showCancelados, _selectedItems]);

  const memoizedBulkActions = useMemo(() => {
    return bulkActions.map(action => ({
      key: action.label,
      label: action.label,
      variant: action.variant || 'primary',
      onClick: action.action,
      disabled: typeof action.disabled === 'function' 
        ? action.disabled 
        : typeof action.disabled === 'boolean' 
          ? () => action.disabled as boolean 
          : undefined,
      dropdown: action.dropdown
    }));
  }, [bulkActions]);

  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0, paddingBottom: isMobile ? '0' : undefined }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            key={`financeiro-avulso-tab-table-${showCancelados}`}
            title="Financeiro Avulso"
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
              searchPlaceholder: '',
              sortable: true,
              striped: true,
              hover: true,
              responsive: true,
              emptyMessage: 'Este contrato ainda não possui títulos avulsos cadastrados.',
              className: 'no-padding',
              bulkActions: memoizedBulkActions,
              customControls: (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showCanceladosContratoAvulso"
                    checked={showCancelados}
                    onChange={(e) => {
                      setShowCancelados(e.target.checked);
                    }}
                  />
                  <label className="form-check-label" htmlFor="showCanceladosContratoAvulso">
                    Mostrar cancelados
                  </label>
                </div>
              )
            }}
            onSelectionChange={setSelectedItems}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onRefresh={onRefresh}
            onSort={() => {}}
            onAudit={onAudit}
            auditEntity={auditEntity}
          />
        </div>

        {/* Resumo Financeiro */}
        {filteredData.length > 0 && (
          <div className="d-flex justify-content-end align-items-center p-3 bg-light rounded financeiro-resumo" style={{ flexShrink: 0, marginBottom: isMobile ? '3rem' : '1rem', marginTop: isMobile ? '0.25rem' : '1rem', marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
            <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
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

export default FinanceiroAvulsoTab;

