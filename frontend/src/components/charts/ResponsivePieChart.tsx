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

  // Função para obter cor do texto do CSS
  const getTextColor = useCallback(() => {
    const root = document.documentElement;
    const rootStyle = window.getComputedStyle(root);
    let textColor = rootStyle.getPropertyValue('--text-primary')?.trim();
    
    if (!textColor) {
      const bodyStyle = window.getComputedStyle(document.body);
      textColor = bodyStyle.getPropertyValue('--text-primary')?.trim();
    }
    
    if (!textColor && containerRef.current) {
      const containerStyle = window.getComputedStyle(containerRef.current);
      textColor = containerStyle.getPropertyValue('--text-primary')?.trim();
    }
    
    if (!textColor) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark ? '#e2e8f0' : '#212529';
    }
    
    return textColor;
  }, []);

  // Calcular dimensões do canvas
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Altura baseada no número de itens
        const itemHeight = 22;
        const calculatedHeight = data.length * itemHeight;
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

    // Configurar para alta resolução (device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Ajustar tamanho real do canvas
    canvas.width = rect.width * dpr;
    canvas.height = dimensions.height * dpr;

    // Escalar contexto para compensar o device pixel ratio
    ctx.scale(dpr, dpr);

    // Limpar canvas (usar dimensões originais após escala)
    ctx.clearRect(0, 0, rect.width, dimensions.height);

    // Configurações de estilo
    const itemHeight = 22;
    const colorSize = 10;
    const colorMargin = 8;
    const fontSize = 10;
    const fontFamily = 'system-ui, -apple-system, sans-serif';

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'middle';

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
      y += itemHeight;
    });
  }, [data, title, hiddenItems, dimensions, getTextColor]);

  // Observar mudanças no tema para atualizar as cores
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Forçar re-renderização quando o tema mudar
      if (canvasRef.current && dimensions.width > 0 && dimensions.height > 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configurar para alta resolução (device pixel ratio)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        // Ajustar tamanho real do canvas
        canvas.width = rect.width * dpr;
        canvas.height = dimensions.height * dpr;

        // Escalar contexto para compensar o device pixel ratio
        ctx.scale(dpr, dpr);

        // Limpar canvas (usar dimensões originais após escala)
        ctx.clearRect(0, 0, rect.width, dimensions.height);

        // Configurações de estilo
        const itemHeight = 32;
        const gap = 8;
        const colorSize = 12;
        const colorMargin = 8;
        const fontSize = 11;
        const fontFamily = 'system-ui, -apple-system, sans-serif';

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'middle';

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
      }
    });

    // Observar mudanças no atributo data-theme
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, [data, title, hiddenItems, dimensions, getTextColor]);

  // Calcular qual item foi clicado
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;

    const itemHeight = 22;
    const totalItemHeight = itemHeight;

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
    if (size === 0) return { inner: 28, outer: 55 };
    // Interpolação linear: 80px -> 20/40, 140px -> 28/55
    const ratio = Math.max(0, Math.min(1, (size - 80) / (140 - 80)));
    const inner = Math.round(20 + (28 - 20) * ratio);
    const outer = Math.round(40 + (55 - 40) * ratio);
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

    // Configurar para alta resolução (device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Ajustar tamanho real do canvas
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Escalar contexto para compensar o device pixel ratio
    ctx.scale(dpr, dpr);

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

