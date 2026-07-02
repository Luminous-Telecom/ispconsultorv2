import React from 'react';
import { CarneParcela } from 'types';
import { TituloItem } from 'types/cliente';
import { useI18n } from 'contexts/I18nContext';
import { formatCurrency } from 'utils/formatters';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableFilterCheckbox } from 'components/ui';
import { FinanceiroTabProps } from '../types';
import { TableColumn } from 'components/tables/types';

const FinanceiroTab: React.FC<FinanceiroTabProps> = ({
  sortedData,
  isLoadingParcelas,
  setSelectedItems,
  bulkActions,
  showCancelados,
  setShowCancelados,
  onRefresh,
  columns,
  onAudit,
  auditEntity,
  sortColumn,
  sortDirection,
  onSort
}) => {
  const { t } = useI18n();

  return (
    <>
    <EmbeddedTablePanel
            key="cliente-financeiro-tab-table"
            title={t('tabs.financial')}
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
            searchPlaceholder: '',
            searchFields: [
              { key: 'id', label: t('table.id') },
              { key: 'numero_titulo', label: t('table.titleNumber') },
              { key: 'status', label: t('form.status') },
              { key: 'valor', label: t('form.value') },
              { key: 'valor_pago', label: t('form.paidValue') },
              { key: 'data_vencimento', label: t('form.dueDate') },
              { key: 'data_pagamento', label: t('form.paymentDate') },
              { key: 'charge_id', label: t('table.chargeId') },
              { key: 'nosso_numero', label: t('table.ourNumber') }
            ],
            sortable: true,
            sortColumn,
            sortDirection,
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
            emptyMessage: t('empty.noTitles'),
            className: 'no-padding',
            customControls: (
              <TableFilterCheckbox
                id="showCancelados"
                name="showCancelados"
                label={t('filter.showCanceled')}
                checked={showCancelados}
                onChange={setShowCancelados}
              />
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
          onSort={onSort}
          onRefresh={onRefresh}
          onAudit={onAudit}
          auditEntity={auditEntity}
          />

      {/* Resumo Financeiro - Fixo no final */}
      {sortedData.length > 0 && (
        <div className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo financeiro-resumo-adaptive" >
          <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
            <div className="text-end">
              <div className="small text-muted">{t('summary.value')}</div>
              <strong>{formatCurrency(sortedData.reduce((sum: number, item: CarneParcela) => {
                return sum + Number(item.valor || item.valor_parcela || 0);
              }, 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.paidValue')}</div>
              <strong>{formatCurrency(sortedData.reduce((sum: number, item: CarneParcela) => {
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
              <strong>{formatCurrency(sortedData.reduce((sum: number, item: CarneParcela) => {
                return sum + ((item.pago || item.status === 'cancelado') ? 0 : Number(item.valor || item.valor_parcela || 0));
              }, 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.canceledValue')}</div>
              <strong>{formatCurrency(sortedData.reduce((sum: number, item: CarneParcela) => {
                return sum + (item.status === 'cancelado' ? Number(item.valor || item.valor_parcela || 0) : 0);
              }, 0))}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinanceiroTab;

