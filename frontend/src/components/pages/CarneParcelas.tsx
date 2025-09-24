import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarneParcelaService } from '../../services/carneParcelaService';
import { CarneService } from '../../services/carneService';
import { getApiUrl } from '../../config/api';
import { useNotification } from '../../hooks/useNotification';

const CarneParcelas: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const carneId = searchParams.get('carne_id');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const queryClient = useQueryClient();
  const { success, error } = useNotification();

  // Buscar parcelas
  const { data: parcelasData, isLoading } = useQuery({
    queryKey: ['carne-parcelas', carneId, search, status],
    queryFn: () => CarneParcelaService.list({ carne_id: carneId ? Number(carneId) : undefined, search, status }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
    }
  });

  // Mutação para desmarcar pagamento
  const desmarcarPagoMutation = useMutation({
    mutationFn: (id: number) => CarneParcelaService.desmarcarPago(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
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

  const handleDesmarcarPago = (parcelaId: number) => {
    if (window.confirm('Deseja desmarcar o pagamento desta parcela?')) {
      desmarcarPagoMutation.mutate(parcelaId);
    }
  };

  const handleImprimirBoleto = async (parcelaId: number) => {
    try {
      window.open(getApiUrl(`/boleto/web/${parcelaId}`), '_blank');
    } catch (error) {
      console.error('Erro ao imprimir boleto:', error);
    }
  };

  const handleGerarPdfBoleto = async (parcelaId: number) => {
    try {
      const htmlContent = await CarneParcelaService.gerarPdfBoleto(parcelaId);
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Erro ao gerar PDF do boleto:', error);
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
      // Aqui será chamada a função que envia o carnê para o banco
      // Por enquanto, vamos simular o processo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualizar o status do carnê para 'registrado'
      // Em uma implementação real, isso seria feito via API
      success('Carnê registrado no banco com sucesso!');
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
  const valorTotal = parcelas.reduce((sum: number, p: any) => sum + parseFloat(p.valor_parcela), 0);
  const valorPago = parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + parseFloat(p.valor_parcela), 0);

  return (
    <>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 className="h2">Parcelas do Carnê</h1>
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
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Nosso Número</th>
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                      </div>
                    </td>
                  </tr>
                ) : parcelas.length > 0 ? (
                  parcelas.map((parcela: any) => (
                    <tr key={parcela.id}>
                      <td>
                        <strong>#{parcela.numero_parcela}</strong>
                      </td>
                      <td>
                        <strong>R$ {parseFloat(parcela.valor_parcela).toFixed(2).replace('.', ',')}</strong>
                      </td>
                      <td>{new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <code className="text-primary">
                          {parcela.nosso_numero || 'Não gerado'}
                        </code>
                      </td>
                      <td>
                        {parcela.data_pagamento ? 
                          new Date(parcela.data_pagamento).toLocaleDateString('pt-BR') : 
                          '-'
                        }
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(parcela.status)}`}>
                          {getStatusLabel(parcela.status)}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          {parcela.status === 'pendente' && (
                            <button 
                              type="button" 
                              className="btn btn-outline-success"
                              title="Marcar como Pago"
                              onClick={() => handleMarcarPago(parcela.id)}
                              disabled={marcarPagoMutation.isPending}
                            >
                              <i className="bi bi-check"></i>
                            </button>
                          )}
                          <button 
                            type="button" 
                            className="btn btn-outline-primary"
                            title="Imprimir Boleto"
                            onClick={() => window.open(getApiUrl(`/boleto/web/${parcela.id}`), '_blank')}
                          >
                            <i className="bi bi-printer"></i>
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-outline-warning"
                            title="Editar Parcela"
                            onClick={() => navigate(`/carne-parcelas/${parcela.id}/edit`)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center">Nenhuma parcela encontrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="d-flex justify-content-center mt-3">
            <nav aria-label="Paginação de parcelas">
              <ul className="pagination">
                <li className="page-item disabled">
                  <span className="page-link">Anterior</span>
                </li>
                <li className="page-item active">
                  <span className="page-link">1</span>
                </li>
                <li className="page-item">
                  <span className="page-link">Próximo</span>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default CarneParcelas;
