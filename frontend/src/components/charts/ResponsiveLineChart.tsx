import React, { useState, useLayoutEffect, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { LineChartProps } from './types';
import { ChartEmptyState } from './ChartEmptyState';

const ResponsiveLineChart: React.FC<LineChartProps> = memo(({ data, title, format = 'number' }) => {
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
    return <ChartEmptyState title={title} />;
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

export default ResponsiveLineChart;

