import React, { useCallback, useMemo, useEffect } from 'react';
import { Titulo } from 'types/entities';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { BulkAction } from '../types';
import { TableColumn } from 'components/tables/types';
import { SortDirection } from 'components/tables/types';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import { formatCurrency } from 'utils/formatters';

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
  onRefresh?: () => void;
  showCancelados: boolean;
  setShowCancelados: (show: boolean) => void;
  onAudit?: (item: Titulo) => void;
  auditEntity?: string;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
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
  onRefresh,
  showCancelados,
  setShowCancelados,
  onAudit,
  auditEntity,
  sortColumn,
  sortDirection,
  onSort,
}) => {
  const isMobile = useIsMobile();
  const { t } = useI18n();

  // Resetar página quando o filtro mudar
  useEffect(() => {
    setPage(1);
  }, [showCancelados, setPage]);

  // Limpar seleção de itens cancelados quando o filtro de ocultar cancelados for ativado
  useEffect(() => {
    if (!showCancelados && _selectedItems.length > 0) {
      const canceladosSelecionados = _selectedItems.filter(item => item.status?.toLowerCase() === 'cancelado');
      
      if (canceladosSelecionados.length > 0) {
        // Remover apenas os cancelados, mantendo os outros selecionados
        const itensNaoCancelados = _selectedItems.filter(item => item.status?.toLowerCase() !== 'cancelado');
        setSelectedItems(itensNaoCancelados);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelados]);

  // Callback para ordenação - repassar para o handler do componente pai (que atualiza query)
  const handleSort = useCallback((column: string, direction: SortDirection) => {
    onSort?.(column, direction);
  }, [onSort]);


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
        label: action.label,
        variant: action.variant || 'primary',
        onClick: action.action,
        disabled: disabledFunc,
        requiresSelection: action.requiresSelection,
        dropdown: action.dropdown
      };
    });
  }, [bulkActions]);

  return (
    <>
    <EmbeddedTablePanel
            key="financeiro-tab-table"
            title={t('tabs.financial')}
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
              searchPlaceholder: t('layout.searchPlaceholder'),
              searchFields: [
                { key: 'id', label: t('table.id') },
                { key: 'numero_titulo', label: t('table.titleNumber') },
                { key: 'status', label: t('table.status') },
                { key: 'plano', label: t('table.plan') },
                { key: 'cliente', label: t('table.client') },
                { key: 'valor', label: t('form.value') },
                { key: 'nfse_numero', label: t('table.nf') }
              ],
              sortable: true,
              sortColumn,
              sortDirection,
              striped: true,
              hover: true,
              responsive: true,
              emptyMessage: t('empty.noTitles'),
              className: 'no-padding',
              bulkActions: memoizedBulkActions,
              customControls: (
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="showCanceladosContrato"
                    checked={showCancelados}
                    onChange={(e) => {
                      setShowCancelados(e.target.checked);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label" htmlFor="showCanceladosContrato" style={{ cursor: 'pointer' }}>
                    {t('filter.showCanceled')}
                  </label>
                </div>
              )
            }}
            onSelectionChange={setSelectedItems}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onRefresh={onRefresh}
            onSort={handleSort}
            onAudit={onAudit}
            auditEntity={auditEntity}
          />

      {/* Resumo Financeiro - Fixo no final */}
      {filteredData.length > 0 && (
        <div className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo" style={{ flexShrink: 0, marginBottom: 0, marginTop: isMobile ? '0.25rem' : '0.5rem', marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
          <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
            <div className="text-end">
              <div className="small text-muted">{t('summary.value')}</div>
              <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                return sum + Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0);
              }, 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.paidValue')}</div>
              <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                // Considerar apenas valor_pago se existir e for maior que 0
                const valorPago = Number(item.valor_pago || 0);
                if (valorPago > 0) {
                  return sum + valorPago;
                }
                return sum;
              }, 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.openValue')}</div>
              <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0));
              }, 0))}</strong>
            </div>
            {showCancelados && (
              <div className="text-end">
                <div className="small text-muted">{t('summary.canceledValue')}</div>
                <strong>{formatCurrency(filteredData.reduce((sum: number, item: Titulo) => {
                  return sum + (item.status === 'cancelado' ? Number(item.valor || (item as Titulo & { valor_parcela?: number }).valor_parcela || 0) : 0);
                }, 0))}</strong>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FinanceiroTab;
