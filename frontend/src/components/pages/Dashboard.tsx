import React from 'react';
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

  const totalClientes = clientesData?.pagination?.total || 0;
  const planosAtivos = Array.isArray(planosData) ? planosData.length : 0;
  const carnesAtivos = Array.isArray(carnesData) ? carnesData.length : 0;

  return (
    <div className="dashboard-container">
      <div className="row g-4">
        {/* Cards de Estatísticas - Apenas Números */}
        <div className="col-xl-3 col-md-6">
          <div className="stat-card stat-card-primary">
            <div className="stat-number">{totalClientes}</div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="stat-card stat-card-success">
            <div className="stat-number">{planosAtivos}</div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="stat-card stat-card-info">
            <div className="stat-number">{carnesAtivos}</div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="stat-card stat-card-warning">
            <div className="stat-number">0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;