import { useMemo } from 'react';
import { DashboardData } from '../services/dashboardService';
import { ChartDataItem } from '../components/charts/types';
import type { useDashboardStats } from './useDashboardStats';

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
  
  // Totais para exibição
  totalRecebidosPeriodo: number;
  totalReceberPeriodo: number;
}

/**
 * Hook para preparar dados dos gráficos do dashboard
 * Extrai toda a lógica de preparação de dados para gráficos
 */
export const useDashboardCharts = (
  dashboardData: DashboardData | undefined,
  stats: ReturnType<typeof useDashboardStats>
): DashboardCharts => {
  // Memoizar arrays para evitar recriação
  const clientes = useMemo(() => dashboardData?.clientes || [], [dashboardData?.clientes]);
  const planos = useMemo(() => dashboardData?.planos || [], [dashboardData?.planos]);
  const contratos = useMemo(() => dashboardData?.contratos || [], [dashboardData?.contratos]);
  const titulosTodos = useMemo(() => dashboardData?.titulosTodos || [], [dashboardData?.titulosTodos]);

  // Gráficos de pizza - memoizados
  const clientesChartData = useMemo(() => [
    { label: 'Ativos', value: stats.clientesAtivos, color: '#28a745' },
    { label: 'Inativos', value: stats.clientesInativos, color: '#dc3545' }
  ], [stats.clientesAtivos, stats.clientesInativos]);

  const planosChartData = useMemo(() => [
    { label: 'Ativos', value: stats.planosAtivos, color: '#007bff' },
    { label: 'Inativos', value: stats.planosInativos, color: '#6c757d' }
  ], [stats.planosAtivos, stats.planosInativos]);

  const statusPagamentoData = useMemo(() => {
    if (!titulosTodos || titulosTodos.length === 0) return [];
    
    const counts = titulosTodos.reduce((acc, titulo) => {
      if (titulo.status === 'pago' || titulo.status === 'pago_atraso') {
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
      { label: 'Pagos', value: counts.pagos, color: '#28a745' },
      { label: 'Pendentes', value: counts.pendentes, color: '#17a2b8' },
      { label: 'Vencidos', value: counts.vencidos, color: '#ffc107' },
      { label: 'Cancelados', value: counts.cancelados, color: '#dc3545' }
    ].filter(item => item.value > 0);
  }, [titulosTodos]);

  const distribuicaoPlanos = useMemo(() => {
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
  }, [planos]);

  const taxaPagamentoChartData = useMemo(() => [
    { label: 'Pago', value: stats.taxaPagamento, color: '#28a745' },
    { label: 'Pendente', value: 100 - stats.taxaPagamento, color: '#ffc107' }
  ], [stats.taxaPagamento]);

  const contratosChartData = useMemo(() => [
    { label: 'Ativos', value: stats.contratosAtivos, color: '#28a745' },
    { label: 'Inativos', value: stats.contratosInativos, color: '#dc3545' },
    { label: 'Suspensos', value: stats.contratosSuspensos, color: '#ffc107' }
  ], [stats.contratosAtivos, stats.contratosInativos, stats.contratosSuspensos]);

  const ticketMedioChartData = useMemo(() => [
    { label: 'Ticket Médio', value: stats.ticketMedio, color: '#6f42c1' }
  ], [stats.ticketMedio]);

  // Gráficos de linha - memoizados
  const receitaMensalChartData = useMemo(() => {
    if (!dashboardData?.receitaUltimosMeses) return [];
    return dashboardData.receitaUltimosMeses.labels.map((label, index) => ({
      mes: label,
      valor: dashboardData.receitaUltimosMeses.data[index] ?? 0,
      color: index === (dashboardData.receitaUltimosMeses.data.length - 1) ? '#28a745' : '#6c757d'
    }));
  }, [dashboardData?.receitaUltimosMeses]);

  const recebidosPeriodoChartData = useMemo(() => {
    if (!dashboardData?.recebidosPeriodo) return [];
    return dashboardData.recebidosPeriodo.labels.map((label, index) => ({
      mes: label,
      valor: dashboardData.recebidosPeriodo?.data?.[index] ?? 0,
      color: '#28a745',
    }));
  }, [dashboardData?.recebidosPeriodo]);

  const receberPeriodoChartData = useMemo(() => {
    if (!dashboardData?.aReceberPeriodo) return [];
    return dashboardData.aReceberPeriodo.labels.map((label, index) => ({
      mes: label,
      valor: dashboardData.aReceberPeriodo.data[index] ?? 0,
      color: '#17a2b8',
    }));
  }, [dashboardData?.aReceberPeriodo]);

  const crescimentoClientes = useMemo(() => {
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
        return dataCliente.getMonth() === data.getMonth() && 
               dataCliente.getFullYear() === data.getFullYear();
      }).length;
      
      meses.push({
        mes: mesAno,
        valor: clientesMes,
        color: i === 11 ? '#007bff' : '#6c757d'
      });
    }
    
    return meses;
  }, [clientes]);

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
      color: cores[index % cores.length]
    })).sort((a, b) => b.value - a.value);
  }, [dashboardData?.contratosAtivosTodos, contratos, planos]);

  // Totais para exibição
  const totalRecebidosPeriodo = useMemo(() => 
    recebidosPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [recebidosPeriodoChartData]
  );

  const totalReceberPeriodo = useMemo(() => 
    receberPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [receberPeriodoChartData]
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
    totalRecebidosPeriodo,
    totalReceberPeriodo,
  };
};

