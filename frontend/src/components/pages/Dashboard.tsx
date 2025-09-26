import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClienteService } from '../../services/clienteService';
import { PlanoService } from '../../services/planoService';
import { CarneService } from '../../services/carneService';

const Dashboard: React.FC = () => {
  const [chartData, setChartData] = useState<any>(null);

  // Queries para buscar dados
  const { data: clientesData, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes-dashboard'],
    queryFn: () => ClienteService.list({ limit: 1000 }),
    placeholderData: (previousData) => previousData,
  });

  const { data: planosData, isLoading: loadingPlanos } = useQuery({
    queryKey: ['planos-dashboard'],
    queryFn: () => PlanoService.list({ limit: 1000 }),
    placeholderData: (previousData) => previousData,
  });

  const { data: carnesData, isLoading: loadingCarnes } = useQuery({
    queryKey: ['carnes-dashboard'],
    queryFn: () => CarneService.list({ limit: 1000 }),
    placeholderData: (previousData) => previousData,
  });

  // Processar dados
  const clientes = clientesData?.data || [];
  const planos = planosData?.data || [];
  const carnes = carnesData?.data || [];

  // Estatísticas de clientes
  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter(c => c.ativo).length;
  const clientesInativos = totalClientes - clientesAtivos;

  // Estatísticas de planos
  const totalPlanos = planos.length;
  const planosAtivos = planos.filter(p => p.status === 'ativo').length;
  const planosInativos = totalPlanos - planosAtivos;

  // Estatísticas de carnês
  const totalCarnes = carnes.length;
  const carnesAtivos = carnes.filter(c => c.status === 'ativo').length;
  const carnesPagos = carnes.filter(c => c.status === 'pago').length;
  const carnesVencidos = carnes.filter(c => {
    if (!c.parcelas) return false;
    return c.parcelas.some((p: any) => {
      const vencimento = new Date(p.data_vencimento);
      const hoje = new Date();
      return vencimento < hoje && p.status !== 'pago';
    });
  }).length;

  // Receitas
  const receitaTotal = carnes.reduce((total, carne) => {
    return total + (parseFloat(carne.valor_total) || 0);
  }, 0);

  const receitaPaga = carnes.reduce((total, carne) => {
    if (carne.status === 'pago') {
      return total + (parseFloat(carne.valor_total) || 0);
    }
    return total;
  }, 0);

  const receitaPendente = receitaTotal - receitaPaga;

  // Carnês em atraso (últimos 10)
  const carnesAtraso = carnes.filter(carne => {
    if (!carne.parcelas) return false;
    return carne.parcelas.some((p: any) => {
      const vencimento = new Date(p.data_vencimento);
      const hoje = new Date();
      return vencimento < hoje && p.status !== 'pago';
    });
  }).slice(0, 10);

  // Dados para gráficos
  const clientesChartData = [
    { label: 'Ativos', value: clientesAtivos, color: '#28a745' },
    { label: 'Inativos', value: clientesInativos, color: '#dc3545' }
  ];

  const planosChartData = [
    { label: 'Ativos', value: planosAtivos, color: '#007bff' },
    { label: 'Inativos', value: planosInativos, color: '#6c757d' }
  ];

  const carnesChartData = [
    { label: 'Ativos', value: carnesAtivos, color: '#17a2b8' },
    { label: 'Pagos', value: carnesPagos, color: '#28a745' },
    { label: 'Vencidos', value: carnesVencidos, color: '#ffc107' }
  ];

  const receitasChartData = [
    { label: 'Recebido', value: receitaPaga, color: '#28a745' },
    { label: 'Pendente', value: receitaPendente, color: '#ffc107' }
  ];

  // Função para renderizar gráfico de pizza simples
  const renderPieChart = (data: any[], title: string) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="pie-chart">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={index} className="pie-slice" style={{
                background: `conic-gradient(${item.color} 0deg ${percentage * 3.6}deg, transparent ${percentage * 3.6}deg)`
              }}>
                <div className="pie-center">
                  <span className="pie-total">{total}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="chart-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: item.color }}></div>
              <span className="legend-label">{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Função para renderizar gráfico de barras
  const renderBarChart = (data: any[], title: string) => {
    const maxValue = Math.max(...data.map(item => item.value));
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="bar-chart">
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <div key={index} className="bar-item">
                <div className="bar" style={{
                  height: `${height}%`,
                  backgroundColor: item.color
                }}></div>
                <div className="bar-label">{item.label}</div>
                <div className="bar-value">{item.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loadingClientes || loadingPlanos || loadingCarnes) {
    return (
      <div className="dashboard-container">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Cards de Métricas Principais */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="metric-card metric-card-primary">
            <div className="metric-icon">
              <i className="bi bi-people"></i>
            </div>
            <div className="metric-content">
              <div className="metric-number">{totalClientes}</div>
              <div className="metric-label">Total de Clientes</div>
              <div className="metric-detail">
                <span className="text-success">{clientesAtivos} ativos</span>
                <span className="text-muted"> • </span>
                <span className="text-danger">{clientesInativos} inativos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="metric-card metric-card-info">
            <div className="metric-icon">
              <i className="bi bi-wifi"></i>
            </div>
            <div className="metric-content">
              <div className="metric-number">{totalPlanos}</div>
              <div className="metric-label">Total de Planos</div>
              <div className="metric-detail">
                <span className="text-success">{planosAtivos} ativos</span>
                <span className="text-muted"> • </span>
                <span className="text-muted">{planosInativos} inativos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="metric-card metric-card-success">
            <div className="metric-icon">
              <i className="bi bi-receipt"></i>
            </div>
            <div className="metric-content">
              <div className="metric-number">{totalCarnes}</div>
              <div className="metric-label">Total de Carnês</div>
              <div className="metric-detail">
                <span className="text-info">{carnesAtivos} ativos</span>
                <span className="text-muted"> • </span>
                <span className="text-success">{carnesPagos} pagos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6">
          <div className="metric-card metric-card-warning">
            <div className="metric-icon">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <div className="metric-content">
              <div className="metric-number">{carnesVencidos}</div>
              <div className="metric-label">Carnês Vencidos</div>
              <div className="metric-detail">
                <span className="text-warning">Em atraso</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Receitas */}
      <div className="row g-4 mb-4">
        <div className="col-xl-4 col-md-6">
          <div className="revenue-card revenue-total">
            <div className="revenue-icon">
              <i className="bi bi-currency-dollar"></i>
            </div>
            <div className="revenue-content">
              <div className="revenue-number">R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="revenue-label">Receita Total</div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6">
          <div className="revenue-card revenue-received">
            <div className="revenue-icon">
              <i className="bi bi-check-circle"></i>
            </div>
            <div className="revenue-content">
              <div className="revenue-number">R$ {receitaPaga.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="revenue-label">Receita Recebida</div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-md-6">
          <div className="revenue-card revenue-pending">
            <div className="revenue-icon">
              <i className="bi bi-clock"></i>
            </div>
            <div className="revenue-content">
              <div className="revenue-number">R$ {receitaPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div className="revenue-label">Receita Pendente</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="row g-4 mb-4">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderPieChart(clientesChartData, 'Status dos Clientes')}
          </div>
        </div>

        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderPieChart(planosChartData, 'Status dos Planos')}
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderPieChart(carnesChartData, 'Status dos Carnês')}
          </div>
        </div>

        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderBarChart(receitasChartData, 'Distribuição de Receitas')}
          </div>
        </div>
      </div>

      {/* Tabela de Carnês em Atraso */}
      <div className="row g-4">
        <div className="col-12">
          <div className="table-card">
            <div className="table-header">
              <h5 className="table-title">Carnês em Atraso</h5>
              <span className="badge bg-warning">{carnesAtraso.length} em atraso</span>
            </div>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Cliente</th>
                    <th>Valor Total</th>
                    <th>Parcelas Vencidas</th>
                    <th>Último Vencimento</th>
                    <th>Dias em Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {carnesAtraso.length > 0 ? (
                    carnesAtraso.map((carne: any) => {
                      const parcelasVencidas = carne.parcelas?.filter((p: any) => {
                        const vencimento = new Date(p.data_vencimento);
                        const hoje = new Date();
                        return vencimento < hoje && p.status !== 'pago';
                      }) || [];

                      const ultimoVencimento = parcelasVencidas.length > 0 
                        ? new Date(Math.max(...parcelasVencidas.map((p: any) => new Date(p.data_vencimento))))
                        : null;

                      const diasAtraso = ultimoVencimento 
                        ? Math.floor((new Date().getTime() - ultimoVencimento.getTime()) / (1000 * 60 * 60 * 24))
                        : 0;

                      return (
                        <tr key={carne.id}>
                          <td><code>#{carne.numero_carne}</code></td>
                          <td>{carne.cliente?.razao_social || 'N/A'}</td>
                          <td>R$ {parseFloat(carne.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td><span className="badge bg-danger">{parcelasVencidas.length}</span></td>
                          <td>{ultimoVencimento ? ultimoVencimento.toLocaleDateString('pt-BR') : 'N/A'}</td>
                          <td>
                            <span className={`badge ${diasAtraso > 30 ? 'bg-danger' : diasAtraso > 15 ? 'bg-warning' : 'bg-info'}`}>
                              {diasAtraso} dias
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">
                        Nenhum carnê em atraso
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;