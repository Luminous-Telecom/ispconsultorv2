import React, { useMemo } from 'react';
import EmbeddedTablePanel from 'components/common/EmbeddedTablePanel';
import type { BulkAction } from 'components/tables/types';
import { formatCurrency } from 'utils/formatters';
import type { SaasContrato } from 'services/saas/saasCrudService';
import type { UseTableFiltersReturn } from 'hooks/useTableFilters';
import type { SaasEmpresaTranslateFn, StatusEmpresa } from '../types';
import {
  buildContratosColumns,
  buildContratosSearchFields,
} from '../saasEmpresaTableColumns';

interface ContratosSectionProps {
  empresaId: number;
  contratos: SaasContrato[];
  contratosRaw: SaasContrato[];
  contratosData: unknown;
  statusEmpresa?: StatusEmpresa;
  contratosTf: UseTableFiltersReturn;
  showInativosContratos: boolean;
  setShowInativosContratos: (show: boolean) => void;
  contratosBulkActions: BulkAction<SaasContrato>[];
  isMobile: boolean;
  t: SaasEmpresaTranslateFn;
  onRowDoubleClick: (i: SaasContrato) => void;
  onRefresh: () => void;
  onAudit: (i: SaasContrato) => void;
}

const ContratosSection: React.FC<ContratosSectionProps> = ({
  empresaId,
  contratos,
  contratosRaw,
  contratosData,
  statusEmpresa,
  contratosTf,
  showInativosContratos,
  setShowInativosContratos,
  contratosBulkActions,
  isMobile,
  t,
  onRowDoubleClick,
  onRefresh,
  onAudit,
}) => {
  const columns = useMemo(() => buildContratosColumns(t, statusEmpresa), [t, statusEmpresa]);
  const searchFields = useMemo(() => buildContratosSearchFields(t), [t]);

  return (
    <>
      <EmbeddedTablePanel
        key={`saas-contratos-${empresaId}`}
        title={t('nav.contracts')}
        config={{
          columns,
          data: contratos,
          loading: !contratosData,
          emptyMessage: t('empty.noContracts'),
          searchable: true,
          searchPlaceholder: '',
          searchFields,
          sortable: true,
          sortColumn: contratosTf.sortColumn,
          sortDirection: contratosTf.sortDirection,
          striped: true,
          hover: true,
          responsive: true,
          selectable: true,
          multiSelect: false,
          bulkActions: contratosBulkActions,
          className: 'no-padding',
          customControls: (
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="showInativosSaasContratos"
                checked={showInativosContratos}
                onChange={(e) => setShowInativosContratos(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label" htmlFor="showInativosSaasContratos" style={{ cursor: 'pointer' }}>
                {t('filter.showInactive')}
              </label>
            </div>
          ),
        }}
        onRowDoubleClick={onRowDoubleClick}
        onRefresh={onRefresh}
        onSort={contratosTf.setSort}
        onSearch={(s, f) => { contratosTf.setSearch(s); if (f) contratosTf.setSearchField(f); }}
        search={contratosTf.search}
        onAudit={(i) => onAudit(i)}
        auditEntity="SaasContrato"
      />
      {contratosRaw.length > 0 && (
        <div className="d-flex justify-content-between align-items-center p-3 bg-light financeiro-resumo" style={{ flexShrink: 0, marginTop: isMobile ? '0.25rem' : '0.5rem', marginBottom: 0, marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
          <div className="d-flex align-items-center">
            <span className="small text-muted">{t('summary.contractSummary')}</span>
          </div>
          <div className="d-flex gap-4">
            <div className="text-end">
              <div className="small text-muted">{t('summary.totalContracts')}</div>
              <strong>{contratosRaw.length}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.activeContracts')}</div>
              <strong>{contratosRaw.filter((c) => c.status === 'ativo').length}</strong>
            </div>
            <div className="text-end">
              <div className="small text-muted">{t('summary.monthlyTotalValue')}</div>
              <strong>{formatCurrency(contratosRaw.reduce((sum, c) => sum + Number(c.valor ?? 0), 0))}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContratosSection;
