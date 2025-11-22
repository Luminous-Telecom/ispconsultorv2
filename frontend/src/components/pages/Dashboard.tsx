import React, { useState, useLayoutEffect, useRef, useCallback, useMemo, memo, startTransition } from 'react';
import { formatDate } from '@/utils/formatters';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardFilters } from '@/contexts/DashboardFiltersContext';
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  PieLabelRenderProps
} from 'recharts';

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

/**
 * Interface para o payload aninhado do Recharts
 * Representa os dados do ponto do gráfico
 */
interface RechartsNestedPayload {
  value?: number;
  valor?: number;
  name?: string;
  mes?: string;
  label?: string;
  // Propriedades dinâmicas podem existir devido à obfuscação
  // Usamos unknown para manter type safety enquanto permitimos acesso dinâmico
  [key: string]: string | number | undefined | unknown;
}

/**
 * Interface para um item do payload do tooltip do Recharts
 */
interface RechartsTooltipPayloadItem {
  value?: number;
  dataKey?: string;
  name?: string;
  color?: string;
  fill?: string;
  stroke?: string;
  payload?: RechartsNestedPayload;
  // Propriedades adicionais podem existir após obfuscação
  [key: string]: string | number | RechartsNestedPayload | undefined | unknown;
}

/**
 * Props para o componente CustomTooltip
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: RechartsTooltipPayloadItem[];
  label?: string | number;
  format: 'currency' | 'number';
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, format }) => {
  if (active && payload && payload.length > 0) {
    // Acessar value de forma mais robusta, considerando possíveis variações após obfuscação
    // O Recharts passa o payload como um array, onde cada item contém informações sobre o ponto do gráfico
    const firstPayload = payload[0];
    let value: number | null = null;
    
    if (firstPayload && typeof firstPayload === 'object') {
      // Após obfuscação com transform-object-keys, as chaves podem ser alteradas
      // Estratégia: usar Object.entries() para encontrar valores numéricos sem depender do nome da propriedade
      
      // 1. Tentar acessar diretamente pelo nome da propriedade (caso não tenha sido ofuscado)
      const directValue = firstPayload.value;
      if (typeof directValue === 'number' && !isNaN(directValue) && isFinite(directValue)) {
        value = directValue;
      }
      
      // 2. Tentar acessar via payload aninhado (estrutura padrão do Recharts)
      // O Recharts geralmente passa: payload[0].payload.value ou payload[0].value
      if (value === null && firstPayload.payload && typeof firstPayload.payload === 'object') {
        const nestedPayload = firstPayload.payload as RechartsNestedPayload;
        // Tentar acessar via dataKey primeiro (mais confiável)
        if (firstPayload.dataKey && typeof firstPayload.dataKey === 'string') {
          const dataKeyValue = nestedPayload[firstPayload.dataKey];
          if (typeof dataKeyValue === 'number' && !isNaN(dataKeyValue) && isFinite(dataKeyValue)) {
            value = dataKeyValue;
          }
        }
        // Se não encontrou via dataKey, tentar propriedades conhecidas
        if (value === null && nestedPayload.value !== undefined) {
          const nestedValue = nestedPayload.value;
          if (typeof nestedValue === 'number' && !isNaN(nestedValue) && isFinite(nestedValue)) {
            value = nestedValue;
          }
        }
        if (value === null && nestedPayload.valor !== undefined) {
          const nestedValor = nestedPayload.valor;
          if (typeof nestedValor === 'number' && !isNaN(nestedValor) && isFinite(nestedValor)) {
            value = nestedValor;
          }
        }
      }
      
      // 3. Iterar sobre todas as propriedades do payload aninhado para encontrar valores numéricos
      // Isso funciona mesmo após obfuscação, pois não depende do nome da propriedade
      if (value === null && firstPayload.payload && typeof firstPayload.payload === 'object') {
        const nestedPayload = firstPayload.payload as RechartsNestedPayload;
        const nestedEntries = Object.entries(nestedPayload);
        // Ignorar propriedades que não são números (objetos, arrays, strings, etc)
        for (const [, val] of nestedEntries) {
          if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            value = val;
            break;
          }
        }
      }
      
      // 4. Como último recurso, iterar sobre todas as propriedades do primeiro payload
      if (value === null) {
        const allEntries = Object.entries(firstPayload);
        // Ignorar propriedades que não são números e propriedades conhecidas (payload, dataKey, name, color, etc)
        const ignoredKeys = ['payload', 'dataKey', 'name', 'color', 'fill', 'stroke'];
        for (const [key, val] of allEntries) {
          if (!ignoredKeys.includes(key) && typeof val === 'number' && !isNaN(val) && isFinite(val)) {
            value = val;
            break;
          }
        }
      }
    }
    
    // Garantir que value é um número válido
    const numericValue = value !== null && typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
    
    const formattedValue = format === 'currency'
      ? numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
      : numericValue.toLocaleString('pt-BR');

    return (
      <div className="custom-tooltip bg-dark p-2 border border-secondary rounded shadow">
        <p className="label text-light mb-0">{label}</p>
        <p className="intro text-info mb-0">Valor: {formattedValue}</p>
      </div>
    );
  }

  return null;
};

const ResponsiveLineChart: React.FC<ResponsiveLineChartProps> = ({ data, title, format = 'number' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    // Verificar dimensões antes da renderização visual
    const checkDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const { width, height } = rect;

        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          setIsReady(true);
          return true;
        }
      }
      setIsReady(false);
      return false;
    };

    // Tentar imediatamente
    checkDimensions();

    // Usar ResizeObserver para detectar mudanças de tamanho
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const { width, height } = rect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
      checkDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback: tentar após um pequeno delay
    const timer = setTimeout(() => {
      checkDimensions();
    }, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [data, title]);

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

  const chartData = data.map((item) => ({
    name: item.mes,
    value: item.valor ?? item.value ?? 0,
    color: item.color,
  }));

  const formatYAxis = (tickItem: number) => {
    if (format === 'currency') {
      if (tickItem >= 1_000_000) return `R$${(tickItem / 1_000_000).toFixed(1)}M`;
      if (tickItem >= 1_000) return `R$${(tickItem / 1_000).toFixed(1)}K`;
      return `R$${tickItem.toFixed(0)}`;
    }
    return tickItem.toLocaleString('pt-BR');
  };

  const formatXAxis = (tickItem: string) => {
    // Backend já envia no formato MM/AA, apenas retorna
    return tickItem || '';
  };

  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div ref={containerRef} style={{ width: '100%', height: '220px', minWidth: '200px', minHeight: '220px', position: 'relative' }}>
        {isReady && dimensions && dimensions.width > 0 && dimensions.height > 0 ? (
          <ResponsiveContainer width={dimensions.width} height={dimensions.height} minHeight={220} minWidth={200}>
            <RLineChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3844" />
              <XAxis dataKey="name" stroke="#6c757d" fontSize={10} padding={{ left: 10, right: 10 }} tickFormatter={formatXAxis} />
              <YAxis stroke="#6c757d" fontSize={10} tickFormatter={formatYAxis} domain={[0, 'dataMax']} allowDecimals />
              <Tooltip content={<CustomTooltip format={format} />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#007bff" 
                strokeWidth={2} 
                activeDot={{ r: 6 }} 
                dot={{ r: 3 }}
                name="Valor"
              />
            </RLineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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

// Componente memoizado para itens da legenda
interface PieLegendItemProps {
  item: ChartDataItem;
  index: number;
  title: string;
  isHidden: boolean;
  onToggle: (index: number) => void;
}

const PieLegendItem = memo<PieLegendItemProps>(({ item, index, title, isHidden, onToggle }) => {
  const isProcessingRef = useRef(false);

  // Handler otimizado para resposta imediata
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevenir múltiplos cliques rápidos
    if (isProcessingRef.current) {
      e.preventDefault();
      return;
    }
    
    isProcessingRef.current = true;
    
    // Usar startTransition diretamente para resposta mais rápida
    startTransition(() => {
      onToggle(index);
    });
    
    // Resetar flag após um pequeno delay (fora do startTransition)
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 150);
  }, [index, onToggle]);

  return (
    <div
      className="pie-legend-item"
      style={{
        cursor: 'pointer',
        opacity: isHidden ? 0.5 : 1,
        textDecoration: isHidden ? 'line-through' : 'none',
      }}
      onClick={handleClick}
    >
      <div className="pie-legend-color" style={{ backgroundColor: item.color || '#6c757d' }}></div>
      <span className="pie-legend-text">
        {item.label}: {formatPieValue(item.value || 0, title)}
      </span>
    </div>
  );
});

PieLegendItem.displayName = 'PieLegendItem';

const ResponsivePieChart: React.FC<ResponsivePieChartProps> = memo(({ data, title, hiddenItems, onToggleItem }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Todos os hooks devem ser chamados antes de qualquer early return
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

  const renderCustomizedLabel = useCallback(({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: PieLabelRenderProps) => {
    const safeInnerRadius = (innerRadius ?? 0) as number;
    const safeOuterRadius = (outerRadius ?? safeInnerRadius) as number;
    const safeCx = (cx ?? 0) as number;
    const safeCy = (cy ?? 0) as number;
    const safeMidAngle = (midAngle ?? 0) as number;
    const safePercent = (percent ?? 0) as number;

    const radius = safeInnerRadius + (safeOuterRadius - safeInnerRadius) * 0.38;
    const x = safeCx + radius * Math.cos(-safeMidAngle * Math.PI / 180);
    const y = safeCy + radius * Math.sin(-safeMidAngle * Math.PI / 180);

    if (safePercent * 100 > 3) {
      return (
        <text
          x={x}
          y={y}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8}
          fontWeight={400}
        >
          {`${(safePercent * 100).toFixed(0)}%`}
        </text>
      );
    }
    return null;
  }, []);

  // Calcular raios baseado no tamanho do container (proporcional)
  const radii = useMemo(() => {
    if (!dimensions) return { inner: 22, outer: 45 };
    const size = Math.min(dimensions.width, dimensions.height);
    // Interpolação linear: 80px -> 16/32, 110px -> 22/45
    const ratio = (size - 80) / (110 - 80); // 0 a 1
    const inner = Math.round(16 + (22 - 16) * ratio);
    const outer = Math.round(32 + (45 - 32) * ratio);
    return { inner, outer };
  }, [dimensions]);

  useLayoutEffect(() => {
    // Verificar dimensões antes da renderização visual
    const checkDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const { width, height } = rect;

        if (width > 0 && height > 0) {
          setDimensions({ width, height });
          setIsReady(true);
          return true;
        }
      }
      setIsReady(false);
      return false;
    };

    // Tentar imediatamente
    checkDimensions();

    // Usar ResizeObserver para detectar mudanças de tamanho
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const { width, height } = rect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
      checkDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback: tentar após um pequeno delay
    const timer = setTimeout(() => {
      checkDimensions();
    }, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [data, title]);

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
        <div ref={containerRef} className="pie-chart-box">
          {isReady && dimensions && dimensions.width > 0 && dimensions.height > 0 ? (
            <ResponsiveContainer width={dimensions.width} height={dimensions.height} minHeight={dimensions.height} minWidth={dimensions.width}>
              <PieChart>
                <Pie
                  data={filteredChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={radii.inner}
                  outerRadius={radii.outer}
                  fill="#8884d8"
                  paddingAngle={2}
                  labelLine={false}
                  label={renderCustomizedLabel}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {filteredChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || '#6c757d'}
                      opacity={hiddenItems.has(index) ? 0.3 : 1}
                      stroke="none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
            </div>
          )}
        </div>
        <div className="pie-legend-box">
          {data.map((item, index) => (
            <PieLegendItem
              key={index}
              item={item}
              index={index}
              title={title}
              isHidden={hiddenItems.has(index)}
              onToggle={onToggleItem}
            />
          ))}
        </div>
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
  
  // Função para renderizar gráfico de linha temporal com Recharts
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