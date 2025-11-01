import React, { useState } from 'react';
import { Cliente } from '../../../types';
import Table from '../../tables/Table';
import { TableConfig } from '../../tables/types';
import ContratoModal from '../../modals/clientes/contrato/ContratoModal';
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

  // Adicionar campos virtuais para busca funcionar com campos aninhados
  const contratosWithVirtualFields = React.useMemo(() => {
    return contratos.map((c: Contrato) => ({
      ...c,
      // Adicionar campos virtuais para busca funcionar com campos aninhados
      plano_nome: c.plano?.nome_plano || '',
      banco_nome: c.bancoBoleto?.nome || '',
      valor_plano_str: (c.plano?.valor_mensal || 0).toString(),
      valor_final_str: (c.valor_final || 0).toString(),
      desconto_percentual_str: (c.desconto_percentual || 0).toString(),
      desconto_valor_str: (c.desconto_valor || 0).toString(),
      dia_vencimento_str: (c.dia_vencimento_id || 0).toString()
    }));
  }, [contratos]);


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

  const contratosColumns: TableConfig<Contrato & { plano_nome?: string; banco_nome?: string; valor_plano_str?: string; valor_final_str?: string; desconto_percentual_str?: string; desconto_valor_str?: string; dia_vencimento_str?: string }>['columns'] = [
    { key: 'id', label: 'ID', sortable: true, searchable: true },
    { 
      key: 'plano_nome', 
      label: 'Plano', 
      sortable: true,
      searchable: true,
      render: (contrato: Contrato & { plano_nome?: string }) => contrato.plano?.nome_plano || contrato.plano_nome || '-'
    },
    { 
      key: 'valor_plano_str', 
      label: 'Valor Plano', 
      sortable: false,
      searchable: true,
      render: (contrato: Contrato) => contrato.plano?.valor_mensal ? `R$ ${Number(contrato.plano.valor_mensal).toFixed(2).replace('.', ',')}` : '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      sortable: true,
      searchable: true,
      render: (contrato: Contrato) => (
        <span className={`badge bg-${getStatusColor(contrato.status)}`}>
          {contrato.status.charAt(0).toUpperCase() + contrato.status.slice(1)}
        </span>
      )
    },
    { 
      key: 'desconto_percentual_str', 
      label: 'Desconto %', 
      sortable: true,
      searchable: true,
      render: (contrato: Contrato) => contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-'
    },
    { 
      key: 'desconto_valor_str', 
      label: 'Desconto R$', 
      sortable: true,
      searchable: true,
      render: (contrato: Contrato) => contrato.desconto_valor ? `R$ ${Number(contrato.desconto_valor).toFixed(2).replace('.', ',')}` : '-'
    },
    { 
      key: 'valor_final_str', 
      label: 'Valor Final', 
      sortable: true,
      searchable: true,
      render: (contrato: Contrato) => {
        const valor = contrato.valor_final || contrato.plano?.valor_mensal || 0;
        return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
      }
    },
    { 
      key: 'data_inicio', 
      label: 'Data Início', 
      sortable: true,
      searchable: false,
      render: (contrato: Contrato) => contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'
    },
    { 
      key: 'data_fim', 
      label: 'Data Fim', 
      sortable: true,
      searchable: false,
      render: (contrato: Contrato) => contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-'
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
      key: 'dia_vencimento_str', 
      label: 'Dia Venc.', 
      sortable: true,
      searchable: true,
      render: (contrato: Contrato) => contrato.dia_vencimento_id ? `Dia ${contrato.dia_vencimento_id}` : '-'
    },
    { 
      key: 'banco_nome', 
      label: 'Banco', 
      sortable: true,
      searchable: true,
      render: (contrato: Contrato & { banco_nome?: string }) => contrato.bancoBoleto?.nome || contrato.banco_nome || '-'
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
                data: contratosWithVirtualFields,
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

      {/* Modal de contrato (criação e edição unificados) */}
      <ContratoModal
        show={showContratoCreateModal}
        clienteId={cliente?.id}
        contratoId={null}
        onClose={() => setShowContratoCreateModal(false)}
        onSuccess={() => {
          // Não fechar o modal automaticamente - permitir criar múltiplos contratos
          refetchContratos();
        }}
      />
    </div>
  );
   };
   
   export default ClienteContratos;
