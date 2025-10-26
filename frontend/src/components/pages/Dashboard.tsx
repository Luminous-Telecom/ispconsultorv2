import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClienteService } from '../../services/clienteService';
import { PlanoService } from '../../services/planoService';
import { ContratoService } from '../../services/ContratoService';
import { TituloService } from '../../services/tituloService';
import { useDashboard } from '../../hooks/useDashboard';

// Componente para gráfico de linha temporal com Canvas
const LineChart: React.FC<{ data: any[], title: string, format?: 'currency' | 'number' }> = ({ data, title, format = 'number' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Obter contexto 2D com configuração de alta resolução
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    
    // Obter device pixel ratio para retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Ajustar tamanho do canvas para resolução nativa
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Escalar contexto para device pixel ratio
    ctx.scale(dpr, dpr);
    
    const maxValue = Math.max(...data.map(item => item.valor));
    const chartWidth = rect.width;
    const chartHeight = 120;
    const padding = 20;
    const pointRadius = 3;
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Desenhar linha e pontos
    data.forEach((item, index) => {
      const x = (index / (data.length - 1 || 1)) * (chartWidth - padding * 2) + padding;
      const percentage = maxValue > 0 ? item.valor / maxValue : 0;
      const y = chartHeight - (percentage * chartHeight) + 10;
      
        // Desenhar linha
        if (index === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
          ctx.strokeStyle = '#007bff';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      
      // Desenhar ponto
      ctx.beginPath();
      ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#007bff';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Desenhar valor - ajustar posição para não sair do canvas
      const textY = y - 8;
      const adjustedTextY = textY < 15 ? y + 20 : textY; // Se texto está muito alto, mostrar abaixo
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 0.65rem sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.valor.toString(), x, adjustedTextY);
      
      // Desenhar mês
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.font = '0.55rem sans-serif';
      ctx.fillText(item.mes, x, chartHeight + 28);
    });
  }, [data, format]);
  
  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div className="line-chart-wrapper">
        <canvas 
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '170px' }}
        />
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  // Estados para controlar itens ocultos em cada gráfico
  const [hiddenClientes, setHiddenClientes] = useState<Set<number>>(new Set());
  const [hiddenPlanos, setHiddenPlanos] = useState<Set<number>>(new Set());
  const [hiddenPagamentos, setHiddenPagamentos] = useState<Set<number>>(new Set());
  const [hiddenDistribuicao, setHiddenDistribuicao] = useState<Set<number>>(new Set());
  const [hiddenTaxaPagamento, setHiddenTaxaPagamento] = useState<Set<number>>(new Set());
  const [hiddenContratos, setHiddenContratos] = useState<Set<number>>(new Set());

  // Funções de toggle para cada gráfico
  const toggleCliente = (index: number) => {
    const newHidden = new Set(hiddenClientes);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenClientes(newHidden);
  };

  const togglePlano = (index: number) => {
    const newHidden = new Set(hiddenPlanos);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenPlanos(newHidden);
  };

  const togglePagamento = (index: number) => {
    const newHidden = new Set(hiddenPagamentos);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenPagamentos(newHidden);
  };

  const toggleDistribuicao = (index: number) => {
    const newHidden = new Set(hiddenDistribuicao);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenDistribuicao(newHidden);
  };

  const toggleTaxaPagamento = (index: number) => {
    const newHidden = new Set(hiddenTaxaPagamento);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenTaxaPagamento(newHidden);
  };

  const toggleContratos = (index: number) => {
    const newHidden = new Set(hiddenContratos);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenContratos(newHidden);
  };

  // Queries para buscar dados
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboard();
  
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

  const { data: contratosData, isLoading: loadingContratos } = useQuery({
    queryKey: ['contratos-dashboard'],
    queryFn: () => ContratoService.list({ limit: 1000 }),
    placeholderData: (previousData) => previousData,
  });

  const { data: titulosData } = useQuery({
    queryKey: ['titulos-dashboard'],
    queryFn: () => TituloService.list({ limit: 1000 }),
  });

  // Processar dados
  const clientes = clientesData?.data || [];
  const planos = planosData?.data || [];
  const contratos = contratosData?.data || [];
  const titulos = titulosData?.data || [];
  const stats = dashboardData?.stats;

  // Estatísticas de clientes
  const totalClientes = stats?.totalClientes || clientes.length;
  const clientesAtivos = stats?.clientesAtivos || clientes.filter(c => c.ativo).length;
  const clientesInativos = totalClientes - clientesAtivos;

  // Estatísticas de planos
  const totalPlanos = planos.length;
  const planosAtivos = stats?.planosAtivos || planos.filter(p => p.status === 'ativo').length;
  const planosInativos = totalPlanos - planosAtivos;

  // Estatísticas de contratos
  const totalContratos = contratos.length;
  const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;
  const contratosInativos = contratos.filter(c => c.status === 'inativo').length;
  const contratosSuspensos = contratos.filter(c => c.status === 'suspenso').length;

  // Receitas reais do backend
  const receitaTotal = (stats?.valorTotalRecebido || 0) + (stats?.valorTotalReceber || 0);
  const receitaPaga = stats?.valorTotalRecebido || 0;
  const receitaPendente = stats?.valorTotalReceber || 0;

  // Métricas adicionais (usando dados reais quando disponíveis)
  // Ticket médio mensal = média dos valores de pagamento dos últimos 12 meses
  const ticketMedio = (() => {
    const agora = new Date();
    const valoresMensais: number[] = [];
    
    // Pegar títulos dos últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const dataMes = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const proximoMes = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0);
      
      const titulosMes = titulos.filter(titulo => {
        if (!titulo.data_vencimento) return false;
        const dataVenc = new Date(titulo.data_vencimento);
        return dataVenc >= dataMes && dataVenc <= proximoMes;
      });
      
      const valorMes = titulosMes.reduce((sum, t) => {
        const valor = parseFloat(String(t.valor)) || 0;
        return sum + valor;
      }, 0);
      
      if (valorMes > 0) {
        valoresMensais.push(valorMes);
      }
    }
    
    // Retornar média dos valores mensais
    return valoresMensais.length > 0 
      ? valoresMensais.reduce((a, b) => a + b, 0) / valoresMensais.length 
      : 0;
  })();
  const taxaPagamento = receitaTotal > 0 ? (receitaPaga / receitaTotal) * 100 : 0;
  const receitaPorCliente = totalClientes > 0 ? receitaTotal / totalClientes : 0;

  // Faturamento mensal (últimos 12 meses)
  const getFaturamentoMensal = () => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      
      // Calcular faturamento real do mês baseado nos contratos ativos
      const faturamentoMes = contratos
        .filter(contrato => {
          if (contrato.status !== 'ativo') return false;
          const dataInicio = contrato.data_inicio ? new Date(contrato.data_inicio) : null;
          const dataFim = contrato.data_fim ? new Date(contrato.data_fim) : null;
          
          // Se já começou e não terminou, ou começou neste mês
          const jaComecou = !dataInicio || dataInicio <= data;
          const naoTerminou = !dataFim || dataFim >= new Date(data.getFullYear(), data.getMonth() + 1, 0);
          
          return jaComecou && naoTerminou;
        })
        .reduce((total, contrato) => {
          const valor = parseFloat(String(contrato.valor_final || contrato.plano?.valor_mensal || 0));
          return total + valor;
        }, 0);
      
      meses.push({
        mes: mesAno,
        valor: faturamentoMes,
        color: i === 11 ? '#28a745' : '#6c757d'
      });
    }
    
    return meses;
  };

  // Crescimento de clientes (últimos 12 meses)
  const getCrescimentoClientes = () => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      
      const clientesMes = clientes.filter(cliente => {
        const dataCliente = new Date(cliente.created_at);
        return dataCliente.getMonth() === data.getMonth() && dataCliente.getFullYear() === data.getFullYear();
      }).length;
      
      meses.push({
        mes: mesAno,
        valor: clientesMes,
        color: i === 11 ? '#007bff' : '#6c757d'
      });
    }
    
    return meses;
  };

  // Status de pagamento dos carnês
  const getStatusPagamento = () => {
    return [
      { label: 'Pagos', value: 0, color: '#28a745' },
      { label: 'Pendentes', value: 0, color: '#17a2b8' },
      { label: 'Vencidos', value: 0, color: '#ffc107' },
      { label: 'Cancelados', value: 0, color: '#dc3545' }
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

  // Métricas adicionais (simuladas)
  const getMetricasAdicionais = () => {
    return {
      totalParcelas: 0,
      parcelasPagas: 0,
      parcelasPendentes: 0,
      taxaPagamentoParcelas: 0
    };
  };

  // Análise de clientes por plano
  const getClientesPorPlano = () => {
    // Contar clientes por plano baseado nos contratos
    const contagem = contratos.reduce((acc, contrato) => {
      const planoId = contrato.plano_id;
      if (planoId) {
        acc[planoId] = (acc[planoId] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);
    
    // Incluir todos os planos, mesmo os sem clientes
    const cores = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8'];
    return planos.map((plano, index) => ({
      label: plano.nome_plano,
      value: contagem[plano.id] || 0,
      color: cores[index % cores.length]
    })).sort((a, b) => b.value - a.value);
  };

  // Crescimento de receita (últimos 6 meses)
  const getCrescimentoReceita = () => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const receitaMes = 0; // Simulado
      
      meses.push({
        mes: mesAno,
        valor: receitaMes,
        color: i === 5 ? '#28a745' : '#6c757d'
      });
    }
    
    return meses;
  };

  // Métricas de performance (simuladas)
  const getMetricasPerformance = () => {
    const totalBoletos = 0;
    const boletosVencidos = 0;
    
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

  const ticketMedioChartData = [
    { label: 'Ticket Médio', value: ticketMedio, color: '#6f42c1' }
  ];

  const taxaPagamentoChartData = [
    { label: 'Pago', value: taxaPagamento, color: '#28a745' },
    { label: 'Pendente', value: 100 - taxaPagamento, color: '#ffc107' }
  ];

  const contratosChartData = [
    { label: 'Ativos', value: contratosAtivos, color: '#28a745' },
    { label: 'Inativos', value: contratosInativos, color: '#dc3545' },
    { label: 'Suspensos', value: contratosSuspensos, color: '#ffc107' }
  ];

  // Função para renderizar gráfico de pizza simples
  const renderPieChart = (data: any[], title: string, hiddenItems: Set<number>, onToggleItem: (index: number) => void) => {
    const visibleData = data.filter((_, index) => !hiddenItems.has(index));
    const total = visibleData.reduce((sum, item) => sum + item.value, 0);
    
    // Construir o conic-gradient com todas as fatias
    let currentAngle = 0;
    const gradientStops = visibleData.map(item => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + (percentage * 3.6);
      currentAngle = endAngle;
      
      return `${item.color} ${startAngle}deg ${endAngle}deg`;
    }).join(', ');
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="d-flex align-items-center">
          <div className="pie-chart">
            <div className="pie-slice" style={{
              background: `conic-gradient(${gradientStops})`
            }}>
              <div className="pie-center">
                <span className="pie-total">
                  {title === 'Taxa de Pagamento' ? `${total.toFixed(1)}%` : total}
                </span>
              </div>
            </div>
          </div>
          <div className="chart-legend">
            {data.map((item, index) => (
              <div 
                key={index} 
                className="legend-item" 
                style={{ 
                  cursor: 'pointer',
                  opacity: hiddenItems.has(index) ? 0.5 : 1,
                  textDecoration: hiddenItems.has(index) ? 'line-through' : 'none'
                }}
                onClick={() => onToggleItem(index)}
              >
                <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                <span className="legend-label">
                  {item.label}: {title === 'Taxa de Pagamento' ? `${item.value.toFixed(1)}%` : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar gráfico de barras horizontais
  const renderBarChart = (data: any[], title: string, format: 'currency' | 'number' = 'number') => {
    const maxValue = Math.max(...data.map(item => item.value));
    
    const formatValue = (val: number) => {
      if (format === 'currency') {
        return `R$ ${val.toFixed(2).replace('.', ',')}`;
      }
      return val.toString();
    };
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="bar-chart-horizontal">
          {data.map((item, index) => {
            const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <div key={index} className="bar-item-horizontal">
                <div className="bar-label-horizontal" title={item.label}>{item.label}</div>
                <div className="bar-container-horizontal">
                  <div className="bar-horizontal" style={{
                    width: `${width}%`,
                    backgroundColor: item.color
                  }}>
                    <span className="bar-value-horizontal">{formatValue(item.value)}</span>
                  </div>
                </div>
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
  
  // Função para renderizar gráfico de linha temporal com Canvas
  const renderLineChart = (data: any[], title: string, format: 'currency' | 'number' = 'number') => {
    return <LineChart data={data} title={title} format={format} />;
  };

  if (loadingDashboard || loadingClientes || loadingPlanos || loadingContratos) {
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
      {/* Gráficos de Pizza */}
      <div className="row g-2 mb-2">
        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(clientesChartData, 'Status dos Clientes', hiddenClientes, toggleCliente)}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(planosChartData, 'Status dos Planos', hiddenPlanos, togglePlano)}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(getStatusPagamento(), 'Status dos Pagamentos', hiddenPagamentos, togglePagamento)}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(getDistribuicaoPlanos(), 'Distribuição por Tipo de Plano', hiddenDistribuicao, toggleDistribuicao)}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(taxaPagamentoChartData, 'Taxa de Pagamento', hiddenTaxaPagamento, toggleTaxaPagamento)}
          </div>
        </div>

        <div className="col-xl-2 col-lg-4 col-md-6">
          <div className="chart-card">
            {renderPieChart(contratosChartData, 'Status dos Contratos', hiddenContratos, toggleContratos)}
          </div>
        </div>
      </div>

      {/* Gráficos de Valor */}
      <div className="row g-2 mb-2">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderValueChart(ticketMedioChartData, 'Ticket Médio R$', 'currency')}
          </div>
        </div>
      </div>

      {/* Gráficos Temporais */}
      <div className="row g-2 mb-2">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderLineChart(getFaturamentoMensal(), 'Faturamento Mensal R$ (12 meses)', 'currency')}
          </div>
        </div>

        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderLineChart(getCrescimentoClientes(), 'Novos Clientes (12 meses)', 'number')}
          </div>
        </div>
      </div>



      {/* Gráficos de Valores e Performance */}
      <div className="row g-2 mb-2">
        <div className="col-xl-6 col-lg-6">
          <div className="chart-card">
            {renderBarChart(getClientesPorPlano(), 'Clientes por Plano', 'number')}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;