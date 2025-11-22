import React from 'react';
import { CarneParcela } from '@/types';
import { TituloItem } from '@/types/cliente';
import Table from '@/components/tables/Table';
import { FinanceiroTabProps } from '../types';
import { TableColumn } from '@/components/tables/types';

const FinanceiroTab: React.FC<FinanceiroTabProps> = ({
  sortedData,
  isLoadingParcelas,
  setSelectedItems,
  bulkActions,
  showCancelados,
  setShowCancelados,
  onRefresh,
  columns
}) => {

  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
          config={{
            columns: columns as TableColumn<CarneParcela>[],
            data: sortedData,
            customFilters: (data: (CarneParcela & { plano_nome?: string; numero_titulo_str?: string; valor_str?: string; valor_pago_str?: string })[]) => {
              // Filtrar cancelados se necessário (a busca será feita pelo Table internamente)
              return data.filter((titulo) => {
                if (titulo.status === 'cancelado' && !showCancelados) {
                  return false;
                }
                return true;
              });
            },
            loading: isLoadingParcelas,
            selectable: true,
            multiSelect: true,
            searchable: true,
            searchPlaceholder: 'Buscar por ID, carnê, valor...',
            sortable: true,
            striped: true,
            hover: true,
            responsive: true,
            bulkActions: bulkActions.map(action => {
              let disabledFunc: ((selectedItems: CarneParcela[]) => boolean) | undefined;
              if (typeof action.disabled === 'function') {
                disabledFunc = action.disabled;
              } else if (typeof action.disabled === 'boolean') {
                disabledFunc = () => action.disabled as boolean;
              }
              
              return {
                key: action.key,
                label: action.label,
                variant: action.variant,
                disabled: disabledFunc,
                onClick: action.onClick,
                confirm: action.confirm,
                dropdown: action.dropdown
              };
            }),
            emptyMessage: 'Este cliente ainda não possui títulos cadastrados.',
            className: 'no-padding',
            customControls: (
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showCancelados"
                  checked={showCancelados}
                  onChange={(e) => setShowCancelados(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showCancelados">
                  Mostrar cancelados
                </label>
              </div>
            )
          }}
          onSelectionChange={(items: CarneParcela[]) => {
            // Converter CarneParcela[] para TituloItem[]
            const tituloItems: TituloItem[] = items.map(item => ({
              id: item.id,
              numero_titulo: (item.numero_titulo || item.numero_parcela || `Título ${item.id}`).toString(),
              valor_parcela: item.valor || item.valor_parcela || 0,
              data_vencimento: item.data_vencimento,
              status: item.status,
              valor_pago: item.valor_pago || 0,
              data_pagamento: item.data_pagamento || null,
              charge_id: item.charge_id || null,
              cliente: (item as unknown as { cliente?: unknown }).cliente || ((item as unknown as { carne?: { cliente?: unknown } }).carne?.cliente) || undefined
            }));
            setSelectedItems(tituloItems);
          }}
          onRefresh={onRefresh}
        />
        </div>

        {/* Resumo Financeiro */}
        {sortedData.length > 0 && (
          <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded" style={{ margin: '1rem', flexShrink: 0 }}>
            <div className="d-flex align-items-center">
              <i className="bi bi-info-circle text-muted me-2"></i>
              <span className="small text-muted">Legenda de cores</span>
            </div>
            <div className="d-flex gap-4">
              <div className="text-end">
                <div className="small text-muted">Valor:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: CarneParcela) => {
                  return sum + Number(item.valor || item.valor_parcela || 0);
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor baixado:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: CarneParcela) => {
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
                <strong>R$ {sortedData.reduce((sum: number, item: CarneParcela) => {
                  return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor || item.valor_parcela || 0));
                }, 0).toFixed(2)}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor cancelado:</div>
                <strong>R$ {sortedData.reduce((sum: number, item: CarneParcela) => {
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

