import React, { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../../hooks/useDashboard';

interface ChartDataItem {
  valor?: number;
  value?: number;
  label?: string;
  color?: string;
  mes?: string;
  [key: string]: string | number | undefined;
}

// Componente para gráfico de linha temporal com Canvas
const LineChart: React.FC<{ data: ChartDataItem[], title: string, format?: 'currency' | 'number' }> = ({ data, title, format = 'number' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hasData = data.length > 0;

  useEffect(() => {
    if (!hasData) return;

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

    const maxValue = Math.max(...data.map(item => item.valor || 0));
    const chartWidth = rect.width;
    const chartHeight = 120;
    const padding = 20;
    const pointRadius = 3;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Desenhar linha e pontos
    data.forEach((item, index) => {
      const x = (index / (data.length - 1 || 1)) * (chartWidth - padding * 2) + padding;
      const val = item.valor || 0;
      const percentage = maxValue > 0 ? val / maxValue : 0;
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
      ctx.fillText(val.toString(), x, adjustedTextY);

      // Desenhar mês
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.font = '0.55rem sans-serif';
      ctx.fillText(item.mes || '', x, chartHeight + 28);
    });
  }, [data, format, hasData]);

  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div className="line-chart-wrapper">
        {hasData ? (
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '170px' }}
          />
        ) : (
          <div className="chart-empty">Sem dados disponíveis</div>
        )}
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

  const formatCurrency = (valor: number): string => valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

  const formatNumber = (valor: number): string => valor.toLocaleString('pt-BR');

  // Query única para buscar todos os dados do dashboard
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboard();

  // Processar dados vindos do backend
  const clientes = dashboardData?.clientes || [];
  const planos = dashboardData?.planos || [];
  const contratos = dashboardData?.contratos || [];
  const titulos = dashboardData?.titulos || [];
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
  const _totalContratos = contratos.length;
  const contratosAtivos = contratos.filter(c => c.status === 'ativo').length;
  const contratosInativos = contratos.filter(c => c.status === 'inativo').length;
  const contratosSuspensos = contratos.filter(c => c.status === 'suspenso').length;

  // Receitas reais do backend
  const receitaTotal = (stats?.valorTotalRecebido || 0) + (stats?.valorTotalReceber || 0);
  const receitaPaga = stats?.valorTotalRecebido || 0;
  const _receitaPendente = stats?.valorTotalReceber || 0;

  // Métricas adicionais (usando dados reais quando disponíveis)
  // Ticket médio = valor total recebido / clientes ativos
  const ticketMedio = clientesAtivos > 0 ? receitaPaga / clientesAtivos : 0;
  const taxaPagamento = receitaTotal > 0 ? (receitaPaga / receitaTotal) * 100 : 0;
  const _receitaPorCliente = totalClientes > 0 ? receitaTotal / totalClientes : 0;

  const agora = new Date();
  const lastUpdatedDate = agora.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
  });
  const lastUpdatedTime = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const receitaMensalChartData: ChartDataItem[] = dashboardData?.receitaUltimosMeses
    ? dashboardData.receitaUltimosMeses.labels.map((label, index) => ({
        mes: label,
        valor: dashboardData.receitaUltimosMeses.data[index] ?? 0,
        color:
          index === (dashboardData.receitaUltimosMeses.data.length - 1)
            ? '#28a745'
            : '#6c757d',
      }))
    : [];

  const receberMesAtualChartData: ChartDataItem[] = dashboardData?.aReceberMesAtual
    ? dashboardData.aReceberMesAtual.labels.map((label, index) => ({
        mes: label,
        valor: dashboardData.aReceberMesAtual.data[index] ?? 0,
        color: '#17a2b8',
      }))
    : [];

  // Crescimento de clientes (últimos 12 meses)
  const getCrescimentoClientes = () => {
    const meses = [];
    const hoje = new Date();

    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;

      const clientesMes = clientes.filter(cliente => {
        if (!cliente.created_at) return false;
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

  // Status de pagamento dos títulos
  const getStatusPagamento = () => {
    const titulosPagos = titulos.filter(t => t.status === 'pago').length;
    const titulosPendentes = titulos.filter(t => t.status === 'pendente').length;
    const titulosVencidosCount = titulos.filter(t => t.status === 'vencido').length;
    const titulosCancelados = titulos.filter(t => t.status === 'cancelado').length;

    return [
      { label: 'Pagos', value: titulosPagos, color: '#28a745' },
      { label: 'Pendentes', value: titulosPendentes, color: '#17a2b8' },
      { label: 'Vencidos', value: titulosVencidosCount, color: '#ffc107' },
      { label: 'Cancelados', value: titulosCancelados, color: '#dc3545' }
    ].filter(item => item.value > 0);
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



  // Dados para gráficos
  const statusPagamentoData = getStatusPagamento();
  const titulosPendentesCount = statusPagamentoData.find(item => item.label === 'Pendentes')?.value || 0;
  const titulosVencidosCount = statusPagamentoData.find(item => item.label === 'Vencidos')?.value || 0;
  const totalTitulosEmAberto = titulosPendentesCount + titulosVencidosCount;

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
  const renderPieChart = (data: ChartDataItem[], title: string, hiddenItems: Set<number>, onToggleItem: (index: number) => void) => {
    const visibleData = data.filter((_, index) => !hiddenItems.has(index));
    const total = visibleData.reduce((sum, item) => sum + (item.value || 0), 0);

    // Construir o conic-gradient com todas as fatias
    let currentAngle = 0;
    const gradientStops = visibleData.map(item => {
      const percentage = total > 0 ? ((item.value || 0) / total) * 100 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + (percentage * 3.6);
      currentAngle = endAngle;

      return `${item.color || '#6c757d'} ${startAngle}deg ${endAngle}deg`;
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
                <div className="legend-color" style={{ backgroundColor: item.color || '#6c757d' }}></div>
                <span className="legend-label">
                  {item.label}: {title === 'Taxa de Pagamento' ? `${(item.value || 0).toFixed(1)}%` : (item.value || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar gráfico de barras horizontais
  const renderBarChart = (data: ChartDataItem[], title: string, format: 'currency' | 'number' = 'number') => {
    const maxValue = Math.max(...data.map(item => item.value || 0));

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
            const width = maxValue > 0 ? ((item.value || 0) / maxValue) * 100 : 0;
            return (
              <div key={index} className="bar-item-horizontal">
                <div className="bar-label-horizontal" title={item.label}>{item.label}</div>
                <div className="bar-container-horizontal">
                  <div className="bar-horizontal" style={{
                    width: `${width}%`,
                    backgroundColor: item.color || '#6c757d'
                  }}>
                    <span className="bar-value-horizontal">{formatValue(item.value || 0)}</span>
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
  const renderValueChart = (data: ChartDataItem[], title: string, format: 'currency' | 'number' | 'percentage' = 'number') => {
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
  const renderLineChart = (data: ChartDataItem[], title: string, format: 'currency' | 'number' = 'number') => {
    return <LineChart data={data} title={title} format={format} />;
  };

  if (loadingDashboard) {
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
      <div className="container-fluid px-0">
        <div className="dashboard-hero card border-0 text-white mb-4">
          <div className="card-body p-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              <div>
                <span className="dashboard-badge text-uppercase">Visão geral</span>
                <h2 className="dashboard-hero-title mb-2">Painel financeiro e operacional</h2>
                <p className="dashboard-hero-subtitle mb-0">Atualizado em {lastUpdatedDate} às {lastUpdatedTime}</p>
              </div>
              <div className="d-flex flex-wrap gap-3">
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Faturamento total</span>
                  <strong className="dashboard-hero-value">{formatCurrency(receitaTotal)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Receita recebida</span>
                  <strong className="dashboard-hero-value">{formatCurrency(receitaPaga)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Receita pendente</span>
                  <strong className="dashboard-hero-value">{formatCurrency(stats?.valorTotalReceber || 0)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Clientes ativos</span>
                  <strong className="dashboard-hero-value">{formatNumber(clientesAtivos)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section mb-4">
          <div className="dashboard-section-header d-flex align-items-center justify-content-between">
            <h5 className="dashboard-section-title mb-0">Indicadores rápidos</h5>
            <span className="dashboard-section-subtitle">Monitoramento dinâmico dos principais números da operação</span>
          </div>
          <div className="row g-3">
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="metric-card metric-card-primary shadow-sm">
                <div className="metric-icon">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="metric-content">
                  <span className="metric-label d-block text-muted text-uppercase">Clientes ativos</span>
                  <strong className="metric-value">{formatNumber(clientesAtivos)}</strong>
                  <small className="metric-caption text-muted">de {formatNumber(totalClientes)} clientes cadastrados</small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="metric-card metric-card-warning shadow-sm">
                <div className="metric-icon">
                  <i className="bi bi-receipt-cutoff"></i>
                </div>
                <div className="metric-content">
                  <span className="metric-label d-block text-muted text-uppercase">Títulos em aberto</span>
                  <strong className="metric-value">{formatNumber(totalTitulosEmAberto)}</strong>
                  <small className="metric-caption text-muted">{formatNumber(titulosPendentesCount)} pendentes e {formatNumber(titulosVencidosCount)} vencidos</small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="metric-card metric-card-success shadow-sm">
                <div className="metric-icon">
                  <i className="bi bi-cash-stack"></i>
                </div>
                <div className="metric-content">
                  <span className="metric-label d-block text-muted text-uppercase">Ticket médio</span>
                  <strong className="metric-value">{formatCurrency(ticketMedio || 0)}</strong>
                  <small className="metric-caption text-muted">Base calculada sobre clientes ativos</small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-lg-6 col-md-6">
              <div className="metric-card metric-card-info shadow-sm">
                <div className="metric-icon">
                  <i className="bi bi-graph-up"></i>
                </div>
                <div className="metric-content">
                  <span className="metric-label d-block text-muted text-uppercase">Taxa de pagamento</span>
                  <strong className="metric-value">{taxaPagamento.toFixed(1)}%</strong>
                  <small className="metric-caption text-muted">Pagamentos confirmados no período</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section mb-4">
          <div className="dashboard-section-header d-flex align-items-center justify-content-between">
            <h5 className="dashboard-section-title mb-0">Distribuição e status</h5>
            <span className="dashboard-section-subtitle">Clique na legenda para exibir ou ocultar segmentos</span>
          </div>
          <div className="row g-3">
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
                {renderPieChart(statusPagamentoData, 'Status dos Pagamentos', hiddenPagamentos, togglePagamento)}
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
        </div>

        <div className="dashboard-section mb-4">
          <div className="dashboard-section-header d-flex align-items-center justify-content-between">
            <h5 className="dashboard-section-title mb-0">Evolução temporal</h5>
            <span className="dashboard-section-subtitle">Acompanhe tendências de receita e aquisição</span>
          </div>
          <div className="row g-3">
            <div className="col-xl-6 col-lg-6">
              <div className="chart-card">
                {renderLineChart(receitaMensalChartData, 'Faturamento Mensal R$ (12 meses)', 'currency')}
              </div>
            </div>

            <div className="col-xl-6 col-lg-6">
              <div className="chart-card">
                {renderLineChart(getCrescimentoClientes(), 'Novos Clientes (12 meses)', 'number')}
              </div>
            </div>
          </div>

          <div className="row g-3 mt-2">
            <div className="col-12">
              <div className="chart-card">
                {renderLineChart(receberMesAtualChartData, 'A Receber no mês (R$ por dia)', 'currency')}
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header d-flex align-items-center justify-content-between">
            <h5 className="dashboard-section-title mb-0">Análises complementares</h5>
            <span className="dashboard-section-subtitle">Insights para decisões estratégicas</span>
          </div>
          <div className="row g-3">
            <div className="col-xl-6 col-lg-6">
              <div className="chart-card">
                {renderValueChart(ticketMedioChartData, 'Ticket Médio R$', 'currency')}
              </div>
            </div>

            <div className="col-xl-6 col-lg-6">
              <div className="chart-card">
                {renderBarChart(getClientesPorPlano(), 'Clientes por Plano', 'number')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;