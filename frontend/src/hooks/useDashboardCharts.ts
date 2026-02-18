import { useCallback, useMemo } from 'react';
import { DashboardData } from '../services/dashboardService';
import { ChartDataItem } from '../components/charts/types';
import type { useDashboardStats } from './useDashboardStats';
import type { TranslationKeys } from '../contexts/I18nContext';

interface DualChartDataItem extends ChartDataItem {
  receber: number;
  pagar: number;
}

interface DashboardCharts {
  // Gráficos de pizza
  clientesChartData: ChartDataItem[];
  planosChartData: ChartDataItem[];
  statusPagamentoData: ChartDataItem[];
  distribuicaoPlanos: ChartDataItem[];
  taxaPagamentoChartData: ChartDataItem[];
  contratosChartData: ChartDataItem[];
  ticketMedioChartData: ChartDataItem[];

  // Gráficos de linha
  receitaMensalChartData: ChartDataItem[];
  recebidosPeriodoChartData: ChartDataItem[];
  receberPeriodoChartData: ChartDataItem[];
  crescimentoClientes: ChartDataItem[];

  // Gráfico de barras
  clientesPorPlano: ChartDataItem[];

  // Gráfico de linhas duplas
  contasReceberPagarChartData: DualChartDataItem[];

  // Totais para exibição
  totalRecebidosPeriodo: number;
  totalReceberPeriodo: number;
  totalReceitaMensal: number;
  totalNovosClientes: number;
}

/**
 * Hook para preparar dados dos gráficos do dashboard
 * Extrai toda a lógica de preparação de dados para gráficos
 */
