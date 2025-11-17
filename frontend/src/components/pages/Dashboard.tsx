import React, { useState, useLayoutEffect, useRef } from 'react';
import { useDashboard } from '../../hooks/useDashboard';
import FormField from '../ui/FormField';
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

interface ChartDataItem {
  valor?: number;
  value?: number;
  label?: string;
  color?: string;
  mes?: string;
  [key: string]: string | number | undefined;
}

interface ResponsiveLineChartProps {
  data: ChartDataItem[];
  title: string;
  format?: 'currency' | 'number';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ 
    value?: number; 
    dataKey?: string;
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
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
        const nestedPayload = firstPayload.payload as Record<string, unknown>;
        // Tentar acessar via dataKey primeiro (mais confiável)
        if (firstPayload.dataKey && typeof firstPayload.dataKey === 'string') {
          const dataKeyValue = nestedPayload[firstPayload.dataKey];
          if (typeof dataKeyValue === 'number' && !isNaN(dataKeyValue) && isFinite(dataKeyValue)) {
            value = dataKeyValue;
          }
        }
        // Se não encontrou via dataKey, tentar 'value'
        if (value === null && 'value' in nestedPayload) {
          const nestedValue = nestedPayload.value;
          if (typeof nestedValue === 'number' && !isNaN(nestedValue) && isFinite(nestedValue)) {
            value = nestedValue;
          }
        }
      }
      
      // 3. Iterar sobre todas as propriedades do payload aninhado para encontrar valores numéricos
      // Isso funciona mesmo após obfuscação, pois não depende do nome da propriedade
      if (value === null && firstPayload.payload && typeof firstPayload.payload === 'object') {
        const nestedPayload = firstPayload.payload as Record<string, unknown>;
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

  return (
    <div className="chart-container">
      <h6 className="chart-title">{title}</h6>
      <div ref={containerRef} style={{ width: '100%', height: '220px', minWidth: '200px', minHeight: '220px', position: 'relative' }}>
        {isReady && dimensions && dimensions.width > 0 && dimensions.height > 0 ? (
          <ResponsiveContainer width={dimensions.width} height={dimensions.height} minHeight={220} minWidth={200}>
            <RLineChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3844" />
              <XAxis dataKey="name" stroke="#6c757d" fontSize={10} padding={{ left: 10, right: 10 }} />
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

const ResponsivePieChart: React.FC<ResponsivePieChartProps> = ({ data, title, hiddenItems, onToggleItem }) => {
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
        <div style={{ width: '100px', height: '100px', minWidth: '100px', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-muted small">Sem dados</p>
        </div>
      </div>
    );
  }

  const visibleData = data.filter((_, index) => !hiddenItems.has(index));
  const total = visibleData.reduce((sum, item) => sum + (item.value || 0), 0);

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value || 0,
    color: item.color,
  }));

  const filteredChartData = chartData.filter((_, index) => !hiddenItems.has(index));

  const renderCustomizedLabel = ({
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
          fontSize={10}
          fontWeight={600}
        >
          {`${(safePercent * 100).toFixed(0)}%`}
        </text>
      );
    }
    return null;
  };

  return (
      <div className="chart-container">
        <h6 className="chart-title">
          {title} ({formatPieValue(total, title)})
        </h6>
        <div className="d-flex align-items-center" style={{ minWidth: 0, overflow: 'hidden', justifyContent: 'flex-start' }}>
        <div ref={containerRef} style={{ width: '140px', height: '140px', minWidth: '140px', minHeight: '140px', maxWidth: '140px', flexShrink: 0, position: 'relative' }}>
          {isReady && dimensions && dimensions.width > 0 && dimensions.height > 0 ? (
            <ResponsiveContainer width={dimensions.width} height={dimensions.height} minHeight={140} minWidth={140}>
              <PieChart>
              <Pie
                data={filteredChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
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

        <div className="chart-legend ms-3" style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden', maxWidth: 'calc(100% - 160px)' }}>
          {data.map((item, index) => (
            <div
              key={index}
              className="legend-item"
              style={{
                cursor: 'pointer',
                opacity: hiddenItems.has(index) ? 0.5 : 1,
                textDecoration: hiddenItems.has(index) ? 'line-through' : 'none',
                minWidth: 0
              }}
              onClick={() => onToggleItem(index)}
            >
              <div className="legend-color" style={{ backgroundColor: item.color || '#6c757d', flexShrink: 0 }}></div>
              <span className="legend-label">
                {item.label}: {formatPieValue(item.value || 0, title)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const formatDateToInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value?: string): string => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const MONTH_NAME_MAP: Record<string, string> = {
  jan: '01', janeiro: '01',
  fev: '02', fevereiro: '02',
  mar: '03', março: '03', marco: '03',
  abr: '04', abril: '04',
  mai: '05', maio: '05',
  jun: '06', junho: '06',
  jul: '07', julho: '07',
  ago: '08', agosto: '08',
  set: '09', setembro: '09',
  out: '10', outubro: '10',
  nov: '11', novembro: '11',
  dez: '12', dezembro: '12',
};

const formatMonthNumeric = (label: string): string => {
  if (!label) return '';
  const trimmed = label.trim();

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR', {
      month: '2-digit',
      year: '2-digit'
    });
  }

  const matchMonthYear = trimmed.match(/^([A-Za-zçÇ]{3,9})\/?(\d{2,4})?$/);
  if (matchMonthYear) {
    const monthKey = matchMonthYear[1].toLowerCase();
    const monthNumber = MONTH_NAME_MAP[monthKey];
    const yearPart = matchMonthYear[2] ? matchMonthYear[2] : `${new Date().getFullYear()}`;
    if (monthNumber) {
      const yearNormalized = yearPart.length === 2 ? `20${yearPart}` : yearPart;
      const date = new Date(Number(yearNormalized), Number(monthNumber) - 1, 1);
      return date.toLocaleDateString('pt-BR', {
        month: '2-digit',
        year: '2-digit'
      });
    }
  }

  const matchNumeric = trimmed.match(/^(\d{1,2})\/?(\d{2})$/);
  if (matchNumeric) {
    return `${matchNumeric[1].padStart(2, '0')}/${matchNumeric[2]}`;
  }

  return trimmed;
};

const getCurrentMonthRange = () => {
  const today = new Date();
  return {
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
  };
};

const Dashboard: React.FC = () => {
  const { start: defaultStartDate, end: defaultEndDate } = getCurrentMonthRange();
  const defaultStart = formatDateToInput(defaultStartDate);
  const defaultEnd = formatDateToInput(defaultEndDate);

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  const handleStartDateChange = (value: unknown) => {
    if (typeof value !== 'string') return;
    setStartDate(value);
    if (endDate && new Date(`${value}T00:00:00`) > new Date(`${endDate}T00:00:00`)) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: unknown) => {
    if (typeof value !== 'string') return;
    if (startDate && new Date(`${value}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
      setEndDate(startDate);
      return;
    }
    setEndDate(value);
  };

  const handleResetPeriod = () => {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
  };

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
  const { data: dashboardData, isLoading: loadingDashboard } = useDashboard({
    startDate,
    endDate,
  });

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
  const receitaTotalGlobal = (stats?.valorTotalRecebido || 0) + (stats?.valorTotalReceber || 0);
  const receitaPagaGlobal = stats?.valorTotalRecebido || 0;
  const receitaPendenteGlobal = stats?.valorTotalReceber || 0;

  const receitaPrevistaPeriodo = dashboardData?.resumoPeriodo?.totalPrevisto ?? receitaTotalGlobal;
  const receitaPagaPeriodo = dashboardData?.resumoPeriodo?.totalRecebido ?? receitaPagaGlobal;
  const receitaPendentePeriodo = dashboardData?.resumoPeriodo?.totalPendente ?? receitaPendenteGlobal;
  // Clientes ativos no período (filtrados pelo período selecionado)
  const clientesAtivosPeriodo = clientes.filter(c => c.ativo).length;
  // Clientes com títulos no período
  const clientesComTitulosPeriodo = dashboardData?.resumoPeriodo?.clientesComTitulos ?? 0;

  // Métricas adicionais (usando dados reais quando disponíveis)
  // Ticket médio = valor total recebido / clientes ativos
  const ticketMedio = stats?.ticketMedio ?? (clientesAtivos > 0 ? receitaPagaGlobal / clientesAtivos : 0);
  const taxaPagamento = receitaPrevistaPeriodo > 0 ? (receitaPagaPeriodo / receitaPrevistaPeriodo) * 100 : 0;
  const _receitaPorCliente = totalClientes > 0 ? receitaTotalGlobal / totalClientes : 0;

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
    ? dashboardData.receitaUltimosMeses.labels.map((label, index) => {
        const formattedLabel = formatMonthNumeric(label);
        return {
          mes: formattedLabel,
          valor: dashboardData.receitaUltimosMeses.data[index] ?? 0,
          color:
            index === (dashboardData.receitaUltimosMeses.data.length - 1)
              ? '#28a745'
              : '#6c757d'
        };
      })
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
  const periodoInicioLabel = formatDateLabel(startDate);
  const periodoFimLabel = formatDateLabel(endDate);

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
        mes: formatMonthNumeric(mesAno),
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
  const _totalTitulosEmAberto = titulosPendentesCount + titulosVencidosCount;

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
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="dashboard-filters position-relative">
              <div className="row g-3 align-items-end w-100">
                <div className="col-lg-3 col-md-6">
                  <FormField
                    formPrefix="DashboardFilters"
                    type="date"
                    label="Data inicial"
                    name="startDate"
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="mb-0"
                    size="sm"
                  />
                </div>
                <div className="col-lg-3 col-md-6">
                  <FormField
                    formPrefix="DashboardFilters"
                    type="date"
                    label="Data final"
                    name="endDate"
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="mb-0"
                    size="sm"
                  />
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="dashboard-filters-actions mb-2 mb-md-0">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleResetPeriod}>
                      Mês atual
                    </button>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="dashboard-period-info text-md-end text-muted small">
                    Período selecionado: {periodoInicioLabel} — {periodoFimLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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

        <div className="dashboard-section card border-0 shadow-sm mb-4">
          <div className="card-body">
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
    </div>
  );
};

export default Dashboard;