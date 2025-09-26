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
    return total + (Number(carne.valor_total) || 0);
  }, 0);

  const receitaPaga = carnes.reduce((total, carne) => {
    if (carne.status === 'pago') {
      return total + (Number(carne.valor_total) || 0);
    }
    return total;
  }, 0);

  const receitaPendente = receitaTotal - receitaPaga;

  // Métricas adicionais
  const totalBoletos = carnes.reduce((total, carne) => {
    return total + (carne.quantidade_parcelas || 0);
  }, 0);
  const ticketMedio = totalBoletos > 0 ? receitaTotal / totalBoletos : 0;
  const taxaPagamento = receitaTotal > 0 ? (receitaPaga / receitaTotal) * 100 : 0;
  const carnesPorCliente = totalClientes > 0 ? totalCarnes / totalClientes : 0;
  const receitaPorCliente = totalClientes > 0 ? receitaTotal / totalClientes : 0;

  // Faturamento mensal (últimos 12 meses)
  const getFaturamentoMensal = () => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const faturamentoMes = carnes.reduce((total, carne) => {
        const dataCarne = new Date(carne.created_at);
        if (dataCarne.getMonth() === data.getMonth() && dataCarne.getFullYear() === data.getFullYear()) {
          return total + (Number(carne.valor_total) || 0);
        }
        return total;
      }, 0);
      
      meses.push({
        mes: mesAno,
        valor: faturamentoMes,
        color: i === 11 ? '#28a745' : '#6c757d'
      });
    }
    
    return meses;
  };

  // Crescimento de clientes (últimos 6 meses)
  const getCrescimentoClientes = () => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const clientesMes = clientes.filter(cliente => {
        const dataCliente = new Date(cliente.created_at);
        return dataCliente.getMonth() === data.getMonth() && dataCliente.getFullYear() === data.getFullYear();
      }).length;
      
      meses.push({
        mes: mesAno,
        valor: clientesMes,
        color: i === 5 ? '#007bff' : '#6c757d'
      });
    }
    
    return meses;
  };

  // Status de pagamento dos carnês
  const getStatusPagamento = () => {
    const status = {
      pago: carnes.filter(c => c.status === 'pago').length,
      ativo: carnes.filter(c => c.status === 'ativo').length,
      cancelado: carnes.filter(c => c.status === 'cancelado').length,
      vencido: carnesVencidos
    };
    
    return [
      { label: 'Pagos', value: status.pago, color: '#28a745' },
      { label: 'Ativos', value: status.ativo, color: '#17a2b8' },
      { label: 'Vencidos', value: status.vencido, color: '#ffc107' },
      { label: 'Cancelados', value: status.cancelado, color: '#dc3545' }
    ];
  };

  // Distribuição por tipo de plano
  const getDistribuicaoPlanos = () => {
    const tipos = planos.reduce((acc, plano) => {
      const tipo = plano.tipo_servico || 'Outros';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const cores = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];
    return Object.entries(tipos).map(([tipo, quantidade], index) => ({
      label: tipo,
      value: quantidade,
      color: cores[index % cores.length]
    }));
  };

  // Métricas adicionais
  const getMetricasAdicionais = () => {
    const totalParcelas = carnes.reduce((total, carne) => {
      return total + (carne.quantidade_parcelas || 0);
    }, 0);
    
    const parcelasPagas = carnes.reduce((total, carne) => {
      if (carne.parcelas) {
        return total + carne.parcelas.filter((p: any) => p.status === 'pago').length;
      }
      return total;
    }, 0);
    
    const parcelasPendentes = totalParcelas - parcelasPagas;
    
    return {
      totalParcelas,
      parcelasPagas,
      parcelasPendentes,
      taxaPagamentoParcelas: totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0
    };
  };

  // Análise de valores por plano
  const getValoresPorPlano = () => {
    const valores = planos.reduce((acc, plano) => {
      const valor = parseFloat(String(plano.valor_mensal)) || 0;
      acc[plano.nome_plano] = valor;
      return acc;
    }, {} as Record<string, number>);
    
    const cores = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8'];
    return Object.entries(valores).map(([plano, valor], index) => ({
      label: plano,
      value: valor,
      color: cores[index % cores.length]
    }));
  };

  // Crescimento de receita (últimos 6 meses)
  const getCrescimentoReceita = () => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const receitaMes = carnes.reduce((total, carne) => {
        const dataCarne = new Date(carne.created_at);
        if (dataCarne.getMonth() === data.getMonth() && dataCarne.getFullYear() === data.getFullYear()) {
          return total + (Number(carne.valor_total) || 0);
        }
        return total;
      }, 0);
      
      meses.push({
        mes: mesAno,
        valor: receitaMes,
        color: i === 5 ? '#28a745' : '#6c757d'
      });
    }
    
    return meses;
  };

  // Análise de clientes por status
  const getClientesPorStatus = () => {
    const status = {
      ativo: clientes.filter(c => c.ativo).length,
      inativo: clientes.filter(c => !c.ativo).length
    };
    
    return [
      { label: 'Ativos', value: status.ativo, color: '#28a745' },
      { label: 'Inativos', value: status.inativo, color: '#dc3545' }
    ];
  };

  // Métricas de performance
  const getMetricasPerformance = () => {
    const totalBoletos = carnes.reduce((total, carne) => {
      return total + (carne.quantidade_parcelas || 0);
    }, 0);
    
    const boletosVencidos = carnes.reduce((total, carne) => {
      if (carne.parcelas) {
        return total + carne.parcelas.filter((p: any) => {
          const vencimento = new Date(p.data_vencimento);
          const hoje = new Date();
          return vencimento < hoje && p.status !== 'pago';
        }).length;
      }
      return total;
    }, 0);
    
    const taxaInadimplencia = totalBoletos > 0 ? (boletosVencidos / totalBoletos) * 100 : 0;
    
    return {
      totalBoletos,
      boletosVencidos,
      taxaInadimplencia
    };
  };

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

  const ticketMedioChartData = [
    { label: 'Ticket Médio por Boleto', value: ticketMedio, color: '#6f42c1' }
  ];

  const taxaPagamentoChartData = [
    { label: 'Pago', value: taxaPagamento, color: '#28a745' },
    { label: 'Pendente', value: 100 - taxaPagamento, color: '#ffc107' }
  ];

  const produtividadeChartData = [
    { label: 'Carnês/Cliente', value: carnesPorCliente, color: '#17a2b8' },
    { label: 'Receita/Cliente', value: receitaPorCliente, color: '#6f42c1' }
  ];

  // Função para renderizar gráfico de pizza simples
  const renderPieChart = (data: any[], title: string) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="d-flex align-items-center">
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

  // Função para renderizar gráfico de valor único
  const renderValueChart = (data: any[], title: string, format: 'currency' | 'number' | 'percentage' = 'number') => {
    const value = data[0]?.value || 0;
    
    const formatValue = (val: number) => {
      switch (format) {
        case 'currency':
          return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        case 'percentage':
          return `${val.toFixed(1)}%`;
        default:
          return val.toFixed(1);
      }
    };
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="value-chart">
          <div className="value-display" style={{ color: data[0]?.color || '#6f42c1' }}>
            {formatValue(value)}
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar gráfico de linha temporal
  const renderLineChart = (data: any[], title: string, format: 'currency' | 'number' = 'number') => {
    const maxValue = Math.max(...data.map(item => item.valor));
    
    const formatValue = (val: number) => {
      switch (format) {
        case 'currency':
          return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
        default:
          return val.toString();
      }
    };
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="line-chart">
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.valor / maxValue) * 100 : 0;
            return (
              <div key={index} className="line-item">
                <div className="line-bar" style={{
                  height: `${height}%`,
                  backgroundColor: item.color
                }}></div>
                <div className="line-label">{item.mes}</div>
                <div className="line-value">{formatValue(item.valor)}</div>
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
      <div className="row g-2 mb-2">
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
      <div className="row g-2 mb-2">
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

      {/* Gráficos de Pizza - 6 em linha */}
      <div className="row g-2 mb-2">
        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(clientesChartData, 'Status dos Clientes')}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(planosChartData, 'Status dos Planos')}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(carnesChartData, 'Status dos Carnês')}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(getStatusPagamento(), 'Status dos Pagamentos')}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(getDistribuicaoPlanos(), 'Distribuição por Tipo de Plano')}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(getClientesPorStatus(), 'Clientes por Status')}
          </div>
        </div>
      </div>


      {/* Novos Gráficos */}
      <div className="row g-2 mb-2">
        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderValueChart(ticketMedioChartData, 'Ticket Médio por Boleto', 'currency')}
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderPieChart(taxaPagamentoChartData, 'Taxa de Pagamento')}
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Carnês/Cliente', value: carnesPorCliente, color: '#17a2b8' }], 'Carnês por Cliente', 'number')}
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Receita/Cliente', value: receitaPorCliente, color: '#6f42c1' }], 'Receita por Cliente', 'currency')}
          </div>
        </div>
      </div>

      {/* Gráficos Temporais */}
      <div className="row g-2 mb-2">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderLineChart(getFaturamentoMensal(), 'Faturamento Mensal (12 meses)', 'currency')}
          </div>
        </div>

        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderLineChart(getCrescimentoClientes(), 'Novos Clientes (6 meses)', 'number')}
          </div>
        </div>
      </div>


      {/* Novos Gráficos Adicionais */}
      <div className="row g-2 mb-2">
        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Total Parcelas', value: getMetricasAdicionais().totalParcelas, color: '#17a2b8' }], 'Total de Parcelas', 'number')}
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Parcelas Pagas', value: getMetricasAdicionais().parcelasPagas, color: '#28a745' }], 'Parcelas Pagas', 'number')}
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Parcelas Pendentes', value: getMetricasAdicionais().parcelasPendentes, color: '#ffc107' }], 'Parcelas Pendentes', 'number')}
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Taxa Pagamento', value: getMetricasAdicionais().taxaPagamentoParcelas, color: '#6f42c1' }], 'Taxa de Pagamento Parcelas', 'percentage')}
          </div>
        </div>
      </div>

      {/* Gráficos de Valores e Performance */}
      <div className="row g-2 mb-2">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderBarChart(getValoresPorPlano(), 'Valores por Plano')}
          </div>
        </div>

        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderLineChart(getCrescimentoReceita(), 'Crescimento de Receita (6 meses)', 'currency')}
          </div>
        </div>
      </div>

      {/* Gráficos de Performance e Análise */}
      <div className="row g-2 mb-2">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Total Boletos', value: getMetricasPerformance().totalBoletos, color: '#007bff' }], 'Total de Boletos', 'number')}
          </div>
        </div>

        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderValueChart([{ label: 'Taxa Inadimplência', value: getMetricasPerformance().taxaInadimplencia, color: '#dc3545' }], 'Taxa de Inadimplência', 'percentage')}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;