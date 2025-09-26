import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarneParcelaService } from '../../services/carneParcelaService';
import { CarneService } from '../../services/carneService';
import { getApiUrl } from '../../config/api';
import { useNotificationContext } from '../../contexts/NotificationContext';
import DataTable from '../common/DataTable';

const CarneParcelas: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { carneId: carneIdParam } = useParams<{ carneId: string }>();
  const carneIdFromParams = searchParams.get('carne_id');
  const carneId = carneIdParam || carneIdFromParams;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isRegistering, setIsRegistering] = useState(false);
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  // Buscar parcelas
  const { data: parcelasData, isLoading } = useQuery({
    queryKey: ['carne-parcelas', carneId, search, status, page, limit],
    queryFn: () => CarneParcelaService.list({ 
      carne_id: carneId ? Number(carneId) : undefined, 
      search, 
      status,
      page,
      limit
    }),
    enabled: !!carneId,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
  });

  // Buscar informações do carnê
  const { data: carneData } = useQuery({
    queryKey: ['carne', carneId],
    queryFn: () => CarneService.getById(Number(carneId)),
    enabled: !!carneId,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Mutação para marcar como pago
  const marcarPagoMutation = useMutation({
    mutationFn: (id: number) => CarneParcelaService.marcarPago(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', carneId] });
      queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
      
      // Mostrar notificação de sucesso com mensagem da API
      if (response?.message) {
        success(response.message);
      } else {
        success('Parcela marcada como paga com sucesso!');
      }
      
      // Verificar se foi gerado novo carnê automaticamente
      if (response?.novo_carne_gerado) {
        success(`Novo carnê ${response.novo_carne_gerado.numero_carne} gerado automaticamente!`);
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao marcar parcela como paga');
    }
  });


  const parcelas = parcelasData?.data || [];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-success';
      case 'pendente': return 'bg-warning';
      case 'vencido': return 'bg-danger';
      case 'cancelado': return 'bg-secondary';
      case 'registrado': return 'bg-info';
      case 'ativo': return 'bg-primary';
      case 'parcial': return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago': return 'Pago';
      case 'pendente': return 'Pendente';
      case 'vencido': return 'Vencido';
      case 'cancelado': return 'Cancelado';
      case 'registrado': return 'Registrado';
      case 'ativo': return 'Ativo';
      case 'parcial': return 'Parcial';
      default: return status;
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    // A query será refeita automaticamente devido ao queryKey
  };

  const handleMarcarPago = (parcelaId: number) => {
    if (window.confirm('Deseja marcar esta parcela como paga?')) {
      marcarPagoMutation.mutate(parcelaId);
    }
  };


  const handleRegistrarNoBanco = async () => {
    if (!carneData?.carnet_id) {
      error('Carnê deve ser gerado antes de registrar no banco');
      return;
    }

    if (!window.confirm('Deseja registrar este carnê no banco? Esta ação enviará os dados para a EFI.')) {
      return;
    }

    setIsRegistering(true);
    try {
      // Chamar a API para registrar no banco
      const response = await CarneService.registrarNoBanco(Number(carneId));
      
      // Mostrar notificação de sucesso com mensagem da API
      if (response?.message) {
        success(response.message);
      } else {
        success('Carnê registrado no banco com sucesso!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', carneId] });
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao registrar carnê no banco');
    } finally {
      setIsRegistering(false);
    }
  };

  // Calcular estatísticas
  const totalParcelas = parcelas.length;
  const parcelasPagas = parcelas.filter((p: any) => p.status === 'pago').length;
  const parcelasVencidas = parcelas.filter((p: any) => p.status === 'vencido').length;
  const valorPago = parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + parseFloat(p.valor_parcela), 0);

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (parcela: any) => <code className="text-primary">#{parcela.id}</code>
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
      render: (parcela: any) => (
        <code className="text-info">
          {parcela.charge_id || 'Não gerado'}
        </code>
      )
    },
    {
      key: 'numero_parcela',
      label: 'Parcela',
      render: (parcela: any) => <strong>#{parcela.numero_parcela}</strong>
    },
    {
      key: 'valor_parcela',
      label: 'Valor',
      render: (parcela: any) => (
        <strong>R$ {parcela.valor_parcela ? Number(parcela.valor_parcela).toFixed(2).replace('.', ',') : '0,00'}</strong>
      )
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      render: (parcela: any) => new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')
    },
    {
      key: 'nosso_numero',
      label: 'Nosso Número',
      render: (parcela: any) => (
        <code className="text-primary">
          {parcela.nosso_numero || 'Não gerado'}
        </code>
      )
    },
    {
      key: 'data_pagamento',
      label: 'Pagamento',
      render: (parcela: any) => (
        parcela.data_pagamento ? 
          new Date(parcela.data_pagamento).toLocaleDateString('pt-BR') : 
          '-'
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (parcela: any) => (
        <span className={`badge ${getStatusBadgeClass(parcela.status)}`}>
          {getStatusLabel(parcela.status)}
        </span>
      )
    }
  ];

  // Função para cancelar parcela
  const handleCancelarParcela = async (parcelaId: number) => {
    if (window.confirm('Tem certeza que deseja cancelar esta parcela?')) {
      try {
        const response = await CarneParcelaService.update(parcelaId, { status: 'cancelado' });
        
        // Mostrar notificação de sucesso com mensagem da API
        if (response?.message) {
          success(response.message);
        } else {
          success('Parcela cancelada com sucesso!');
        }
        
        queryClient.invalidateQueries({ queryKey: ['carne-parcelas', carneId] });
        queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
      } catch (err: any) {
        error(err.response?.data?.message || 'Erro ao cancelar parcela');
      }
    }
  };

  // Funções para os botões do topo
  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'marcar_pago':
        if (selectedItems.length === 1) {
          handleMarcarPago(selectedItems[0].id);
        }
        break;
      case 'cancelar':
        if (selectedItems.length === 1) {
          handleCancelarParcela(selectedItems[0].id);
        }
        break;
      case 'imprimir':
        if (selectedItems.length === 1) {
          window.open(getApiUrl(`/boleto/web/${selectedItems[0].id}`), '_blank');
        }
        break;
      case 'editar':
        if (selectedItems.length === 1) {
          navigate(`/carne-parcelas/${selectedItems[0].id}/edit`);
        }
        break;
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className={`btn ${carneData?.status === 'registrado' ? 'btn-success' : 'btn-primary'}`}
            onClick={handleRegistrarNoBanco}
            disabled={!carneData?.carnet_id || isRegistering || carneData?.status === 'registrado'}
          >
            {isRegistering ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Registrando...
              </>
            ) : carneData?.status === 'registrado' ? (
              <>
                <i className="bi bi-check-circle"></i> Registrado no Banco
              </>
            ) : (
              <>
                <i className="bi bi-send"></i> Registrar no Banco
              </>
            )}
          </button>
          <Link to="/carnes" className="btn btn-secondary">
            <i className="bi bi-arrow-left"></i> Voltar para Carnês
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#007bff', textTransform: 'uppercase' }}>
                    Total de Parcelas
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    {totalParcelas}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-list-ol fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2" style={{ borderLeft: '4px solid #28a745' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#28a745', textTransform: 'uppercase' }}>
                    Parcelas Pagas
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    {parcelasPagas}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-check-circle fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-danger shadow h-100 py-2" style={{ borderLeft: '4px solid #dc3545' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-danger text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#dc3545', textTransform: 'uppercase' }}>
                    Parcelas Vencidas
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    {parcelasVencidas}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-exclamation-triangle fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2" style={{ borderLeft: '4px solid #17a2b8' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#17a2b8', textTransform: 'uppercase' }}>
                    Valor Pago
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    R$ {parseFloat(valorPago.toString()).toFixed(2).replace('.', ',')}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-currency-dollar fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Carnê */}
      {carneData && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="card-title mb-0">Informações do Carnê</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <p><strong>ID:</strong> <code className="text-primary">#{carneData.id}</code></p>
                <p><strong>Número do Carnê:</strong> {carneData.numero_carne}</p>
                <p><strong>Cliente:</strong> {carneData.cliente?.razao_social}</p>
                <p><strong>Plano:</strong> {carneData.plano?.nome_plano}</p>
                <p><strong>Banco:</strong> {carneData.banco?.nome}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Valor Total:</strong> R$ {Number(carneData.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                <p><strong>Parcelas:</strong> {carneData.quantidade_parcelas}</p>
                <p><strong>Status:</strong> 
                  <span className={`badge ms-2 ${getStatusBadgeClass(carneData.status)}`}>
                    {getStatusLabel(carneData.status)}
                  </span>
                </p>
                {carneData.carnet_id && (
                  <p><strong>Carnet ID:</strong> <code className="text-info">{carneData.carnet_id}</code></p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleFilter}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="search" className="form-label">Buscar</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="search" 
                    name="search" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Número da parcela ou cliente"
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-3">
                  <label htmlFor="status" className="form-label">Status</label>
                  <select 
                    className="form-select" 
                    id="status" 
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="vencido">Vencido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              <div className="col-md-2">
                <div className="mb-3">
                  <label className="form-label">&nbsp;</label>
                  <div className="d-grid">
                    <button type="submit" className="btn btn-outline-primary">
                      <i className="bi bi-search"></i> Filtrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Tabela de Parcelas */}
      <DataTable
        columns={columns}
        data={parcelasData?.data || []}
        isLoading={isLoading}
        pagination={parcelasData?.pagination}
        limit={limit}
        setLimit={setLimit}
        setPage={setPage}
        emptyMessage="Nenhuma parcela encontrada"
        searchPlaceholder="Buscar parcelas..."
        onSearch={setSearch}
        bulkActions={[
          {
            label: "Marcar como Pago",
            action: (selectedItems) => handleTopoActions('marcar_pago', selectedItems)
          },
          {
            label: "Cancelar",
            action: (selectedItems) => handleTopoActions('cancelar', selectedItems)
          },
          {
            label: "Imprimir",
            action: (selectedItems) => handleTopoActions('imprimir', selectedItems)
          },
          {
            label: "Editar",
            action: (selectedItems) => handleTopoActions('editar', selectedItems)
          }
        ]}
      />
    </>
  );
};

export default CarneParcelas;
