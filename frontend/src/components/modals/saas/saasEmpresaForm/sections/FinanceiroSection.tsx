import React, { useMemo } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import { TableFilterCheckbox } from 'components/ui';
import type { BulkAction } from 'components/tables/types';
import { formatCurrency } from 'utils/formatters';
import type { SaasTitulo } from 'services/saas/saasCrudService';
import type { UseTableFiltersReturn } from 'hooks/useTableFilters';
import type { SaasEmpresaTranslateFn } from '../types';
import { buildTitulosColumns, buildTitulosSearchFields } from '../saasEmpresaTableColumns';

interface FinanceiroSectionProps {
  empresaId: number;
  titulos: SaasTitulo[];
  titulosParaFiltro: SaasTitulo[];
  titulosData: unknown;
  titulosTf: UseTableFiltersReturn;
  showCanceladosTitulos: boolean;
  setShowCanceladosTitulos: (show: boolean) => void;
  titulosBulkActions: BulkAction<SaasTitulo>[];
  t: SaasEmpresaTranslateFn;
  onRefresh: () => void;
  onSelectionChange: (items: SaasTitulo[]) => void;
  onRowDoubleClick: (i: SaasTitulo) => void;
  onAudit: (i: SaasTitulo) => void;
}

const FinanceiroSection: React.FC<FinanceiroSectionProps> = ({
  empresaId,
  titulos,
  titulosParaFiltro,
  titulosData,
  titulosTf,
  showCanceladosTitulos,
  setShowCanceladosTitulos,
  titulosBulkActions,
  t,
  onRefresh,
  onSelectionChange,
  onRowDoubleClick,
  onAudit,
}) => {
  const columns = useMemo(() => buildTitulosColumns(t), [t]);
  const searchFields = useMemo(() => buildTitulosSearchFields(t), [t]);

  return (
    <>
      <EmbeddedTablePanel
        key={`saas-titulos-${empresaId}`}
        title={t('tabs.financial')}
        config={{
          columns,
          data: titulos,
          loading: !titulosData,
          emptyMessage: t('empty.noTitles'),
          searchable: true,
          searchPlaceholder: '',
          searchFields,
          sortable: true,
          sortColumn: titulosTf.sortColumn,
          sortDirection: titulosTf.sortDirection,
          striped: true,
          hover: true,
          responsive: true,
          selectable: true,
          multiSelect: true,
          bulkActions: titulosBulkActions,
          className: 'no-padding',
          customControls: (
            <TableFilterCheckbox
              id="showCanceladosSaasTitulos"
              name="showCanceladosSaasTitulos"
              label={t('filter.showCanceled')}
              checked={showCanceladosTitulos}
              onChange={setShowCanceladosTitulos}
            />
          ),
        }}
        onRefresh={onRefresh}
        onSort={titulosTf.setSort}
        onSearch={(s, f) => { titulosTf.setSearch(s); if (f) titulosTf.setSearchField(f); }}
        search={titulosTf.search}
        onSelectionChange={(items) => onSelectionChange(items as SaasTitulo[])}
        onRowDoubleClick={onRowDoubleClick}
        onAudit={(i) => onAudit(i)}
        auditEntity="SaasTitulo"
      />
      {titulosParaFiltro.length > 0 && (
        <div className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo financeiro-resumo-adaptive" >
          <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
            <div className="text-end">
              <div className="small text-muted">{t('summary.value')}</div>
              <strong>{formatCurrency(titulosParaFiltro.reduce((s, titulo) => s + Number(titulo.valor ?? 0), 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.paidValue')}</div>
              <strong>{formatCurrency(titulosParaFiltro.filter((titulo) => titulo.pago).reduce((s, titulo) => s + Number(titulo.valor ?? 0), 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.openValue')}</div>
              <strong>{formatCurrency(titulosParaFiltro.filter((titulo) => !titulo.pago && (titulo as { status?: string }).status !== 'cancelado').reduce((s, titulo) => s + Number(titulo.valor ?? 0), 0))}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.canceledValue')}</div>
              <strong>{formatCurrency(titulosParaFiltro.filter((titulo) => (titulo as { status?: string }).status === 'cancelado').reduce((s, titulo) => s + Number(titulo.valor ?? 0), 0))}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FinanceiroSection;