export const useDashboardCharts = (
  dashboardData: DashboardData | undefined,
  stats: ReturnType<typeof useDashboardStats>,
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string
): DashboardCharts => {
  // Memoizar arrays para evitar recriação
  const clientes = useMemo(() => dashboardData?.clientes || [], [dashboardData?.clientes]);
  const planos = useMemo(() => dashboardData?.planos || [], [dashboardData?.planos]);
  const contratos = useMemo(() => dashboardData?.contratos || [], [dashboardData?.contratos]);
  const titulosTodos = useMemo(() => dashboardData?.titulosTodos || [], [dashboardData?.titulosTodos]);
  const contasPagarUltimosMeses = useMemo(() => dashboardData?.contasPagarUltimosMeses || { labels: [], data: [] }, [dashboardData?.contasPagarUltimosMeses]);
  const receitaUltimosMeses = useMemo(() => dashboardData?.receitaUltimosMeses || { labels: [], data: [] }, [dashboardData?.receitaUltimosMeses]);

  // Gráficos de pizza - memoizados
  const clientesChartData = useMemo(() => [
    { label: t('status.active'), value: stats.clientesAtivos, color: '#28a745', filterValue: true },
    { label: t('status.inactive'), value: stats.clientesInativos, color: '#dc3545', filterValue: false }
  ], [stats.clientesAtivos, stats.clientesInativos, t]);

  const planosChartData = useMemo(() => [
    { label: t('status.active'), value: stats.planosAtivos, color: '#007bff', filterValue: 'ativo' },
    { label: t('status.inactive'), value: stats.planosInativos, color: '#6c757d', filterValue: 'inativo' }
  ], [stats.planosAtivos, stats.planosInativos, t]);

  const statusPagamentoData = useMemo(() => {
    if (!titulosTodos || titulosTodos.length === 0) return [];
    
    const counts = titulosTodos.reduce((acc, titulo) => {
      if (titulo.status === 'pago' || titulo.status === 'pago_atraso' || titulo.status === 'parcial') {
        acc.pagos++;
      } else if (titulo.status === 'pendente') {
        acc.pendentes++;
      } else if (titulo.status === 'vencido') {
        acc.vencidos++;
      } else if (titulo.status === 'cancelado') {
        acc.cancelados++;
      }
      return acc;
    }, { pagos: 0, pendentes: 0, vencidos: 0, cancelados: 0 });
    
    return [
      { label: t('status.paid'), value: counts.pagos, color: '#28a745', filterValue: 'pago,pago_atraso,parcial' },
      { label: t('status.pending'), value: counts.pendentes, color: '#17a2b8', filterValue: 'pendente' },
      { label: t('status.overdue'), value: counts.vencidos, color: '#ffc107', filterValue: 'vencido' },
      { label: t('status.cancelled'), value: counts.cancelados, color: '#dc3545', filterValue: 'cancelado' }
    ].filter(item => item.value > 0);
  }, [titulosTodos, t]);

  const distribuicaoPlanos = useMemo(() => {
    const tipoLabels: Record<string, string> = {
      infraestrutura: t('form.serviceTypeInfrastructure'),
      consultoria: t('form.serviceTypeConsulting'),
      blockdomi: t('form.serviceTypeBlockdomi')
    };
    const tipos = planos.reduce((acc, plano) => {
      const tipo = plano.tipo_servico || 'Outros';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const cores = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];
    return Object.entries(tipos).map(([tipo, quantidade], index) => ({
      label: tipoLabels[tipo] || tipo,
      value: quantidade,
      color: cores[index % cores.length],
      filterValue: tipo
    }));
  }, [planos, t]);

  const taxaPagamentoChartData = useMemo(() => [
    { label: t('status.paid'), value: stats.taxaPagamento, color: '#28a745', filterValue: 'pago,pago_atraso,parcial' },
    { label: t('status.pending'), value: 100 - stats.taxaPagamento, color: '#ffc107', filterValue: 'pendente,vencido' }
  ], [stats.taxaPagamento, t]);

  const contratosChartData = useMemo(() => [
    { label: t('status.active'), value: stats.contratosAtivos, color: '#28a745', filterValue: 'ativo' },
    { label: t('status.inactive'), value: stats.contratosInativos, color: '#dc3545', filterValue: 'inativo' },
    { label: t('status.suspended'), value: stats.contratosSuspensos, color: '#ffc107', filterValue: 'suspenso' },
    { label: t('status.exempt'), value: stats.contratosIsentos, color: '#6c757d', filterValue: 'isento' }
  ], [stats.contratosAtivos, stats.contratosInativos, stats.contratosSuspensos, stats.contratosIsentos, t]);

  const ticketMedioChartData = useMemo(() => [
    { label: 'Ticket Médio', value: stats.ticketMedio, color: '#6f42c1' }
  ], [stats.ticketMedio]);

  // Helper: MM/YY -> { data_inicio, data_fim }
  const parseMesAnoToRange = useCallback((mesAno: string): { data_inicio: string; data_fim: string } => {
    const [mm, yy] = mesAno.split('/');
    const month = parseInt(mm || '1', 10);
    const year = 2000 + parseInt(yy || '25', 10);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return {
      data_inicio: firstDay.toISOString().split('T')[0],
      data_fim: lastDay.toISOString().split('T')[0],
    };
  }, []);

  // Helper: DD/MM/YYYY -> { data_inicio, data_fim } (mesmo dia)
  const parseDataLabelToRange = useCallback((label: string): { data_inicio: string; data_fim: string } | null => {
    const match = label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const d = new Date(parseInt(year!, 10), parseInt(month!, 10) - 1, parseInt(day!, 10));
    if (isNaN(d.getTime())) return null;
    const iso = d.toISOString().split('T')[0];
    return { data_inicio: iso, data_fim: iso };
  }, []);

  // Gráficos de linha - memoizados
  const receitaMensalChartData = useMemo(() => {
    if (!dashboardData?.receitaUltimosMeses) return [];
    return dashboardData.receitaUltimosMeses.labels.map((label, index) => {
      const range = parseMesAnoToRange(label);
      return {
        mes: label,
        valor: dashboardData!.receitaUltimosMeses.data[index] ?? 0,
        color: index === (dashboardData.receitaUltimosMeses.data.length - 1) ? '#28a745' : '#6c757d',
        ...range,
      };
    });
  }, [dashboardData, parseMesAnoToRange]);

  const recebidosPeriodoChartData = useMemo(() => {
    if (!dashboardData?.recebidosPeriodo) return [];
    return dashboardData.recebidosPeriodo.labels.map((label, index) => {
      const range = parseDataLabelToRange(label);
      return {
        mes: label,
        valor: dashboardData!.recebidosPeriodo?.data?.[index] ?? 0,
        color: '#28a745',
        ...(range || {}),
      };
    });
  }, [dashboardData, parseDataLabelToRange]);

  const receberPeriodoChartData = useMemo(() => {
    if (!dashboardData?.aReceberPeriodo) return [];
    return dashboardData.aReceberPeriodo.labels.map((label, index) => {
      const range = parseDataLabelToRange(label);
      return {
        mes: label,
        valor: dashboardData!.aReceberPeriodo.data[index] ?? 0,
        color: '#17a2b8',
        ...(range || {}),
      };
    });
  }, [dashboardData, parseDataLabelToRange]);

  const crescimentoClientes = useMemo(() => {
    const meses = [];
    const hoje = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = String(data.getFullYear()).slice(-2);
      const mesAno = `${mes}/${ano}`;
      const range = parseMesAnoToRange(mesAno);
      
      const clientesMes = clientes.filter(cliente => {
        if (!cliente.created_at) return false;
        const dataCliente = new Date(cliente.created_at);
        return dataCliente.getMonth() === data.getMonth() && 
               dataCliente.getFullYear() === data.getFullYear();
      }).length;
      
      meses.push({
        mes: mesAno,
        valor: clientesMes,
        color: i === 11 ? '#007bff' : '#6c757d',
        ...range,
      });
    }
    
    return meses;
  }, [clientes, parseMesAnoToRange]);

  // Gráfico de barras - memoizado
  const clientesPorPlano = useMemo(() => {
    const contratosParaContar = dashboardData?.contratosAtivosTodos || contratos;
    const contratosAtivos = contratosParaContar.filter(c => c.status === 'ativo');

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
      color: cores[index % cores.length],
      plano_id: plano.id
    })).sort((a, b) => b.value - a.value);
  }, [dashboardData?.contratosAtivosTodos, contratos, planos]);

  // Gráfico de linhas - contas a receber vs contas a pagar (últimos 12 meses)
  const contasReceberPagarChartData = useMemo(() => {
    if (!receitaUltimosMeses.labels || !contasPagarUltimosMeses.labels) return [];

    return receitaUltimosMeses.labels.map((label: string, index: number) => {
      const range = parseMesAnoToRange(label);
      return {
        mes: label,
        receber: receitaUltimosMeses.data?.[index] ?? 0,
        pagar: contasPagarUltimosMeses.data?.[index] ?? 0,
        ...range,
      };
    });
  }, [receitaUltimosMeses, contasPagarUltimosMeses, parseMesAnoToRange]);

  // Totais para exibição
  const totalRecebidosPeriodo = useMemo(() =>
    recebidosPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [recebidosPeriodoChartData]
  );

  const totalReceberPeriodo = useMemo(() =>
    receberPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [receberPeriodoChartData]
  );

  const totalReceitaMensal = useMemo(() =>
    receitaMensalChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [receitaMensalChartData]
  );

  const totalNovosClientes = useMemo(() =>
    crescimentoClientes.reduce((acc, item) => acc + (item.valor || 0), 0),
    [crescimentoClientes]
  );

  return {
    clientesChartData,
    planosChartData,
    statusPagamentoData,
    distribuicaoPlanos,
    taxaPagamentoChartData,
    contratosChartData,
    ticketMedioChartData,
    receitaMensalChartData,
    recebidosPeriodoChartData,
    receberPeriodoChartData,
    crescimentoClientes,
    clientesPorPlano,
    contasReceberPagarChartData,
    totalRecebidosPeriodo,
    totalReceberPeriodo,
    totalReceitaMensal,
    totalNovosClientes,
  };
};

