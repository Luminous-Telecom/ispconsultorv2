import React from 'react';
import Table from '../../../../tables/Table';
import { Contrato } from '../../../../../hooks/useContratos';
import { ContratosTabProps } from '../types';

const ContratosTab: React.FC<ContratosTabProps> = ({
  isLoadingContratos,
  sortedContratosData,
  setSelectedContratosItems,
  contratosBulkActions,
  showInativosContratos,
  setShowInativosContratos,
  onRefresh
}) => {
  return (
    <div className="row" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="col-12" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
          config={{
            columns: [
              { key: 'id', label: 'ID', sortable: true, searchable: true, render: (contrato: Contrato) => contrato.id },
              { 
                key: 'plano_nome', 
                label: 'Plano', 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato & { plano_nome?: string }) => contrato.plano?.nome_plano || contrato.plano_nome || '-' 
              },
              { 
                key: 'valor_mensal', 
                label: 'Valor Plano', 
                sortable: false, 
                searchable: false,
                render: (contrato: Contrato) => {
                  const valor = contrato.plano?.valor_mensal;
                  return valor ? `R$ ${Number(valor).toFixed(2)}` : '-';
                }
              },
              {
                key: 'status',
                label: 'Status',
                sortable: true,
                searchable: true,
                render: (contrato: Contrato) => (
                  <span className={`badge ${
                    contrato.status === 'ativo' ? 'bg-success' :
                    contrato.status === 'inativo' ? 'bg-danger' :
                    'bg-warning'
                  }`}>
                    {contrato.status}
                  </span>
                )
              },
              { 
                key: 'desconto_percentual', 
                label: 'Desconto %', 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-' 
              },
              { 
                key: 'desconto_valor', 
                label: 'Desconto R$', 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => {
                  const valor = contrato.desconto_valor;
                  return valor ? `R$ ${Number(valor).toFixed(2)}` : '-';
                }
              },
              { 
                key: 'valor_final', 
                label: 'Valor Final', 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => {
                  const valor = contrato.valor_final;
                  return valor ? `R$ ${Number(valor).toFixed(2)}` : '-';
                }
              },
              { 
                key: 'data_inicio', 
                label: 'Data Início', 
                sortable: true, 
                searchable: false,
                render: (contrato: Contrato) => {
                  return contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-';
                }
              },
              { 
                key: 'data_fim', 
                label: 'Data Fim', 
                sortable: true, 
                searchable: false,
                render: (contrato: Contrato) => {
                  return contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-';
                }
              },
              {
                key: 'isento_mensalidade',
                label: 'Isento',
                sortable: true,
                searchable: true,
                render: (contrato: Contrato) => (
                  <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
                    {contrato.isento_mensalidade ? 'Sim' : 'Não'}
                  </span>
                )
              },
              { 
                key: 'dia_vencimento_id', 
                label: 'Dia Venc.', 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato) => contrato.dia_vencimento_id || '-' 
              },
              { 
                key: 'banco_nome', 
                label: 'Banco', 
                sortable: true, 
                searchable: true,
                render: (contrato: Contrato & { banco_nome?: string }) => contrato.bancoBoleto?.nome || contrato.banco_nome || '-' 
              }
            ],
            data: (sortedContratosData || []).map((contrato: Contrato) => ({
              ...contrato,
              // Adicionar campos virtuais para busca funcionar com campos aninhados
              plano_nome: contrato.plano?.nome_plano || '',
              banco_nome: contrato.bancoBoleto?.nome || '',
              plano_valor_mensal: contrato.plano?.valor_mensal || 0
            })),
            customFilters: (data: (Contrato & { plano_nome?: string; banco_nome?: string })[]) => {
              // Filtrar inativos se necessário (a busca e ordenação serão feitas pelo Table internamente)
              return data.filter((contrato) => {
                if (contrato.status === 'inativo' && !showInativosContratos) {
                  return false;
                }
                return true;
              });
            },
            loading: isLoadingContratos,
            selectable: true,
            multiSelect: false,
            searchable: true,
            searchPlaceholder: 'Buscar por plano, status, valor...',
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
            emptyMessage: 'Este cliente ainda não possui contratos cadastrados.',
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
                  Mostrar inativos
                </label>
              </div>
            )
          }}
          onSelectionChange={setSelectedContratosItems}
          onRefresh={onRefresh}
        />
        </div>

        {/* Resumo de Contratos */}
        {sortedContratosData.length > 0 && (
          <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded" style={{ margin: '1rem', flexShrink: 0 }}>
            <div className="d-flex align-items-center">
              <i className="bi bi-info-circle text-muted me-2"></i>
              <span className="small text-muted">Resumo de contratos</span>
            </div>
            <div className="d-flex gap-4">
              <div className="text-end">
                <div className="small text-muted">Total de contratos:</div>
                <strong>{sortedContratosData.length}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Contratos ativos:</div>
                <strong>{sortedContratosData.filter((c: Contrato) => c.status === 'ativo').length}</strong>
              </div>
              <div className="text-end">
                <div className="small text-muted">Valor total mensal:</div>
                <strong>R$ {sortedContratosData.reduce((sum: number, contrato: Contrato) => {
                  return sum + Number(contrato.valor_final || 0);
                }, 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContratosTab;

