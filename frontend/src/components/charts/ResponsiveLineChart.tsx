import React, { useState, useLayoutEffect, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { LineChartProps } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { useI18n } from '@/contexts/I18nContext';

const ResponsiveLineChart: React.FC<LineChartProps> = memo(({ data, title, format = 'number' }) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);

  // Função para formatar o ano (2025 -> 25, 2024 -> 24)
  const formatDateLabel = useCallback((label: string): string => {
    if (!label) return '';
    // Substituir anos de 4 dígitos por 2 dígitos (ex: 2025 -> 25, 2024 -> 24)
    return label.replace(/\b(20)(\d{2})\b/g, '$2');
  }, []);

  const chartData = useMemo(() => 
    data.map((item) => ({
      name: formatDateLabel(item.mes || item.name || ''),
      value: item.valor ?? item.value ?? 0,
      color: item.color || '#007bff',
    })),
    [data, formatDateLabel]
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
          height: rect.height || 300
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

    // Configurar para alta resolução (device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Ajustar tamanho real do canvas
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Escalar contexto para compensar o device pixel ratio
    ctx.scale(dpr, dpr);

    // Limpar canvas (usar dimensões originais após escala)
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Margens otimizadas para melhor aproveitamento do espaço
    const margin = { top: 10, right: 15, left: 40, bottom: 85 };
    const chartWidth = dimensions.width - margin.left - margin.right;
    const chartHeight = dimensions.height - margin.top - margin.bottom;

    // Valores para cálculo com melhor escala automática
    const values = chartData.map(d => d.value);
    const maxValue = Math.max(...values, 0);

    // Melhorar escala automática: se o valor máximo for muito baixo, ajustar a escala
    let minValue = 0;
    let scaleFactor = 1;

    if (maxValue > 0 && maxValue < 10) {
      // Para valores muito pequenos, usar escala de 0.1
      scaleFactor = 0.1;
      minValue = 0;
    } else if (maxValue > 0 && maxValue < 100) {
      // Para valores pequenos, usar escala de 1
      scaleFactor = 1;
      minValue = 0;
    } else {
      // Para valores maiores, arredondar para cima
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
      scaleFactor = magnitude;
      minValue = 0;
    }

    // Ajustar o máximo para ter uma margem superior
    const adjustedMaxValue = Math.ceil(maxValue / scaleFactor) * scaleFactor;
    const valueRange = adjustedMaxValue - minValue || 1;

    // Número de ticks no eixo Y otimizado baseado no range de valores
    let numYTicks = 5;
    if (valueRange < 10) {
      numYTicks = 4; // Menos ticks para valores pequenos
    } else if (valueRange > 1000000) {
      numYTicks = 6; // Mais ticks para valores grandes
    }

    const yTickStep = valueRange / (numYTicks - 1);

    // Cores
    const gridColor = '#2f3844';
    const axisColor = '#ced4da'; // Mais claro para melhor contraste
    const lineColor = '#007bff';

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

    // Desenhar labels do eixo X (rotacionados verticalmente)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const xStep = chartWidth / (chartData.length - 1 || 1);
    chartData.forEach((item, index) => {
      const x = margin.left + xStep * index;
      const y = margin.top + chartHeight + 10;
      
      // Rotacionar o texto verticalmente
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2); // -90 graus
      ctx.fillText(item.name, 0, 0);
      ctx.restore();
    });

    // Calcular pontos da linha
    const points = chartData.map((item, index) => {
      const x = margin.left + (chartWidth / (chartData.length - 1 || 1)) * index;
      const y = margin.top + chartHeight - ((item.value - minValue) / valueRange) * chartHeight;
      return { x, y, value: item.value, label: item.name };
    });

    // Desenhar área preenchida abaixo da linha
    ctx.fillStyle = `${lineColor}20`; // Adicionar transparência de 20%
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

    // Completar o caminho até o eixo X (base do gráfico)
    const lastPoint = points[points.length - 1];
    ctx.lineTo(lastPoint.x, margin.top + chartHeight); // Ir até a base do gráfico
    ctx.lineTo(points[0].x, margin.top + chartHeight); // Voltar ao início na base
    ctx.closePath();
    ctx.fill();

    // Desenhar linha por cima da área preenchida
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

    // Desenhar pontos apenas quando houver hover
    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < points.length) {
      const hoveredPoint = points[hoveredIndex];
      ctx.fillStyle = '#0056b3'; // Cor azul escura para o ponto ativo
      ctx.beginPath();
      ctx.arc(hoveredPoint.x, hoveredPoint.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [chartData, dimensions, formatYAxis, hoveredIndex]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const margin = { top: 10, right: 15, left: 40, bottom: 85 };
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
      <div ref={containerRef} style={{ width: '100%', height: '300px', minWidth: '200px', minHeight: '300px', position: 'relative', overflow: 'visible' }}>
        <canvas
          ref={canvasRef}
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
            <p className="intro text-info mb-0">{t('financial.value')}: {formatValue(tooltip.value)}</p>
          </div>
        )}
      </div>
    </div>
  );
});

ResponsiveLineChart.displayName = 'ResponsiveLineChart';

export default ResponsiveLineChart;

