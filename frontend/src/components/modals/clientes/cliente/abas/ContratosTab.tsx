import React from 'react';
import { Contrato } from '@/hooks/useContratos';
import { useI18n } from '@/contexts/I18nContext';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/formatters';
import Table from '@/components/tables/Table';
import { ContratosTabProps } from '../types';
import { useIsMobile } from '@/hooks/useMediaQuery';

const ContratosTab: React.FC<ContratosTabProps> = ({
  clienteId,
  isLoadingContratos,
  sortedContratosData,
  setSelectedContratosItems,
  contratosBulkActions,
  showInativosContratos,
  setShowInativosContratos,
  onRefresh,
  onAudit,
  auditEntity
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  
  const mappedData = (sortedContratosData || []).map((contrato: Contrato) => ({
    ...contrato,
    plano_nome: contrato.plano?.nome_plano || '',
    banco_nome: contrato.bancoBoleto?.nome || '',
    plano_valor_mensal: contrato.plano?.valor_mensal || 0,
    endereco: contrato.endereco || '',
    numero: contrato.numero || '',
    complemento: contrato.complemento || '',
    bairro: contrato.bairro || '',
    cidade: contrato.cidade || '',
    estado: contrato.estado || '',
    status_label: contrato.status === 'ativo' ? t('status.active') : t('status.inactive')
  }));
  
  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            key={`cliente-contratos-${clienteId || 'new'}`}
            title={t('nav.contracts')}
            search=""
            config={{
            columns: [
              { key: 'id', label: t('table.id'), sortable: true, searchable: true, width: 42, resizable: true, render: (contrato: Contrato) => contrato.id },
              { 
                key: 'plano_nome', 
                label: t('table.plan'), 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato & { plano_nome?: string }) => contrato.plano?.nome_plano || contrato.plano_nome || '-' 
              },
              {
                key: 'endereco',
                label: t('form.address'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato) => (
                  <span>{contrato.endereco || '-'}</span>
                )
              },
              {
                key: 'numero',
                label: t('form.number'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato) => (
                  <span>{contrato.numero || '-'}</span>
                )
              },
              {
                key: 'complemento',
                label: t('table.complement'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato) => (
                  <span>{contrato.complemento || '-'}</span>
                )
              },
              {
                key: 'bairro',
                label: t('form.neighborhood'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato) => (
                  <span>{contrato.bairro || '-'}</span>
                )
              },
              {
                key: 'cidade',
                label: t('table.city'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato) => (
                  <span>{contrato.cidade || '-'}</span>
                )
              },
              {
                key: 'estado',
                label: t('table.state'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato) => (
                  <span>{contrato.estado || '-'}</span>
                )
              },
              {
                key: 'valor_mensal',
                label: t('table.planValue'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato) => {
                  const valor = contrato.plano?.valor_mensal;
                  return valor ? formatCurrency(valor) : '-';
                }
              },
              {
                key: 'status',
                label: t('form.status'),
                sortable: true,
                searchable: true,
                render: (contrato: Contrato) => (
                  <span className={`badge ${
                    contrato.status === 'ativo' ? 'bg-success' :
                    contrato.status === 'inativo' ? 'bg-danger' :
                    'bg-warning'
                  }`}>
                    {contrato.status === 'ativo' ? t('status.active') : 
                     contrato.status === 'inativo' ? t('status.inactive') : 
                     contrato.status}
                  </span>
                )
              },
              { 
                key: 'desconto_percentual', 
                label: t('table.discountPercent'), 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-' 
              },
              { 
                key: 'desconto_valor', 
                label: t('table.discountValue'), 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => {
                  const valor = contrato.desconto_valor;
                  return valor ? `R$ ${Number(valor).toFixed(2)}` : '-';
                }
              },
              { 
                key: 'valor_final', 
                label: t('table.finalValue'), 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => {
                  const valor = contrato.valor_final;
                  return valor ? `R$ ${Number(valor).toFixed(2)}` : '-';
                }
              },
              { 
                key: 'data_inicio', 
                label: t('table.contractStartDate'), 
                sortable: true, 
                searchable: false,
                render: (contrato: Contrato) => {
                  return formatDate(contrato.data_inicio);
                }
              },
              { 
                key: 'data_fim', 
                label: t('table.contractEndDate'), 
                sortable: true, 
                searchable: false,
                render: (contrato: Contrato) => {
                  return formatDate(contrato.data_fim);
                }
              },
              {
                key: 'isento_mensalidade',
                label: t('table.exempt'),
                sortable: true,
                searchable: true,
                render: (contrato: Contrato) => (
                  <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
                    {contrato.isento_mensalidade ? t('ui.yes') : t('ui.no')}
                  </span>
                )
              },
              { 
                key: 'dia_vencimento_id', 
                label: t('table.dueDay'), 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => contrato.dia_vencimento_id || '-' 
              },
              { 
                key: 'banco_nome', 
                label: t('form.bank'), 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato & { banco_nome?: string }) => contrato.bancoBoleto?.nome || contrato.banco_nome || '-' 
              },
              {
                key: 'created_at',
                label: t('table.createdAt'),
                sortable: true,
                searchable: false,
                render: (contrato: Contrato & { created_at?: string; created_at_formatada?: string | null }) => {
                  // Usar created_at_formatada se disponível (vem do backend já formatada)
                  if (contrato.created_at_formatada) {
                    return contrato.created_at_formatada;
                  }
                  // Fallback para formatDateTime se não tiver formato do backend
                  return contrato.created_at ? formatDateTime(contrato.created_at) : '-';
                }
              }
            ],
            data: mappedData,
            loading: isLoadingContratos,
            selectable: true,
            multiSelect: false,
            searchable: true,
            searchPlaceholder: '',
            searchFields: [
              { key: 'id', label: t('table.id') },
              { key: 'plano_nome', label: t('table.plan') },
              { key: 'status', label: t('form.status') },
              { key: 'valor_final', label: t('table.finalValue') },
              { key: 'desconto_percentual', label: t('table.discountPercent') },
              { key: 'desconto_valor', label: t('table.discountValue') },
              { key: 'banco_nome', label: t('form.bank') },
              { key: 'endereco', label: t('form.address') },
              { key: 'cidade', label: t('table.city') },
              { key: 'estado', label: t('table.state') }
            ],
            sortable: true,
            striped: true,
            hover: true,
            responsive: true,
            bulkActions: contratosBulkActions.map(action => {
              let disabledFunc: ((selectedItems: Contrato[]) => boolean) | undefined;
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
            emptyMessage: t('empty.noContracts'),
            className: 'no-padding',
            customControls: (
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showInativosContratos"
                  checked={showInativosContratos}
                  onChange={(e) => setShowInativosContratos(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="showInativosContratos">
                  {t('filter.showInactive')}
                </label>
              </div>
            )
          }}
          onSelectionChange={setSelectedContratosItems}
          onRefresh={onRefresh}
          onAudit={onAudit}
          auditEntity={auditEntity}
        />
        </div>

        {/* Resumo de Contratos */}
        {sortedContratosData.length > 0 && (
          <div className="d-flex justify-content-between align-items-center p-3 bg-light financeiro-resumo" style={{ marginTop: isMobile ? '0.25rem' : '1rem', marginBottom: isMobile ? '3rem' : '1rem', marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
            <div className="d-flex align-items-center">
              <i className="bi bi-info-circle text-muted me-2"></i>
              <span className="small text-muted">{t('summary.contractSummary')}</span>
            </div>
            <div className="d-flex gap-4">
              <div className="text-end">
                <div className="small text-muted">{t('summary.totalContracts')}</div>
                <strong>{sortedContratosData.length}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">{t('summary.activeContracts')}</div>
                <strong>{sortedContratosData.filter((c: Contrato) => c.status === 'ativo').length}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">{t('summary.monthlyTotalValue')}</div>
                <strong>{formatCurrency(sortedContratosData.reduce((sum: number, contrato: Contrato) => {
                  return sum + Number(contrato.valor_final || 0);
                }, 0))}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContratosTab;

