import React, { useState } from 'react';
import DataTable from '../../common/DataTable';
import { ContratoCreateModal } from '../../modals/contratos';
import { useContratos } from '../../../hooks/useContratos';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { useImprimir } from '../../../hooks/useImprimir';
import { createImprimirDropdown } from '../../common/ImprimirDropdown';
import TermosContrato from './TermosContrato';

interface ClienteContratosProps {
  cliente: any;
}

const ClienteContratos: React.FC<ClienteContratosProps> = ({ 
  cliente
}) => {
  const [activeTab, setActiveTab] = useState<'contratos' | 'termos'>('contratos');
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const { addNotification } = useNotificationContext();


  // Hook para impressão
  const { handleImprimirSelecionados, handleImprimirTodos } = useImprimir({
    itemType: 'contrato',
    filterCondition: (c: any) => c.status === 'ativo',
    filterLabel: 'Todos Ativos'
  });

  // Buscar contratos reais do cliente
  const { data: contratosData, isLoading: contratosLoading, refetch: refetchContratos } = useContratos(cliente?.id);
  const contratosReais = contratosData || [];
  
  const contratos = contratosReais;

  const contratosAtivos = (contratos as any[]).filter((c: any) => c.status === 'ativo');

  // Funções de ordenação
  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const getSortedContratos = () => {
    if (!contratos || !sortColumn) {
      return contratos;
    }

    return [...contratos].sort((a, b) => {
      let aValue: any = (a as any)[sortColumn];
      let bValue: any = (b as any)[sortColumn];

      // Tratar campos especiais
      if (sortColumn === 'valor_final' || sortColumn === 'valor_plano') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      // Converter para string se necessário para comparação
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }

      // Tratar valores null/undefined
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };


  const handleDeletarContrato = (selectedItems: any[]) => {
    if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} contrato(s)?`)) {
      selectedItems.forEach(item => {
        // Deletar contrato
        refetchContratos();
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ativo':
        return 'success';
      case 'suspenso':
        return 'warning';
      case 'cancelado':
        return 'danger';
      case 'inativo':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const contratosColumns = [
    { key: 'id', label: 'ID', sortable: true },
    { 
      key: 'plano', 
      label: 'Plano', 
      sortable: true,
      render: (contrato: any) => contrato.plano?.nome_plano || '-'
    },
    { 
      key: 'valor_plano', 
      label: 'Valor Plano', 
      sortable: true,
      render: (contrato: any) => contrato.plano?.valor_mensal ? `R$ ${Number(contrato.plano.valor_mensal).toFixed(2).replace('.', ',')}` : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      sortable: true,
      render: (contrato: any) => (
        <span className={`badge bg-${getStatusColor(contrato.status)}`}>
          {contrato.status.charAt(0).toUpperCase() + contrato.status.slice(1)}
        </span>
      )
    },
    { 
      key: 'desconto_percentual', 
      label: 'Desconto %', 
      sortable: true,
      render: (contrato: any) => contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-'
    },
    { 
      key: 'desconto_valor', 
      label: 'Desconto R$', 
      sortable: true,
      render: (contrato: any) => contrato.desconto_valor ? `R$ ${Number(contrato.desconto_valor).toFixed(2).replace('.', ',')}` : '-'
    },
    { 
      key: 'valor_final', 
      label: 'Valor Final', 
      sortable: true,
      render: (contrato: any) => {
        const valor = contrato.valor_final || contrato.plano?.valor_mensal || 0;
        return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
      }
    },
    { 
      key: 'data_inicio', 
      label: 'Data Início', 
      sortable: true,
      render: (contrato: any) => contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'data_fim', 
      label: 'Data Fim', 
      sortable: true,
      render: (contrato: any) => contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'isento', 
      label: 'Isento', 
      sortable: true,
      render: (contrato: any) => (
        <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
          {contrato.isento_mensalidade ? 'Sim' : 'Não'}
        </span>
      )
    },
    { 
      key: 'dia_vencimento', 
      label: 'Dia Venc.', 
      sortable: true,
      render: (contrato: any) => contrato.dia_vencimento ? `Dia ${contrato.dia_vencimento}` : '-'
    },
    { 
      key: 'banco', 
      label: 'Banco', 
      sortable: true,
      render: (contrato: any) => contrato.bancoBoleto?.nome || '-'
    }
  ];

  if (!cliente) {
    return (
      <div>Carregando dados do cliente...</div>
    );
  }

  return (
    <div>
      <small className="mb-1 fw-bold">
        Contratos do Cliente
      </small>

      {/* Navegação por Abas */}
      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'contratos' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('contratos')}
          >
            Contratos ({contratos.length})
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === 'termos' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('termos')}
          >
            Termos
          </button>
        </li>
      </ul>

      {/* Conteúdo das Abas */}
      <div className="tab-content">
        {activeTab === 'contratos' && (
          <div className="tab-pane active">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Contratos ({contratos.length})</h6>
            </div>

            <DataTable
              data={getSortedContratos()}
              columns={contratosColumns}
              isLoading={contratosLoading}
              pagination={{
                from: 1,
                to: contratos.length,
                total: contratos.length,
                current_page: 1,
                last_page: 1
              }}
              limit={10}
              setLimit={() => {}}
              setPage={() => {}}
              emptyMessage="Nenhum contrato encontrado"
              searchPlaceholder="Buscar contratos..."
              onSearch={() => {}}
              bulkActions={[
                {
                  label: 'Novo Contrato',
                  action: () => setShowContratoCreateModal(true)
                },
                {
                  label: 'Deletar',
                  action: handleDeletarContrato
                },
                {
                  label: 'Imprimir',
                  variant: 'primary',
                  dropdown: [
                    {
                      label: `Imprimir Selecionados (${selectedItems.length})`,
                      action: () => {
                        if (selectedItems.length > 0) {
                          const ids = selectedItems.map(item => item.id);
                          const idsParam = ids.join(',');
                          handleImprimirSelecionados(idsParam);
                        }
                      }
                    },
                    {
                      label: `Imprimir Todos Ativos`,
                      action: () => {
                        if (contratosAtivos.length > 0) {
                          const ids = contratosAtivos.map(item => item.id);
                          const idsParam = ids.join(',');
                          handleImprimirTodos(idsParam);
                        }
                      }
                    }
                  ],
                  disabled: () => false
                }
              ]}
              onSort={handleSort}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onRefresh={refetchContratos}
              onSelectionChange={setSelectedItems}
            />
          </div>
        )}

        {activeTab === 'termos' && (
          <div className="tab-pane active">
            {contratos.length > 0 ? (
              <div>
                <div className="mb-3">
                  <h6 className="mb-0">Selecione um contrato para visualizar os termos:</h6>
                </div>
                <div className="row">
                  {contratos.map((contrato: any) => (
                    <div key={contrato.id} className="col-md-6 mb-3">
                      <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">Contrato #{contrato.id}</h6>
                          <span className={`badge ${
                            contrato.status === 'ativo' ? 'bg-success' :
                            contrato.status === 'inativo' ? 'bg-danger' :
                            'bg-warning'
                          }`}>
                            {contrato.status}
                          </span>
                        </div>
                        <div className="card-body">
                          <p className="mb-2"><strong>Plano:</strong> {contrato.plano?.nome_plano || '-'}</p>
                          <p className="mb-2"><strong>Valor:</strong> {contrato.plano?.valor_mensal ? `R$ ${contrato.plano.valor_mensal}` : '-'}</p>
                          <p className="mb-3"><strong>Data Início:</strong> {contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'}</p>
                          <TermosContrato contratoId={contrato.id} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="alert alert-info">
                Nenhum contrato encontrado para este cliente.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de criação de contrato */}
      <ContratoCreateModal
        show={showContratoCreateModal}
        onClose={() => setShowContratoCreateModal(false)}
        onSuccess={() => {
          setShowContratoCreateModal(false);
          refetchContratos();
        }}
        clienteId={cliente?.id}
      />
    </div>
  );
   };
   
   export default ClienteContratos;
