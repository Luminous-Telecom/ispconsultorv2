import React, { useState, useLayoutEffect, useEffect, useRef, useCallback, useMemo, memo, startTransition } from 'react';
import { formatDate } from '@/utils/formatters';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';

/**
 * Interface para dados de gráfico
 * Suporta propriedades conhecidas e permite propriedades adicionais para flexibilidade
 */
interface ChartDataItem {
  valor?: number;
  value?: number;
  label?: string;
  color?: string;
  mes?: string;
  name?: string;
  // Propriedades adicionais permitidas para compatibilidade com diferentes formatos de dados
  [key: string]: string | number | undefined;
}

/**
 * Props para o componente ResponsiveLineChart
 */
interface ResponsiveLineChartProps {
  data: ChartDataItem[];
  title: string;
  format?: 'currency' | 'number';
}


const ResponsiveLineChart: React.FC<ResponsiveLineChartProps> = memo(({ data, title, format = 'number' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  const chartData = useMemo(() => 
    data.map((item) => ({
      name: item.mes || item.name || '',
      value: item.valor ?? item.value ?? 0,
      color: item.color || '#007bff',
    })),
    [data]
  );

  const formatYAxis = useCallback((tickItem: number) => {
    if (format === 'currency') {
      if (tickItem >= 1_000_000) return `R$${(tickItem / 1_000_000).toFixed(1)}M`;
      if (tickItem >= 1_000) return `R$${(tickItem / 1_000).toFixed(1)}K`;
      return `R$${tickItem.toFixed(0)}`;
    }
    return tickItem.toLocaleString('pt-BR');
  }, [format]);

  const formatValue = useCallback((value: number) => {
    if (format === 'currency') {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
    }
    return value.toLocaleString('pt-BR');
  }, [format]);

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ 
          width: rect.width || 200, 
          height: rect.height || 220 
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0 || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Margens
    const margin = { top: 15, right: 30, left: 50, bottom: 30 };
    const chartWidth = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    // Valores para cálculo
    const values = chartData.map(d => d.value);
    const maxValue = Math.max(...values, 0);
    const minValue = 0;
    const valueRange = maxValue - minValue || 1;

    // Número de ticks no eixo Y
    const numYTicks = 5;
    const yTickStep = valueRange / (numYTicks - 1);

    // Cores
    const gridColor = '#2f3844';
    const axisColor = '#6c757d';
    const lineColor = '#007bff';
    const dotColor = '#007bff';
    const activeDotColor = '#0056b3';

    // Desenhar grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i < numYTicks; i++) {
      const y = margin.top + (chartHeight / (numYTicks - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Desenhar eixos
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    
    // Eixo Y
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.stroke();

    // Eixo X
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();

    // Desenhar labels do eixo Y
    ctx.fillStyle = axisColor;
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < numYTicks; i++) {
      const value = minValue + yTickStep * (numYTicks - 1 - i);
      const y = margin.top + (chartHeight / (numYTicks - 1)) * i;
      const label = formatYAxis(value);
      ctx.fillText(label, margin.left - 10, y);
    }

    // Desenhar labels do eixo X
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xStep = chartWidth / (chartData.length - 1 || 1);
    chartData.forEach((item, index) => {
      const x = margin.left + xStep * index;
      ctx.fillText(item.name, x, margin.top + chartHeight + 10);
    });

    // Calcular pontos da linha
    const points = chartData.map((item, index) => {
      const x = margin.left + (chartWidth / (chartData.length - 1 || 1)) * index;
      const y = margin.top + chartHeight - ((item.value - minValue) / valueRange) * chartHeight;
      return { x, y, value: item.value, label: item.name };
    });

    // Desenhar linha
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        const prevPoint = points[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (point.x - prevPoint.x) * 2 / 3;
        const cp2y = point.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, point.x, point.y);
      }
    });
    ctx.stroke();

    // Desenhar pontos
    points.forEach((point, index) => {
      const isHovered = hoveredIndex === index;
      ctx.fillStyle = isHovered ? activeDotColor : dotColor;
      ctx.beginPath();
      ctx.arc(point.x, point.y, isHovered ? 6 : 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [chartData, dimensions, formatYAxis, hoveredIndex]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const margin = { top: 15, right: 30, left: 50, bottom: 30 };
    const chartWidth = dimensions.width - margin.left - margin.right;
    const xStep = chartWidth / (chartData.length - 1 || 1);

    let closestIndex = 0;
    let minDistance = Infinity;

    chartData.forEach((_, index) => {
      const pointX = margin.left + xStep * index;
      const distance = Math.abs(x - pointX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (minDistance < 30) {
      setHoveredIndex(closestIndex);
      const point = chartData[closestIndex];
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        label: point.name,
        value: point.value,
      });
    } else {
      setHoveredIndex(null);
      setTooltip(null);
    }
  }, [chartData, dimensions]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltip(null);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div style={{ width: '100%', height: '220px', minWidth: '200px', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-muted">Sem dados para exibir</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div ref={containerRef} style={{ width: '100%', height: '220px', minWidth: '200px', minHeight: '220px', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: hoveredIndex !== null ? 'pointer' : 'default',
          }}
        />
        {tooltip && (
          <div
            className="custom-tooltip bg-dark p-2 border border-secondary rounded shadow"
            style={{
              position: 'fixed',
              left: `${tooltip.x + 10}px`,
              top: `${tooltip.y - 10}px`,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <p className="label text-light mb-0">{tooltip.label}</p>
            <p className="intro text-info mb-0">Valor: {formatValue(tooltip.value)}</p>
          </div>
        )}
      </div>
    </div>
  );
});

ResponsiveLineChart.displayName = 'ResponsiveLineChart';

interface ResponsivePieChartProps {
  data: ChartDataItem[];
  title: string;
  hiddenItems: Set<number>;
  onToggleItem: (index: number) => void;
}

const formatPieValue = (value: number, title: string): string | number => {
  if (title === 'Taxa de Pagamento') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString('pt-BR');
};

// Componente Canvas para renderizar legenda - similar ao exemplo fornecido
interface PieLegendCanvasProps {
  data: ChartDataItem[];
  title: string;
  hiddenItems: Set<number>;
  onToggleItem: (index: number) => void;
}

const PieLegendCanvas: React.FC<PieLegendCanvasProps> = memo(({ data, title, hiddenItems, onToggleItem }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Calcular dimensões do canvas
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Altura baseada no número de itens
        const itemHeight = 32;
        const gap = 8;
        const calculatedHeight = data.length * (itemHeight + gap) - gap;
        setDimensions({ 
          width: rect.width || 200, 
          height: calculatedHeight || itemHeight 
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [data.length]);

  // Renderizar no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Configurações de estilo
    const itemHeight = 32;
    const gap = 8;
    const colorSize = 12;
    const colorMargin = 8;
    const fontSize = 11;
    const fontFamily = 'system-ui, -apple-system, sans-serif';

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

    // Obter cor do texto do CSS (fallback para cor padrão)
    const getTextColor = () => {
      const computedStyle = window.getComputedStyle(containerRef.current || document.body);
      return computedStyle.getPropertyValue('--text-primary')?.trim() || '#ffffff';
    };

    const textColor = getTextColor();
    let y = itemHeight / 2;

    data.forEach((item, index) => {
      const isHidden = hiddenItems.has(index);
      const opacity = isHidden ? 0.5 : 1;
      const formattedValue = formatPieValue(item.value || 0, title);
      const text = `${item.label}: ${formattedValue}`;

      // Desenhar quadrado de cor
      ctx.fillStyle = item.color || '#6c757d';
      ctx.globalAlpha = opacity;
      ctx.fillRect(colorMargin, y - colorSize / 2, colorSize, colorSize);

      // Desenhar texto
      ctx.fillStyle = textColor;
      ctx.globalAlpha = opacity;
      const textX = colorMargin + colorSize + 8;
      ctx.fillText(text, textX, y);

      // Desenhar linha através do texto se estiver oculto
      if (isHidden) {
        ctx.strokeStyle = textColor;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 1;
        const textWidth = ctx.measureText(text).width;
        ctx.beginPath();
        ctx.moveTo(textX, y);
        ctx.lineTo(textX + textWidth, y);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      y += itemHeight + gap;
    });
  }, [data, title, hiddenItems, dimensions]);

  // Calcular qual item foi clicado
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    const itemHeight = 32;
    const gap = 8;
    const totalItemHeight = itemHeight + gap;

    const clickedIndex = Math.floor(clickY / totalItemHeight);
    if (clickedIndex >= 0 && clickedIndex < data.length) {
      startTransition(() => {
        onToggleItem(clickedIndex);
      });
    }
  }, [data, onToggleItem]);

  return (
    <div ref={containerRef} className="pie-legend-box" style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleClick}
        style={{
          display: 'block',
          width: '100%',
          height: dimensions.height || 'auto',
          cursor: 'pointer',
        }}
      />
    </div>
  );
});

