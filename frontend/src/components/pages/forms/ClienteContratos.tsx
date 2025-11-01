import React, { useState } from 'react';
import { Cliente } from '../../../types';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import { ContratoCreateModal } from '../../modals/clientes';
import { useContratos, Contrato } from '../../../hooks/useContratos';
import { useImprimir } from '../../../hooks/useImprimir';
import TermosContrato from './TermosContrato';

interface ClienteContratosProps {
  cliente: Cliente | null;
}

const ClienteContratos: React.FC<ClienteContratosProps> = ({ 
  cliente
}) => {
  const [activeTab, setActiveTab] = useState<'contratos' | 'termos'>('contratos');
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showContratoCreateModal, setShowContratoCreateModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Contrato[]>([]);

  // Hook para impressão
  const { handleImprimirSelecionados, handleImprimirTodos } = useImprimir({
    itemType: 'contrato',
    filterLabel: 'Todos Ativos'
  });

  // Buscar contratos reais do cliente
  const { data: contratosData, isLoading: contratosLoading, refetch: refetchContratos } = useContratos(cliente?.id);
  const contratosReais = contratosData || [];
  
  const contratos = contratosReais;

  const contratosAtivos = contratos.filter((c: Contrato) => c.status === 'ativo');

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
      const aValue = a[sortColumn as keyof Contrato];
      const bValue = b[sortColumn as keyof Contrato];

      // Tratar campos especiais
      if (sortColumn === 'valor_final' || sortColumn === 'valor_plano') {
        const aNum = typeof aValue === 'number' ? aValue : parseFloat(String(aValue || 0)) || 0;
        const bNum = typeof bValue === 'number' ? bValue : parseFloat(String(bValue || 0)) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Converter para string se necessário para comparação
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();

      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };


  const handleDeletarContrato = (selectedItems: Contrato[]) => {
    if (selectedItems.length > 0 && window.confirm(`Tem certeza que deseja excluir ${selectedItems.length} contrato(s)?`)) {
      selectedItems.forEach(() => {
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

  const contratosColumns: TableConfig<Contrato>['columns'] = [
    { key: 'id', label: 'ID', sortable: true },
    { 
      key: 'plano', 
      label: 'Plano', 
      sortable: true,
      render: (contrato: Contrato) => contrato.plano?.nome_plano || '-'
    },
    { 
      key: 'valor_plano', 
      label: 'Valor Plano', 
      sortable: true,
      render: (contrato: Contrato) => contrato.plano?.valor_mensal ? `R$ ${Number(contrato.plano.valor_mensal).toFixed(2).replace('.', ',')}` : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      sortable: true,
      render: (contrato: Contrato) => (
        <span className={`badge bg-${getStatusColor(contrato.status)}`}>
          {contrato.status.charAt(0).toUpperCase() + contrato.status.slice(1)}
        </span>
      )
    },
    { 
      key: 'desconto_percentual', 
      label: 'Desconto %', 
      sortable: true,
      render: (contrato: Contrato) => contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-'
    },
    { 
      key: 'desconto_valor', 
      label: 'Desconto R$', 
      sortable: true,
      render: (contrato: Contrato) => contrato.desconto_valor ? `R$ ${Number(contrato.desconto_valor).toFixed(2).replace('.', ',')}` : '-'
    },
    { 
      key: 'valor_final', 
      label: 'Valor Final', 
      sortable: true,
      render: (contrato: Contrato) => {
        const valor = contrato.valor_final || contrato.plano?.valor_mensal || 0;
        return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
      }
    },
    { 
      key: 'data_inicio', 
      label: 'Data Início', 
      sortable: true,
      render: (contrato: Contrato) => contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'data_fim', 
      label: 'Data Fim', 
      sortable: true,
      render: (contrato: Contrato) => contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'isento', 
      label: 'Isento', 
      sortable: true,
      render: (contrato: Contrato) => (
        <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
          {contrato.isento_mensalidade ? 'Sim' : 'Não'}
        </span>
      )
    },
    { 
      key: 'dia_vencimento', 
      label: 'Dia Venc.', 
      sortable: true,
      render: (contrato: Contrato) => contrato.dia_vencimento_id ? `Dia ${contrato.dia_vencimento_id}` : '-'
    },
    { 
      key: 'banco', 
      label: 'Banco', 
      sortable: true,
      render: (contrato: Contrato) => contrato.bancoBoleto?.nome || '-'
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

            <Table
              config={{
                columns: contratosColumns,
                data: getSortedContratos(),
                loading: contratosLoading,
                searchable: true,
                searchPlaceholder: 'Buscar contratos...',
                sortable: true,
                striped: true,
                hover: true,
                responsive: true,
                bulkActions: [
                  {
                    key: 'novo-contrato',
                    label: 'Novo Contrato',
                    onClick: () => setShowContratoCreateModal(true)
                  },
                  {
                    key: 'deletar',
                    label: 'Deletar',
                    onClick: handleDeletarContrato
                  },
                  {
                    key: 'imprimir',
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
                ],
                emptyMessage: 'Nenhum contrato encontrado'
              }}
              tableId="cliente-contratos"
              onSort={handleSort}
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
                  {contratos.map((contrato: Contrato) => (
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
