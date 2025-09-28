import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarneService } from '../../services/carneService';
import { CarneParcelaService } from '../../services/carneParcelaService';
import { useNotificationContext } from '../../contexts/NotificationContext';
import DataTable from '../common/DataTable';

const CarnesShow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);

  // Buscar carnê
  const { data: carne, isLoading, error: carneError } = useQuery({
    queryKey: ['carne', id],
    queryFn: () => CarneService.getById(Number(id)),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Buscar parcelas
  const { data: parcelasData, isLoading: parcelasLoading } = useQuery({
    queryKey: ['carne-parcelas', id, page, limit, search],
    queryFn: () => CarneParcelaService.list({ 
      carne_id: Number(id),
      page,
      limit,
      search
    }),
    enabled: !!id,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Mutation para gerar títulos
  const gerarTitulosMutation = useMutation({
    mutationFn: () => CarneService.gerarTitulos(Number(id)),
    onSuccess: (response: any) => {
      success('Títulos gerados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne', id] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', id] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao gerar títulos');
    }
  });

  // Mutation para consultar status
  const consultarStatusMutation = useMutation({
    mutationFn: () => CarneService.consultarStatus(Number(id)),
    onSuccess: (response: any) => {
      success('Status consultado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne', id] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', id] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao consultar status');
    }
  });

  // Mutation para cancelar no banco
  const cancelarNoBancoMutation = useMutation({
    mutationFn: () => CarneService.cancelarNoBanco(Number(id)),
    onSuccess: (response: any) => {
      success('Carnê cancelado no banco com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne', id] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', id] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao cancelar carnê no banco');
    }
  });

  const handleGerarTitulos = async () => {
    if (window.confirm('Gerar carnês individuais para todas as parcelas?')) {
      setIsGenerating(true);
      try {
        await gerarTitulosMutation.mutateAsync();
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleConsultarStatus = async () => {
    setIsConsulting(true);
    try {
      await consultarStatusMutation.mutateAsync();
    } finally {
      setIsConsulting(false);
    }
  };

  const handleCancelarNoBanco = async () => {
    if (window.confirm('Cancelar o carnê no banco (Efí)? Esta ação não pode ser desfeita.')) {
      setIsCanceling(true);
      try {
        await cancelarNoBancoMutation.mutateAsync();
      } finally {
        setIsCanceling(false);
      }
    }
  };

  const handleMarcarPago = async (parcelaId: number) => {
    try {
      await CarneParcelaService.marcarPago(parcelaId);
      success('Parcela marcada como paga!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', id] });
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao marcar parcela como paga');
    }
  };


  const handleRegistrarCarne = async () => {
    if (!carne?.carnet_id) {
      error('Carnê deve ser gerado antes de registrar no banco');
      return;
    }

    setIsRegistering(true);
    try {
      // Aqui será chamada a função que envia o carnê para o banco
      // Por enquanto, vamos simular o processo
      await new Promise(resolve => setTimeout(resolve, 2000));
      success('Carnê registrado no banco com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne', id] });
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao registrar carnê no banco');
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  if (carneError || !carne) {
    return (
      <div className="alert alert-danger">
        <h4>Erro ao carregar carnê</h4>
        <p>{carneError?.message || 'Carnê não encontrado'}</p>
        <Link to="/carnes" className="btn btn-primary">Voltar para Lista</Link>
      </div>
    );
  }

  const parcelas = parcelasData?.data || [];

  // Configurar colunas da tabela
  const columns = [
    {
      key: 'numero_parcela',
      label: 'Parcela',
      sortable: true,
      className: 'col-id'
    },
    {
      key: 'valor_parcela',
      label: 'Valor',
      sortable: true,
      className: 'col-medium',
      render: (item: any) => `R$ ${Number(item.valor_parcela || 0).toFixed(2).replace('.', ',')}`
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      sortable: true,
      className: 'col-medium',
      render: (item: any) => item.data_vencimento ? new Date(item.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : ''
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      className: 'col-small',
      render: (item: any) => {
        if (item.pago) {
          return <span className="badge bg-success">Pago</span>;
        }
        const badgeClass = item.status === 'pendente' ? 'bg-warning' : 'bg-danger';
        return <span className={`badge ${badgeClass}`}>{item.status}</span>;
      }
    },
    {
      key: 'charge_id',
      label: 'Carnê',
      sortable: true,
      className: 'col-small',
      render: (item: any) => {
        if (item.charge_id) {
          return <span className="badge bg-info">Gerado</span>;
        }
        return <span className="badge bg-secondary">Não gerado</span>;
      }
    }
  ];

  // Funções para ações em lote
  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'marcar_pago':
        if (selectedItems.length === 1) {
          handleMarcarPago(selectedItems[0].id);
        }
        break;
      case 'imprimir':
        if (selectedItems.length === 1) {
          window.open(`/boleto/web/${selectedItems[0].id}`, '_blank');
        }
        break;
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Carnê #{carne.numero_carne}</h2>
            </div>
            <div>
              <Link to={`/carnes/${carne.id}/edit`} className="btn btn-warning me-2">
                <i className="bi bi-pencil"></i> Editar
              </Link>
              <Link to="/carnes" className="btn btn-secondary">
                <i className="bi bi-arrow-left"></i> Voltar
              </Link>
            </div>
          </div>

          {/* Informações do Carnê */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Informações do Carnê</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Cliente:</strong> {carne.cliente?.razao_social}</p>
                  <p><strong>Plano:</strong> {carne.plano?.nome_plano}</p>
                  <p><strong>Banco:</strong> {carne.banco?.nome}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Valor Total:</strong> R$ {Number(carne.valor_total || 0).toFixed(2).replace('.', ',')}</p>
                  <p><strong>Parcelas:</strong> {carne.quantidade_parcelas}</p>
                  <p><strong>Status:</strong> 
                    <span className={`badge ms-2 ${carne.status === 'ativo' ? 'bg-success' : 'bg-warning'}`}>
                      {carne.status}
                    </span>
                  </p>
                </div>
              </div>
              
              {carne.carnet_id && (
                <div className="mt-3">
                  <p><strong>Carnet ID:</strong> {carne.carnet_id}</p>
                  {carne.codigo_barras && <p><strong>Código de Barras:</strong> {carne.codigo_barras}</p>}
                  {carne.linha_digitavel && <p><strong>Linha Digitável:</strong> {carne.linha_digitavel}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Gráficos de Estatísticas */}
          <div className="row mb-4">
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Status das Parcelas</h6>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                    <div className="text-center">
                      <div className="pie-chart" style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: `conic-gradient(
                          #28a745 0deg ${(parcelas.filter((p: any) => p.status === 'pago').length / parcelas.length) * 360}deg,
                          #ffc107 ${(parcelas.filter((p: any) => p.status === 'pago').length / parcelas.length) * 360}deg ${((parcelas.filter((p: any) => p.status === 'pago').length + parcelas.filter((p: any) => p.status === 'pendente').length) / parcelas.length) * 360}deg,
                          #dc3545 ${((parcelas.filter((p: any) => p.status === 'pago').length + parcelas.filter((p: any) => p.status === 'pendente').length) / parcelas.length) * 360}deg 360deg
                        )`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        <div className="pie-total" style={{
                          background: 'var(--bg-primary)',
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: 'var(--text-primary)'
                        }}>
                          {parcelas.length}
                        </div>
                      </div>
                      <div className="mt-2">
                        <small className="text-muted">Total de Parcelas</small>
                      </div>
                    </div>
                  </div>
                  <div className="row mt-3">
                    <div className="col-6">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
                        <small>Pagas: {parcelas.filter((p: any) => p.status === 'pago').length}</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#ffc107', borderRadius: '2px' }}></div>
                        <small>Pendentes: {parcelas.filter((p: any) => p.status === 'pendente').length}</small>
                      </div>
                    </div>
                    <div className="col-6 mt-2">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
                        <small>Vencidas: {parcelas.filter((p: any) => p.status === 'vencido').length}</small>
                      </div>
                    </div>
                    <div className="col-6 mt-2">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#6c757d', borderRadius: '2px' }}></div>
                        <small>Canceladas: {parcelas.filter((p: any) => p.status === 'cancelado').length}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Valores por Status</h6>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                    <div className="text-center">
                      <div className="pie-chart" style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: `conic-gradient(
                          #28a745 0deg ${(parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0) / parcelas.reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0)) * 360}deg,
                          #ffc107 ${(parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0) / parcelas.reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0)) * 360}deg ${((parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0) + parcelas.filter((p: any) => p.status === 'pendente').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0)) / parcelas.reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0)) * 360}deg,
                          #dc3545 ${((parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0) + parcelas.filter((p: any) => p.status === 'pendente').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0)) / parcelas.reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0)) * 360}deg 360deg
                        )`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        <div className="pie-total" style={{
                          background: 'var(--bg-primary)',
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                          lineHeight: '1.2'
                        }}>
                          R$ {parcelas.reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      <div className="mt-2">
                        <small className="text-muted">Valor Total</small>
                      </div>
                    </div>
                  </div>
                  <div className="row mt-3">
                    <div className="col-6">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
                        <small>Pago: R$ {parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0).toFixed(2).replace('.', ',')}</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#ffc107', borderRadius: '2px' }}></div>
                        <small>Pendente: R$ {parcelas.filter((p: any) => p.status === 'pendente').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0).toFixed(2).replace('.', ',')}</small>
                      </div>
                    </div>
                    <div className="col-6 mt-2">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
                        <small>Vencido: R$ {parcelas.filter((p: any) => p.status === 'vencido').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0).toFixed(2).replace('.', ',')}</small>
                      </div>
                    </div>
                    <div className="col-6 mt-2">
                      <div className="d-flex align-items-center">
                        <div className="me-2" style={{ width: '12px', height: '12px', backgroundColor: '#6c757d', borderRadius: '2px' }}></div>
                        <small>Cancelado: R$ {parcelas.filter((p: any) => p.status === 'cancelado').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0).toFixed(2).replace('.', ',')}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Parcelas */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Parcelas</h5>
              <div className="btn-group">
                <button 
                  type="button" 
                  className="btn btn-warning btn-sm"
                  onClick={handleGerarTitulos}
                  disabled={isGenerating || gerarTitulosMutation.isPending}
                >
                  {isGenerating || gerarTitulosMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-credit-card"></i> Gerar Carnês Individuais
                    </>
                  )}
                </button>
                
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={handleRegistrarCarne}
                  disabled={!carne.carnet_id || isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Registrando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send"></i> Registrar no Banco
                    </>
                  )}
                </button>
                
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={handleConsultarStatus}
                  disabled={isConsulting || consultarStatusMutation.isPending}
                >
                  {isConsulting || consultarStatusMutation.isPending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Consultando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-clockwise"></i> Consultar Status
                    </>
                  )}
                </button>

                {carne.banco?.tipo_banco === 'efi' && carne.carnet_id && (
                  <button 
                    type="button" 
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleCancelarNoBanco}
                    disabled={isCanceling || cancelarNoBancoMutation.isPending}
                  >
                    {isCanceling || cancelarNoBancoMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-x-octagon"></i> Cancelar
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="card-body">
              <DataTable
                columns={columns}
                data={parcelas}
                isLoading={parcelasLoading}
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
                    label: "Imprimir",
                    action: (selectedItems) => handleTopoActions('imprimir', selectedItems)
                  }
                ]}
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ['carne', id] });
                  queryClient.invalidateQueries({ queryKey: ['carne-parcelas', id] });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarnesShow;
