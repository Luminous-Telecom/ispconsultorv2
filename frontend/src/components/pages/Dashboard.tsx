import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClienteService } from '../../services/clienteService';
import { PlanoService } from '../../services/planoService';
import { CarneService } from '../../services/carneService';

const Dashboard: React.FC = () => {
  // Query para buscar estatísticas
  const { data: clientesData } = useQuery({
    queryKey: ['clientes-count'],
    queryFn: () => ClienteService.list({ limit: 1 }),
    placeholderData: (previousData) => previousData,
  });

  const { data: planosData } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.findAtivos(),
    placeholderData: (previousData) => previousData,
  });

  const { data: carnesData } = useQuery({
    queryKey: ['carnes-ativos'],
    queryFn: () => CarneService.findAtivos(),
    placeholderData: (previousData) => previousData,
  });

  const { data: carnesRecentesData } = useQuery({
    queryKey: ['carnes-recentes'],
    queryFn: () => CarneService.list({ limit: 5 }),
    placeholderData: (previousData) => previousData,
  });

  const totalClientes = clientesData?.pagination?.total || 0;
  const planosAtivos = Array.isArray(planosData) ? planosData.length : 0;
  const carnesAtivos = Array.isArray(carnesData) ? carnesData.length : 0;
  const carnesRecentes = carnesRecentesData?.data || [];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-success';
      case 'cancelado': return 'bg-danger';
      default: return 'bg-warning';
    }
  };

  return (
    <>
      <div className="row">
        {/* Cards de Estatísticas */}
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #007bff' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#007bff', textTransform: 'uppercase' }}>
                    Total de Clientes
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    {totalClientes}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-people fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #28a745' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#28a745', textTransform: 'uppercase' }}>
                    Planos Ativos
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    {planosAtivos}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-wifi fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #17a2b8' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#17a2b8', textTransform: 'uppercase' }}>
                    Carnês Ativos
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    {carnesAtivos}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-receipt fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #ffc107' }}>
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ffc107', textTransform: 'uppercase' }}>
                    Parcelas Vencidas
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#5a5c69' }}>
                    0
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-exclamation-triangle fa-2x text-gray-300" style={{ fontSize: '2rem', color: '#dddfeb' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Carnês Recentes */}
        <div className="col-lg-8 mb-4">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Carnês Recentes</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered" width="100%" cellSpacing="0">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Cliente</th>
                      <th>Valor Total</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carnesRecentes.length > 0 ? (
                      carnesRecentes.map((carne: any) => (
                        <tr key={carne.id}>
                          <td>{carne.numero_carne}</td>
                          <td>{carne.cliente?.razao_social || 'N/A'}</td>
                          <td>R$ {carne.valor_total ? parseFloat(carne.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(carne.status)}`}>
                              {carne.status ? carne.status.charAt(0).toUpperCase() + carne.status.slice(1) : 'Desconhecido'}
                            </span>
                          </td>
                          <td>{new Date(carne.created_at).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center">Nenhum carnê encontrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="col-lg-4 mb-4">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Ações Rápidas</h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <Link to="/clientes/create" className="btn btn-primary">
                  <i className="bi bi-person-plus"></i> Novo Cliente
                </Link>
                <Link to="/planos/create" className="btn btn-success">
                  <i className="bi bi-wifi"></i> Novo Plano
                </Link>
                <Link to="/carnes/create" className="btn btn-info">
                  <i className="bi bi-receipt"></i> Gerar Carnê
                </Link>
                <Link to="/bancos/create" className="btn btn-warning">
                  <i className="bi bi-bank"></i> Novo Banco
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;