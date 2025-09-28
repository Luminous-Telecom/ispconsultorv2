import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../services/clienteService';
import { CarneService } from '../../services/carneService';
import { CarneParcelaService } from '../../services/carneParcelaService';
import { useNotificationContext } from '../../contexts/NotificationContext';
import DataTable from '../common/DataTable';

const ClienteShow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const [activeTab, setActiveTab] = useState<'carnes' | 'titulos'>('carnes');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Detectar hash na URL para definir aba inicial
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#carnes') {
      setActiveTab('carnes');
    } else if (hash === '#titulos') {
      setActiveTab('titulos');
    }
  }, []);

  // Funções para refresh das tabelas
  const handleRefreshCarnes = () => {
    queryClient.invalidateQueries({ queryKey: ['carnes-cliente', id] });
    queryClient.invalidateQueries({ queryKey: ['cliente', id] });
    success('Dados atualizados com sucesso!', 3000);
  };

  const handleRefreshTitulos = () => {
    queryClient.invalidateQueries({ queryKey: ['titulos-cliente', id] });
    queryClient.invalidateQueries({ queryKey: ['cliente', id] });
    success('Dados atualizados com sucesso!', 3000);
  };

  // Funções para ações das tabelas
  const handleTopoActionsCarnes = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'visualizar':
        if (selectedItems.length === 1) {
          navigate(`/carnes/${selectedItems[0].id}`);
        }
        break;
      case 'editar':
        if (selectedItems.length === 1) {
          navigate(`/carnes/${selectedItems[0].id}/edit`);
        }
        break;
      case 'imprimir':
        if (selectedItems.length === 1) {
          window.open(`${process.env.REACT_APP_API_URL}/carnes/${selectedItems[0].id}/imprimir`, '_blank');
        }
        break;
    }
  };

  const handleTopoActionsTitulos = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'imprimir':
        if (selectedItems.length === 1) {
          const parcela = selectedItems[0];
          if (parcela.url_boleto) {
            window.open(parcela.url_boleto, '_blank');
          } else {
            error('URL do boleto não disponível para esta parcela');
          }
        }
        break;
      case 'marcar_pago':
        // TODO: Implementar ação de marcar como pago
        success('Funcionalidade será implementada em breve');
        break;
    }
  };

  // Buscar cliente
  const { data: cliente, isLoading: clienteLoading, error: clienteError } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => ClienteService.getById(Number(id)),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  // Buscar carnês do cliente
  const { data: carnesData, isLoading: carnesLoading } = useQuery({
    queryKey: ['carnes-cliente', id, page, limit],
    queryFn: () => CarneService.list({ 
      cliente_id: Number(id),
      page,
      limit
    }),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  // Buscar títulos (parcelas) do cliente
  const { data: titulosData, isLoading: titulosLoading } = useQuery({
    queryKey: ['titulos-cliente', id, page, limit],
    queryFn: () => CarneParcelaService.list({ 
      cliente_id: Number(id),
      page,
      limit
    }),
    enabled: !!id,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  if (clienteLoading) {
    return (
      <div className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
                <p className="mt-2">Carregando dados do cliente...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (clienteError || !cliente) {
    return (
      <div className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center">
                <h5 className="text-danger">Cliente não encontrado</h5>
                <p>O cliente solicitado não foi encontrado ou não existe.</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => navigate('/clientes')}
                >
                  Voltar para Clientes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Colunas para tabela de carnês
  const carnesColumns = [
    {
      key: 'numero_carne',
      label: 'Número',
      sortable: true,
      render: (carne: any) => (
        <code className="text-primary">#{carne.numero_carne}</code>
      )
    },
    {
      key: 'plano.nome_plano',
      label: 'Plano',
      sortable: true,
      render: (carne: any) => carne.plano?.nome_plano || '-'
    },
    {
      key: 'valor_total',
      label: 'Valor Total',
      sortable: true,
      render: (carne: any) => (
        <span className="fw-bold text-success">
          R$ {parseFloat(carne.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'quantidade_parcelas',
      label: 'Parcelas',
      sortable: true,
      render: (carne: any) => `${carne.parcelas_pagas || 0}/${carne.quantidade_parcelas || 0}`
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (carne: any) => {
        const getStatusClass = (status: string) => {
          const statusClasses: Record<string, string> = {
            'ativo': 'bg-primary',
            'pago': 'bg-success',
            'cancelado': 'bg-danger',
            'parcial': 'bg-warning',
            'pendente': 'bg-secondary'
          };
          return statusClasses[status] || 'bg-secondary';
        };
        
        return (
          <span className={`badge ${getStatusClass(carne.status)}`}>
            {carne.status?.charAt(0).toUpperCase() + carne.status?.slice(1) || 'Desconhecido'}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Data Criação',
      sortable: true,
      render: (carne: any) => new Date(carne.created_at).toLocaleDateString('pt-BR')
    }
  ];

  // Colunas para tabela de títulos
  const titulosColumns = [
    {
      key: 'numero_parcela',
      label: 'Parcela',
      sortable: true,
      render: (titulo: any) => `#${titulo.numero_parcela}`
    },
    {
      key: 'carne.numero_carne',
      label: 'Carnê',
      sortable: true,
      render: (titulo: any) => (
        <code className="text-primary">#{titulo.carne?.numero_carne}</code>
      )
    },
    {
      key: 'valor_parcela',
      label: 'Valor',
      sortable: true,
      render: (titulo: any) => (
        <span className="fw-bold">
          R$ {parseFloat(titulo.valor_parcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      render: (titulo: any) => new Date(titulo.data_vencimento).toLocaleDateString('pt-BR')
    },
    {
      key: 'pago',
      label: 'Status',
      sortable: true,
      render: (titulo: any) => {
        if (titulo.pago) {
          return (
            <span className="badge bg-success">
              Pago
            </span>
          );
        } else if (titulo.status === 'cancelado') {
          return (
            <span className="badge bg-danger">
              Cancelado
            </span>
          );
        } else if (titulo.status === 'vencido') {
          return (
            <span className="badge bg-warning">
              Vencido
            </span>
          );
        } else {
          return (
            <span className="badge bg-secondary">
              Pendente
            </span>
          );
        }
      }
    },
    {
      key: 'data_pagamento',
      label: 'Data Pagamento',
      sortable: true,
      render: (titulo: any) => 
        titulo.data_pagamento ? new Date(titulo.data_pagamento).toLocaleDateString('pt-BR') : '-'
    }
  ];

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          {/* Cabeçalho */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-1">
                <i className="fas fa-user me-2"></i>
                {cliente.razao_social}
              </h2>
              <p className="text-muted mb-0">
                CNPJ: {cliente.cnpj} • {cliente.nome_fantasia || 'Sem nome fantasia'}
              </p>
            </div>
            <div>
              <button 
                className="btn btn-secondary me-2"
                onClick={() => navigate('/clientes')}
              >
                <i className="fas fa-arrow-left me-1"></i>
                Voltar
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/clientes/${cliente.id}/edit`)}
              >
                <i className="fas fa-edit me-1"></i>
                Editar
              </button>
            </div>
          </div>

          {/* Informações do Cliente */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Informações do Cliente
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <dl className="row">
                    <dt className="col-sm-4">Razão Social:</dt>
                    <dd className="col-sm-8">{cliente.razao_social}</dd>
                    
                    <dt className="col-sm-4">Nome Fantasia:</dt>
                    <dd className="col-sm-8">{cliente.nome_fantasia || '-'}</dd>
                    
                    <dt className="col-sm-4">CNPJ:</dt>
                    <dd className="col-sm-8">{cliente.cnpj}</dd>
                    
                    <dt className="col-sm-4">Email:</dt>
                    <dd className="col-sm-8">{cliente.email}</dd>
                  </dl>
                </div>
                <div className="col-md-6">
                  <dl className="row">
                    <dt className="col-sm-4">Telefone:</dt>
                    <dd className="col-sm-8">{cliente.telefone || '-'}</dd>
                    
                    <dt className="col-sm-4">WhatsApp:</dt>
                    <dd className="col-sm-8">{cliente.whatsapp || '-'}</dd>
                    
                    <dt className="col-sm-4">Status:</dt>
                    <dd className="col-sm-8">
                      <span className={`badge ${cliente.ativo ? 'bg-success' : 'bg-danger'}`}>
                        {cliente.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </dd>
                    
                    <dt className="col-sm-4">Tipo Cobrança:</dt>
                    <dd className="col-sm-8">
                      <span className="badge bg-info">
                        {cliente.tipo_cobranca === 'carne' ? 'Carnê' : 'Título'}
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Abas para Carnês e Títulos */}
          <div className="card">
            <div className="card-header">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'carnes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('carnes')}
                  >
                    <i className="fas fa-book me-1"></i>
                    Carnês ({carnesData?.data?.length || 0})
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${activeTab === 'titulos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('titulos')}
                  >
                    <i className="fas fa-file-invoice me-1"></i>
                    Títulos ({titulosData?.data?.length || 0})
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {activeTab === 'carnes' ? (
                <DataTable
                  columns={carnesColumns}
                  data={carnesData?.data || []}
                  isLoading={carnesLoading}
                  pagination={carnesData?.pagination}
                  limit={limit}
                  setLimit={setLimit}
                  setPage={setPage}
                  emptyMessage="Nenhum carnê encontrado para este cliente"
                  onRefresh={handleRefreshCarnes}
                  bulkActions={[
                    {
                      label: "Visualizar",
                      action: (selectedItems) => handleTopoActionsCarnes('visualizar', selectedItems)
                    },
                    {
                      label: "Editar",
                      action: (selectedItems) => handleTopoActionsCarnes('editar', selectedItems)
                    },
                    {
                      label: "Imprimir",
                      action: (selectedItems) => handleTopoActionsCarnes('imprimir', selectedItems)
                    }
                  ]}
                />
              ) : (
                <DataTable
                  columns={titulosColumns}
                  data={titulosData?.data || []}
                  isLoading={titulosLoading}
                  pagination={titulosData?.pagination}
                  limit={limit}
                  setLimit={setLimit}
                  setPage={setPage}
                  emptyMessage="Nenhum título encontrado para este cliente"
                  onRefresh={handleRefreshTitulos}
                  bulkActions={[
                    {
                      label: "Marcar como Pago",
                      action: (selectedItems) => handleTopoActionsTitulos('marcar_pago', selectedItems)
                    },
                    {
                      label: "Imprimir",
                      action: (selectedItems) => handleTopoActionsTitulos('imprimir', selectedItems)
                    }
                  ]}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteShow;