PieLegendCanvas.displayName = 'PieLegendCanvas';

const ResponsivePieChart: React.FC<ResponsivePieChartProps> = memo(({ data, title, hiddenItems, onToggleItem }) => {
  const visibleData = useMemo(() => 
    data && data.length > 0 ? data.filter((_, index) => !hiddenItems.has(index)) : [],
    [data, hiddenItems]
  );
  
  const total = useMemo(() => 
    visibleData.reduce((sum, item) => sum + (item.value || 0), 0),
    [visibleData]
  );

  const chartData = useMemo(() => 
    data && data.length > 0 ? data.map((item) => ({
      name: item.label,
      value: item.value || 0,
      color: item.color,
    })) : [],
    [data]
  );

  const filteredChartData = useMemo(() => 
    chartData.filter((_, index) => !hiddenItems.has(index)),
    [chartData, hiddenItems]
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pieContainerRef = useRef<HTMLDivElement>(null);
  const [pieDimensions, setPieDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Calcular raios baseado no tamanho do container (proporcional)
  const radii = useMemo(() => {
    const size = Math.min(pieDimensions.width, pieDimensions.height);
    if (size === 0) return { inner: 22, outer: 45 };
    // Interpolação linear: 80px -> 16/32, 110px -> 22/45
    const ratio = Math.max(0, Math.min(1, (size - 80) / (110 - 80)));
    const inner = Math.round(16 + (22 - 16) * ratio);
    const outer = Math.round(32 + (45 - 32) * ratio);
    return { inner, outer };
  }, [pieDimensions]);

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (pieContainerRef.current) {
        const rect = pieContainerRef.current.getBoundingClientRect();
        setPieDimensions({ 
          width: rect.width || 100, 
          height: rect.height || 100 
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (pieContainerRef.current) {
      resizeObserver.observe(pieContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pieDimensions.width === 0 || pieDimensions.height === 0 || filteredChartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, pieDimensions.width, pieDimensions.height);

    const centerX = pieDimensions.width / 2;
    const centerY = pieDimensions.height / 2;
    const { inner, outer } = radii;

    // Calcular totais e ângulos
    const totalValue = filteredChartData.reduce((sum, item) => sum + item.value, 0);
    if (totalValue === 0) return;

    const paddingAngle = 2 * (Math.PI / 180); // 2 graus em radianos
    const totalPadding = paddingAngle * filteredChartData.length;
    const availableAngle = Math.PI * 2 - totalPadding;

    let currentAngle = -Math.PI / 2; // Começar do topo

    // Desenhar fatias
    filteredChartData.forEach((item) => {
      const sliceAngle = (item.value / totalValue) * availableAngle;
      const endAngle = currentAngle + sliceAngle;

      // Desenhar fatia externa
      ctx.beginPath();
      ctx.arc(centerX, centerY, outer, currentAngle, endAngle);
      ctx.arc(centerX, centerY, inner, endAngle, currentAngle, true);
      ctx.closePath();

      const color = item.color || '#6c757d';
      
      ctx.fillStyle = color;
      ctx.fill();

      // Desenhar porcentagem se maior que 3%
      if ((item.value / totalValue) * 100 > 3) {
        const midAngle = currentAngle + sliceAngle / 2;
        const labelRadius = inner + (outer - inner) * 0.38;
        const labelX = centerX + labelRadius * Math.cos(midAngle);
        const labelY = centerY + labelRadius * Math.sin(midAngle);

        ctx.fillStyle = '#ffffff';
        ctx.font = '8px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${((item.value / totalValue) * 100).toFixed(0)}%`, labelX, labelY);
      }

      currentAngle = endAngle + paddingAngle;
    });
  }, [filteredChartData, pieDimensions, radii]);

  if (!data || data.length === 0) {
    return (
      <div className="chart-container-pie">
        <h6 className="chart-title-pie">{title}</h6>
        <div style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-muted small">Sem dados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container-pie">
      <h6 className="chart-title-pie">
        {title} ({formatPieValue(total, title)})
      </h6>
      <div className="pie-chart-content">
        <div ref={pieContainerRef} className="pie-chart-box">
          <canvas
            ref={canvasRef}
            width={pieDimensions.width}
            height={pieDimensions.height}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
            }}
          />
        </div>
        <PieLegendCanvas
          data={data}
          title={title}
          hiddenItems={hiddenItems}
          onToggleItem={onToggleItem}
        />
      </div>
    </div>
  );
});

ResponsivePieChart.displayName = 'ResponsivePieChart';

const Dashboard: React.FC = () => {
  const {
    startDate,
    endDate,
    periodoInicioLabel,
    periodoFimLabel,
  } = useDashboardFilters();

  // Estados para controlar itens ocultos em cada gráfico
  const [hiddenClientes, setHiddenClientes] = useState<Set<number>>(new Set());
  const [hiddenPlanos, setHiddenPlanos] = useState<Set<number>>(new Set());
  const [hiddenPagamentos, setHiddenPagamentos] = useState<Set<number>>(new Set());
  const [hiddenDistribuicao, setHiddenDistribuicao] = useState<Set<number>>(new Set());
  const [hiddenTaxaPagamento, setHiddenTaxaPagamento] = useState<Set<number>>(new Set());
  const [hiddenContratos, setHiddenContratos] = useState<Set<number>>(new Set());

  // Funções de toggle para cada gráfico (memoizadas)
  const toggleCliente = useCallback((index: number) => {
    setHiddenClientes(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) newHidden.delete(index);
      else newHidden.add(index);
      return newHidden;
    });
  }, []);

  const togglePlano = useCallback((index: number) => {
    setHiddenPlanos(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) newHidden.delete(index);
      else newHidden.add(index);
      return newHidden;
    });
  }, []);

  const togglePagamento = useCallback((index: number) => {
    setHiddenPagamentos(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) newHidden.delete(index);
      else newHidden.add(index);
      return newHidden;
    });
  }, []);

  const toggleDistribuicao = useCallback((index: number) => {
    setHiddenDistribuicao(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) newHidden.delete(index);
      else newHidden.add(index);
      return newHidden;
    });
  }, []);

  const toggleTaxaPagamento = useCallback((index: number) => {
    setHiddenTaxaPagamento(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) newHidden.delete(index);
      else newHidden.add(index);
      return newHidden;
    });
  }, []);

  const toggleContratos = useCallback((index: number) => {
    setHiddenContratos(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(index)) newHidden.delete(index);
      else newHidden.add(index);
      return newHidden;
    });
  }, []);

  const formatCurrency = (valor: number): string => valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

  const formatNumber = (valor: number): string => valor.toLocaleString('pt-BR');

  // Query única para buscar todos os dados do dashboard
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboard({
    startDate,
    endDate,
  });

  // Processar dados vindos do backend
  const clientes = dashboardData?.clientes || [];
  const clientesTodos = dashboardData?.clientesTodos || [];
  const planos = dashboardData?.planos || [];
  const contratos = dashboardData?.contratos || [];
  const contratosTodos = dashboardData?.contratosTodos || [];
  const titulosTodos = dashboardData?.titulosTodos || [];

  // Estatísticas de clientes (TODOS os clientes para gráficos)
  const totalClientes = clientesTodos.length;
  const clientesAtivos = clientesTodos.filter(c => c.ativo).length;
  const clientesInativos = totalClientes - clientesAtivos;

  // Estatísticas de planos (TODOS os planos para gráficos)
  const totalPlanos = planos.length;
  const planosAtivos = planos.filter(p => p.status === 'ativo').length;
  const planosInativos = totalPlanos - planosAtivos;

  // Estatísticas de contratos (TODOS os contratos para gráficos)
  const contratosAtivos = contratosTodos.filter(c => c.status === 'ativo').length;
  const contratosInativos = contratosTodos.filter(c => c.status === 'inativo').length;
  const contratosSuspensos = contratosTodos.filter(c => c.status === 'suspenso').length;

  // Valores do período selecionado (sempre usar valores do período, nunca globais)
  const receitaPrevistaPeriodo = dashboardData?.resumoPeriodo?.totalPrevisto ?? 0;
  const receitaPagaPeriodo = dashboardData?.resumoPeriodo?.totalRecebido ?? 0;
  const receitaPendentePeriodo = dashboardData?.resumoPeriodo?.totalPendente ?? 0;
  // Clientes ativos no período (filtrados pelo período selecionado)
  const clientesAtivosPeriodo = clientes.filter(c => c.ativo).length;
  // Clientes com títulos no período (clientes únicos que têm títulos que vencem no período)
  const clientesComTitulosPeriodo = dashboardData?.resumoPeriodo?.clientesComTitulos ?? 0;

  // Métricas adicionais
  // Ticket médio = soma dos valores dos planos com clientes / quantidade de clientes ativos com planos
  // Calculado no backend: soma de todos os valores dos contratos ativos / clientes únicos com contratos ativos
  const ticketMedio = dashboardData?.resumoPeriodo?.ticketMedio ?? 0;
  
  // Taxa de pagamento (TODOS os títulos, não apenas do período)
  const totalTitulosTodos = titulosTodos.length;
  const titulosPagosTodos = titulosTodos.filter(t => t.status === 'pago' || t.status === 'pago_atraso' || t.status === 'parcial').length;
  const taxaPagamento = totalTitulosTodos > 0 ? (titulosPagosTodos / totalTitulosTodos) * 100 : 0;

  const agora = new Date();
  // Formatar data como "15 de janeiro" usando formatDate e ajustando formato
  const lastUpdatedDate = formatDate(agora).replace(/(\d{2})\/(\d{2})\/(\d{4})/, (_, dia, mes) => {
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${dia} de ${meses[parseInt(mes) - 1]}`;
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
            : '#6c757d'
      }))
    : [];

  const recebidosPeriodoChartData: ChartDataItem[] = dashboardData?.recebidosPeriodo
    ? dashboardData.recebidosPeriodo.labels.map((label: string, index: number) => ({
        mes: label,
        valor: dashboardData.recebidosPeriodo?.data?.[index] ?? 0,
        color: '#28a745',
      }))
    : [];

  const receberPeriodoChartData: ChartDataItem[] = dashboardData?.aReceberPeriodo
    ? dashboardData.aReceberPeriodo.labels.map((label: string, index: number) => ({
        mes: label,
        valor: dashboardData.aReceberPeriodo.data[index] ?? 0,
        color: '#17a2b8',
      }))
    : [];

  const totalRecebidosPeriodo = recebidosPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalReceberPeriodo = receberPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0);

  // Crescimento de clientes (últimos 12 meses)
  const getCrescimentoClientes = () => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = String(data.getFullYear()).slice(-2);
      const mesAno = `${mes}/${ano}`;
      
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

  // Status de pagamento dos títulos (TODOS os títulos)
  const getStatusPagamento = () => {
    const titulosPagos = titulosTodos.filter(t => t.status === 'pago' || t.status === 'pago_atraso').length;
    const titulosPendentes = titulosTodos.filter(t => t.status === 'pendente').length;
    const titulosVencidosCount = titulosTodos.filter(t => t.status === 'vencido').length;
    const titulosCancelados = titulosTodos.filter(t => t.status === 'cancelado').length;
    
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


  // Análise de clientes por plano (usar todos os contratos ativos, não apenas os do período)
  const getClientesPorPlano = () => {
    // Usar contratosAtivosTodos se disponível, senão usar contratos filtrados
    const contratosParaContar = dashboardData?.contratosAtivosTodos || contratos;
    const contratosAtivos = contratosParaContar.filter(c => c.status === 'ativo');
    
    // Contar clientes únicos por plano
    const contagem = contratosAtivos.reduce((acc, contrato) => {
      if (contrato.plano_id && contrato.cliente_id) {
        const planoId = contrato.plano_id;
        if (!acc[planoId]) {
          acc[planoId] = new Set();
        }
        acc[planoId].add(contrato.cliente_id);
      }
      return acc;
    }, {} as Record<number, Set<number>>);
    
    const cores = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#17a2b8'];
    return planos.map((plano, index) => ({
      label: plano.nome_plano,
      value: contagem[plano.id]?.size || 0,
      color: cores[index % cores.length]
    })).sort((a, b) => b.value - a.value);
  };

  // Dados para gráficos
  const statusPagamentoData = getStatusPagamento();

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

  // Função para renderizar gráfico de barras horizontais
  const renderBarChart = (data: ChartDataItem[], title: string, format: 'currency' | 'number' = 'number') => {
    if (!data || data.length === 0) {
      return (
        <div className="chart-container">
          <h6 className="chart-title">{title}</h6>
          <div style={{ width: '100%', height: '220px', minWidth: '200px', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="text-muted">Sem dados para exibir</p>
          </div>
        </div>
      );
    }
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
      <div className="chart-container-pie">
        <h6 className="chart-title-pie">{title}</h6>
        <div className="pie-chart-content">
          <div className="value-chart">
            <div className="value-display" style={{ color: data[0]?.color || '#6f42c1' }}>
              {formatValue(value)}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Função para renderizar gráfico de linha temporal
  const renderLineChart = (data: ChartDataItem[], title: string, format: 'currency' | 'number' = 'number') => {
    return <ResponsiveLineChart data={data} title={title} format={format} />;
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
        <div className="dashboard-hero card border-0 shadow-sm mb-4">
          <div className="dashboard-hero-body">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              <div>
                <span className="dashboard-badge text-uppercase">Visão geral</span>
                <h2 className="dashboard-hero-title mb-2">Painel financeiro e operacional</h2>
                <p className="dashboard-hero-subtitle mb-0">
                  Atualizado em {lastUpdatedDate} às {lastUpdatedTime}
                </p>
              </div>
              <div className="d-flex flex-wrap gap-3">
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Faturamento total</span>
                  <strong className="dashboard-hero-value">{formatCurrency(receitaPagaPeriodo)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Receita prevista</span>
                  <strong className="dashboard-hero-value">{formatCurrency(receitaPrevistaPeriodo)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Receita pendente</span>
                  <strong className="dashboard-hero-value">{formatCurrency(receitaPendentePeriodo)}</strong>
                </div>
                <div className="dashboard-hero-stat">
                  <span className="dashboard-hero-label">Clientes ativos</span>
                  <strong className="dashboard-hero-value">{formatNumber(clientesAtivosPeriodo)}</strong>
                  <small className="dashboard-hero-label d-block">Clientes no período: {formatNumber(clientesComTitulosPeriodo)}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={clientesChartData}
                title="Status dos Clientes"
                hiddenItems={hiddenClientes}
                onToggleItem={toggleCliente}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={planosChartData}
                title="Status dos Planos"
                hiddenItems={hiddenPlanos}
                onToggleItem={togglePlano}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={statusPagamentoData}
                title="Status dos Pagamentos"
                hiddenItems={hiddenPagamentos}
                onToggleItem={togglePagamento}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={getDistribuicaoPlanos()}
                title="Distribuição por Tipo de Plano"
                hiddenItems={hiddenDistribuicao}
                onToggleItem={toggleDistribuicao}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={taxaPagamentoChartData}
                title="Taxa de Pagamento"
                hiddenItems={hiddenTaxaPagamento}
                onToggleItem={toggleTaxaPagamento}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              <ResponsivePieChart
                data={contratosChartData}
                title="Status dos Contratos"
                hiddenItems={hiddenContratos}
                onToggleItem={toggleContratos}
              />
            </div>
          </div>

          <div className="col-xl-3 col-lg-3 col-md-4 col-sm-6 col-12">
            <div className="chart-card">
              {renderValueChart(ticketMedioChartData, 'Ticket Médio R$', 'currency')}
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              {renderLineChart(receitaMensalChartData, 'Faturamento Mensal R$ (12 meses)', 'currency')}
            </div>
          </div>

          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              {renderLineChart(getCrescimentoClientes(), 'Novos Clientes (12 meses)', 'number')}
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              {renderLineChart(
                recebidosPeriodoChartData,
                `Recebidos no período (${periodoInicioLabel} - ${periodoFimLabel}) · Total ${formatCurrency(totalRecebidosPeriodo)}`,
                'currency'
              )}
            </div>
          </div>
          <div className="col-xl-6 col-lg-6">
            <div className="chart-card chart-card-line">
              {renderLineChart(
                receberPeriodoChartData,
                `A Receber no período (${periodoInicioLabel} - ${periodoFimLabel}) · Total ${formatCurrency(totalReceberPeriodo)}`,
                'currency'
              )}
            </div>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-xl-12 col-lg-12">
            <div className="chart-card">
              {renderBarChart(getClientesPorPlano(), 'Clientes por Plano', 'number')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;