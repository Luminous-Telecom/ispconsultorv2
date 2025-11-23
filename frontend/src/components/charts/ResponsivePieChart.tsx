import React, { useState, useLayoutEffect, useEffect, useRef, useCallback, useMemo, memo, startTransition } from 'react';
import { ChartDataItem, PieChartProps } from './types';

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
    <div ref={containerRef} className="pie-legend-box" style={{ position: 'relative' }}>
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

const ResponsivePieChart: React.FC<PieChartProps> = memo(({ data, title, hiddenItems, onToggleItem }) => {
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

export default ResponsivePieChart;

