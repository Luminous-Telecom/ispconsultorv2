import React, { useState, useLayoutEffect, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { ChartDataItem, ChartFormat } from './types';
import { ChartEmptyState } from './ChartEmptyState';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '../../contexts/ThemeContext';

interface DualChartDataItem extends ChartDataItem {
  receber: number;
  pagar: number;
}

export type DualLineChartLineType = 'receber' | 'pagar';

interface DualLineChartProps {
  data: DualChartDataItem[];
  title: string;
  format?: ChartFormat;
  onPointClick?: (item: DualChartDataItem, index: number, lineType: DualLineChartLineType) => void;
}

const DualLineChart: React.FC<DualLineChartProps> = memo(({ data, title, format = 'currency', onPointClick }) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; receber: number; pagar: number; label: string } | null>(null);

  // Função para formatar o ano (2025 -> 25, 2024 -> 24)
  const formatDateLabel = useCallback((label: string): string => {
    if (!label) return '';
    return label.replace(/\b(20)(\d{2})\b/g, '$2');
  }, []);

  const formatValue = useCallback((value: number) => {
    if (format === 'currency') {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
    }
    return value.toLocaleString('pt-BR');
  }, [format]);

  const formatYAxis = useCallback((tickItem: number) => {
    if (format === 'currency') {
      if (tickItem >= 1_000_000) return `R$${(tickItem / 1_000_000).toFixed(1)}M`;
      if (tickItem >= 1_000) return `R$${(tickItem / 1_000).toFixed(1)}K`;
      return `R$${tickItem.toFixed(0)}`;
    }
    return tickItem.toLocaleString('pt-BR');
  }, [format]);

  const chartData = useMemo(() =>
    data.map((item: DualChartDataItem) => ({
      name: formatDateLabel(item.mes || item.name || ''),
      receber: item.receber ?? 0,
      pagar: item.pagar ?? 0,
    })),
    [data, formatDateLabel]
  );

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

    // Ajustar tamanho real do canvas para alta resolução
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Configurar contexto para renderização nítida
    ctx.imageSmoothingEnabled = false;
    ctx.scale(dpr, dpr); // Reintroduzir scale para corrigir tamanho
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Limpar canvas usando coordenadas lógicas (já que estamos usando scale)
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Margens otimizadas para melhor aproveitamento do espaço
    const margin = { top: 10, right: 15, left: 50, bottom: 85 };
    const chartWidth = rect.width - margin.left - margin.right;
    const chartHeight = rect.height - margin.top - margin.bottom;

    // Calcular valores para ambas as linhas com melhor escala automática
    const receberValues = chartData.map(d => d.receber);
    const pagarValues = chartData.map(d => d.pagar);
    const allValues = [...receberValues, ...pagarValues];

    const maxValue = Math.max(...allValues, 0);

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
    const axisColor = theme === 'dark' ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'; // Branco no modo escuro, branco com transparência no modo claro para combinar com fundo escuro
    const textColor = theme === 'dark' ? '#ffffff' : '#FFFFFF'; // Branco em ambos os modos (cards têm fundo escuro no modo claro)
    const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.15)'; // Linhas de grade mais perceptíveis
    const receberLineColor = '#28a745'; // Verde
    const pagarLineColor = '#dc3545'; // Vermelho
    const receberDotColor = '#28a745';
    const pagarDotColor = '#dc3545';

    // Desenhar grid com linhas sólidas mais perceptíveis
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1 / dpr; // Linha mais espessa
    ctx.setLineDash([]); // Linha sólida
    
    // Linhas horizontais (grade)
    for (let i = 0; i < numYTicks; i++) {
      const y = margin.top + (chartHeight / (numYTicks - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }
    
    // Linhas verticais (grade)
    const totalPoints = chartData.length;
    const xStep = totalPoints === 1 ? 0 : chartWidth / (totalPoints - 1);
    chartData.forEach((_, index) => {
      const x = totalPoints === 1
        ? margin.left + chartWidth / 2
        : margin.left + xStep * index;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();
    });

    // Desenhar eixos
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1 / dpr; // Linha mais fina para compensar o scale

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
    ctx.fillStyle = textColor;
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < numYTicks; i++) {
      const value = minValue + yTickStep * (numYTicks - 1 - i);
      const y = margin.top + (chartHeight / (numYTicks - 1)) * i;
      const label = formatYAxis(value);
      // Posicionar texto mais à esquerda para evitar corte do "R$"
      ctx.fillText(label, margin.left - 5, y);
    }

    // Desenhar labels do eixo X (rotacionados verticalmente)
    ctx.fillStyle = textColor;
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    // Reutilizar totalPoints e xStep já declarados acima
    chartData.forEach((item, index) => {
      const x = totalPoints === 1
        ? margin.left + chartWidth / 2
        : margin.left + xStep * index;
      const y = margin.top + chartHeight + 10;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(item.name, 0, 0);
      ctx.restore();
    });

    // Função auxiliar para desenhar linha com área preenchida
    const drawLine = (values: number[], color: string) => {
      const points = values.map((value, index) => {
        // Melhor distribuição dos pontos ao longo do eixo X
        const totalPoints = chartData.length;
        const x = totalPoints === 1
          ? margin.left + chartWidth / 2  // Centro se apenas 1 ponto
          : margin.left + (chartWidth / (totalPoints - 1)) * index;  // Distribuição uniforme
        const y = margin.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        return { x, y, value };
      });

      // Desenhar área preenchida abaixo da linha
      ctx.fillStyle = `${color}20`; // Adicionar transparência de 20%
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
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / dpr; // Ajustar espessura da linha
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

      return points;
    };

    // Desenhar linhas
    drawLine(receberValues, receberLineColor);
    drawLine(pagarValues, pagarLineColor);

    // Desenhar pontos apenas quando houver hover
    if (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < chartData.length) {
      const hoveredPoint = chartData[hoveredIndex];

      // Desenhar ponto para linha "receber"
      const totalPoints = chartData.length;
      const receberX = totalPoints === 1
        ? margin.left + chartWidth / 2  // Centro se apenas 1 ponto
        : margin.left + (chartWidth / (totalPoints - 1)) * hoveredIndex;  // Distribuição uniforme
      const receberY = margin.top + chartHeight - ((hoveredPoint.receber - minValue) / valueRange) * chartHeight;
      ctx.fillStyle = receberDotColor;
      ctx.beginPath();
      ctx.arc(receberX, receberY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Desenhar ponto para linha "pagar"
      const pagarX = totalPoints === 1
        ? margin.left + chartWidth / 2  // Centro se apenas 1 ponto
        : margin.left + (chartWidth / (totalPoints - 1)) * hoveredIndex;  // Distribuição uniforme
      const pagarY = margin.top + chartHeight - ((hoveredPoint.pagar - minValue) / valueRange) * chartHeight;
      ctx.fillStyle = pagarDotColor;
      ctx.beginPath();
      ctx.arc(pagarX, pagarY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Desenhar legenda no canvas
    const legendY = rect.height - 20;
    const legendItemWidth = 100;
    const totalLegendWidth = legendItemWidth * 2;
    const startLegendX = (rect.width - totalLegendWidth) / 2;

    // Item Receber
    ctx.beginPath();
    ctx.rect(startLegendX, legendY - 5, 12, 3); // Linha/Retângulo representando a cor
    ctx.fillStyle = receberLineColor;
    ctx.fill();
    
    ctx.fillStyle = textColor; // Usar mesma cor do texto para legenda (branco em ambos os modos)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    // Renderizar texto em coordenadas inteiras para evitar antialiasing
    ctx.fillText(t('financial.toReceive').toUpperCase(), Math.round(startLegendX + 16), Math.round(legendY - 3));

    // Item Pagar
    const pagarX = startLegendX + legendItemWidth;
    ctx.beginPath();
    ctx.rect(pagarX, legendY - 5, 12, 3);
    ctx.fillStyle = pagarLineColor;
    ctx.fill();

    ctx.fillStyle = textColor;
    ctx.fillText(t('financial.toPayLabel').toUpperCase(), Math.round(pagarX + 16), Math.round(legendY - 3));

  }, [chartData, dimensions, formatYAxis, hoveredIndex, t, theme]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const margin = { top: 10, right: 15, left: 40, bottom: 85 };
    const chartWidth = rect.width - margin.left - margin.right;
    const totalPoints = chartData.length;
    const xStep = totalPoints === 1 ? 0 : chartWidth / (totalPoints - 1);

    let closestIndex = 0;
    let minDistance = Infinity;

    chartData.forEach((_, index) => {
      const pointX = totalPoints === 1
        ? margin.left + chartWidth / 2
        : margin.left + xStep * index;
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
        receber: point.receber,
        pagar: point.pagar,
      });
    } else {
      setHoveredIndex(null);
      setTooltip(null);
    }
  }, [chartData]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltip(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPointClick || chartData.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const margin = { top: 10, right: 15, left: 40, bottom: 85 };
    const chartWidth = rect.width - margin.left - margin.right;
    const chartHeight = rect.height - margin.top - margin.bottom;
    const totalPoints = chartData.length;
    const xStep = totalPoints === 1 ? 0 : chartWidth / (totalPoints - 1);

    let closestIndex = 0;
    let minDistance = Infinity;
    chartData.forEach((_, index) => {
      const pointX = totalPoints === 1 ? margin.left + chartWidth / 2 : margin.left + xStep * index;
      const distance = Math.abs(x - pointX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (minDistance < 30) {
      const point = chartData[closestIndex];
      const allValues = chartData.flatMap(d => [d.receber, d.pagar]);
      const maxValue = Math.max(...allValues, 0);
      const minValue = 0;
      const valueRange = maxValue - minValue || 1;
      const receberY = margin.top + chartHeight - ((point.receber - minValue) / valueRange) * chartHeight;
      const pagarY = margin.top + chartHeight - ((point.pagar - minValue) / valueRange) * chartHeight;
      const distReceber = Math.abs(y - receberY);
      const distPagar = Math.abs(y - pagarY);
      const lineType: DualLineChartLineType = distReceber <= distPagar ? 'receber' : 'pagar';
      const item = data[closestIndex];
      if (item) onPointClick(item, closestIndex, lineType);
    }
  }, [chartData, data, onPointClick]);

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
          onClick={handleClick}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: onPointClick && hoveredIndex !== null ? 'pointer' : 'default',
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
            <p className="label text-light mb-1">{tooltip.label}</p>
            <p className="intro mb-0">
              <span className="tooltip-color-indicator" style={{ backgroundColor: '#28a745' }}></span>
              {t('financial.receive')}: {formatValue(tooltip.receber)}
            </p>
            <p className="intro mb-0">
              <span className="tooltip-color-indicator" style={{ backgroundColor: '#dc3545' }}></span>
              {t('financial.pay')}: {formatValue(tooltip.pagar)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

DualLineChart.displayName = 'DualLineChart';

export default DualLineChart;