import React, { useState, useLayoutEffect, useEffect, useRef, useMemo, memo } from 'react';
import { PieChartProps } from './types';
import { useTheme } from '../../contexts/ThemeContext';

const formatPieValue = (value: number, title: string): string | number => {
  if (title === 'Taxa de Pagamento') {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString('pt-BR');
};

const ResponsivePieChart: React.FC<PieChartProps> = memo(({ data, title, hiddenItems, onToggleItem }) => {
  const { theme } = useTheme();

  // Simplificação: removendo referências complexas de estado
  // Manteremos apenas a lógica essencial de renderização do canvas
  const visibleData = useMemo(() =>
    data && data.length > 0 ? data.filter((_, index) => !hiddenItems.has(index)) : [],
    [data, hiddenItems]
  );
  
  const total = useMemo(() => 
    visibleData.reduce((sum, item) => sum + (item.value || 0), 0),
    [visibleData]
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  // Armazenar áreas clicáveis da legenda
  const legendHitBoxes = useRef<{index: number, x: number, y: number, w: number, h: number}[]>([]);

  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ 
          width: rect.width || 100, 
          height: rect.height || 100 
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Verificar clique na legenda
    const hit = legendHitBoxes.current.find(box => 
      x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
    );

    if (hit) {
      onToggleItem(hit.index);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0 || !data) return;

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
    ctx.scale(dpr, dpr);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Limpar canvas usando coordenadas originais (agora escaladas)
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Layout (trabalhar com coordenadas lógicas)
    const isSmall = rect.width < 300;
    const padding = 10;

    // Área da Pizza (lado esquerdo ou topo)
    const pieAreaWidth = isSmall ? rect.width * 0.5 : rect.width * 0.4;
    const centerX = pieAreaWidth / 2 + padding;
    const centerY = rect.height / 2;
    const minDimension = Math.min(pieAreaWidth, rect.height);

    // Raios
    const outerRadius = (minDimension / 2) - padding;
    const innerRadius = outerRadius * 0.6;

    // Área da Legenda (lado direito)
    const legendX = pieAreaWidth + padding * 2;
    const legendYStart = padding + 10;
    const legendItemHeight = 18;
    
    // Limpar hitboxes antigos
    legendHitBoxes.current = [];
    
    // Desenhar Pizza
    const totalValue = visibleData.reduce((sum, item) => sum + (item.value || 0), 0);
    
    if (totalValue > 0) {
      const paddingAngle = 2 * (Math.PI / 180);
      const totalPadding = paddingAngle * visibleData.length;
      const availableAngle = Math.PI * 2 - totalPadding;
      
      let currentAngle = -Math.PI / 2;

      data.forEach((item, index) => {
        if (hiddenItems.has(index)) return; // Pular itens ocultos no desenho da pizza

        const sliceAngle = ((item.value || 0) / totalValue) * availableAngle;
        const endAngle = currentAngle + sliceAngle;

        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, currentAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, currentAngle, true);
        ctx.closePath();

        ctx.fillStyle = item.color || '#6c757d';
        ctx.fill();

        // Porcentagem no centro da fatia (apenas se couber)
        if (((item.value || 0) / totalValue) > 0.05) { // > 5%
           const midAngle = currentAngle + sliceAngle / 2;
           const labelRadius = innerRadius + (outerRadius - innerRadius) * 0.5;
           const labelX = centerX + labelRadius * Math.cos(midAngle);
           const labelY = centerY + labelRadius * Math.sin(midAngle);
           
           ctx.fillStyle = '#ffffff';
           ctx.font = 'bold 9px system-ui, sans-serif';
           ctx.textAlign = 'center';
           ctx.textBaseline = 'middle';
           ctx.fillText(`${Math.round(((item.value || 0) / totalValue) * 100)}%`, labelX, labelY);
        }

        currentAngle = endAngle + paddingAngle;
      });
    } else {
        // Pizza vazia (anel cinza)
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = '#e9ecef';
        ctx.fill();
    }

    // Desenhar Legenda
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const fontSize = 10;
    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    // Otimizações para texto nítido
    ctx.imageSmoothingEnabled = false;

    data.forEach((item, index) => {
        const isHidden = hiddenItems.has(index);
        const y = legendYStart + index * legendItemHeight;
        
        // Verificar se cabe na altura
        if (y + legendItemHeight > rect.height) return;

        // Caixa de cor
        const boxSize = 10;
        ctx.globalAlpha = isHidden ? 0.5 : 1;
        ctx.fillStyle = item.color || '#6c757d';
        ctx.fillRect(legendX, y - boxSize/2, boxSize, boxSize);
        ctx.globalAlpha = 1;

        // Texto - Branco em ambos os modos (cards têm fundo escuro no modo claro)
        ctx.fillStyle = isHidden
          ? '#ced4da'
          : '#ffffff'; // Branco em ambos os modos para melhor contraste
        const text = `${item.label}: ${formatPieValue(item.value || 0, title)}`;

        // Truncar texto se muito longo
        const maxWidth = rect.width - legendX - boxSize - 5 - padding;
        let displayText = text;
        if (ctx.measureText(text).width > maxWidth) {
            // Lógica simples de truncagem
            while (displayText.length > 0 && ctx.measureText(displayText + '...').width > maxWidth) {
                displayText = displayText.slice(0, -1);
            }
            displayText += '...';
        }

        // Renderizar texto em coordenadas inteiras para evitar antialiasing
        const textX = Math.round(legendX + boxSize + 5);
        const textY = Math.round(y);
        ctx.fillText(displayText, textX, textY);
        
        // Linha riscada se oculto
        if (isHidden) {
            ctx.beginPath();
            ctx.strokeStyle = '#ced4da';
            ctx.lineWidth = 1;
            ctx.moveTo(legendX + boxSize + 5, y);
            ctx.lineTo(legendX + boxSize + 5 + ctx.measureText(displayText).width, y);
            ctx.stroke();
        }

        // Adicionar Hitbox para clique
        legendHitBoxes.current.push({
            index,
            x: legendX,
            y: y - legendItemHeight/2,
            w: rect.width - legendX, // Clicável até o fim da largura
            h: legendItemHeight
        });
    });

  }, [data, dimensions, hiddenItems, title, total, visibleData, theme]);

  if (!data || data.length === 0) {
    return (
      <div className="chart-container-pie">
        <h6 className="chart-title-pie">{title}</h6>
        <div style={{ width: '100%', height: '100%', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-muted small">Sem dados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container-pie" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h6 className="chart-title-pie" style={{ marginBottom: '5px' }}>
        {title} ({formatPieValue(total, title)})
      </h6>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: 'default' // Estático, sem pointer para evitar logs de interação, mas clicável na legenda
          }}
        />
      </div>
    </div>
  );
});

ResponsivePieChart.displayName = 'ResponsivePieChart';

export default ResponsivePieChart;
