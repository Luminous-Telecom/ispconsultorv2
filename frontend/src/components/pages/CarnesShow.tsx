import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarneService } from '../../services/carneService';
import { CarneParcelaService } from '../../services/carneParcelaService';
import { useNotification } from '../../hooks/useNotification';

const CarnesShow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useNotification();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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
    queryKey: ['carne-parcelas', id],
    queryFn: () => CarneParcelaService.list({ carne_id: Number(id) }),
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

  const handleDesmarcarPago = async (parcelaId: number) => {
    try {
      await CarneParcelaService.desmarcarPago(parcelaId);
      success('Parcela desmarcada como paga!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', id] });
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao desmarcar parcela como paga');
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

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Carnê #{carne.numero_carne}</h2>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to="/carnes">Carnês</Link>
                  </li>
                  <li className="breadcrumb-item active">Ver Parcelas</li>
                </ol>
              </nav>
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
              {parcelasLoading ? (
                <div className="text-center">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Parcela</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Carnê</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelas.map((parcela: any) => (
                        <tr key={parcela.id}>
                          <td>{parcela.numero_parcela}</td>
                          <td>R$ {Number(parcela.valor_parcela || 0).toFixed(2).replace('.', ',')}</td>
                          <td>{parcela.data_vencimento ? new Date(parcela.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</td>
                          <td>
                            {parcela.pago ? (
                              <span className="badge bg-success">Pago</span>
                            ) : (
                              <span className={`badge ${parcela.status === 'pendente' ? 'bg-warning' : 'bg-danger'}`}>
                                {parcela.status}
                              </span>
                            )}
                          </td>
                          <td>
                            {parcela.charge_id ? (
                              <span className="badge bg-info">Gerado</span>
                            ) : (
                              <span className="badge bg-secondary">Não gerado</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm" role="group">
                              {!parcela.pago && (
                                <button 
                                  type="button" 
                                  className="btn btn-success"
                                  onClick={() => handleMarcarPago(parcela.id)}
                                  title="Marcar como pago"
                                >
                                  <i className="bi bi-check"></i>
                                </button>
                              )}
                              <Link 
                                to={`/carne-parcelas?carne_id=${carne.id}`}
                                className="btn btn-info"
                                title="Ver detalhes"
                              >
                                <i className="bi bi-eye"></i>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarnesShow;
